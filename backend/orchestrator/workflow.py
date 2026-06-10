"""
workflow.py — LangGraph multi-agent orchestration for Artha.

Defines the state machine that coordinates all agents in sequence.
State is persisted to Redis so workflows can be resumed after failure.

Graph:
  extract → categorize → analyze → monitor_budget → report → END
"""

import logging
from typing import TypedDict

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph

from backend.agents.analysis_agent import analyze_spending
from backend.agents.budget_monitor_agent import monitor_budgets
from backend.agents.report_agent import generate_report

logger = logging.getLogger(__name__)


class ArthState(TypedDict):
    """Shared state passed between all agents in the workflow."""

    user_id: str
    transactions: list[dict]
    categorized: list[dict]
    analysis: dict
    budget_alerts: list[dict]
    report: str
    errors: list[str]
    sync_period_days: int


def extraction_node(state: ArthState) -> ArthState:
    """
    Node 1: Fetch transactions from Plaid and run through
    extraction + categorization pipeline.
    """
    logger.info(f"[extraction] Starting for user {state['user_id']}")
    try:
        import os
        from datetime import date, timedelta

        import certifi
        from plaid import ApiClient, Configuration, Environment
        from plaid.api import plaid_api
        from plaid.model.transactions_get_request import TransactionsGetRequest
        from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions

        from backend.db.supabase import supabase

        user_id = state["user_id"]
        days = state.get("sync_period_days", 30)

        items = supabase.table("plaid_items").select("*").eq("user_id", user_id).execute()

        if not items.data:
            state["errors"].append("No linked bank accounts found")
            state["transactions"] = []
            return state

        configuration = Configuration(
            host=Environment.Sandbox,
            api_key={
                "clientId": os.getenv("PLAID_CLIENT_ID"),
                "secret": os.getenv("PLAID_SECRET"),
            },
            ssl_ca_cert=certifi.where(),
        )
        client = plaid_api.PlaidApi(ApiClient(configuration))

        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        all_transactions = []

        for item in items.data:
            request = TransactionsGetRequest(
                access_token=item["access_token"],
                start_date=start_date,
                end_date=end_date,
                options=TransactionsGetRequestOptions(count=500),
            )
            response = client.transactions_get(request)
            all_transactions.extend(response.transactions)

        state["transactions"] = [
            {
                "plaid_transaction_id": t.transaction_id,
                "merchant_name": t.merchant_name or t.name,
                "amount": float(t.amount),
                "date": str(t.date),
                "category": t.personal_finance_category.primary
                if hasattr(t, "personal_finance_category") and t.personal_finance_category
                else "UNCATEGORIZED",
                "is_subscription": False,
            }
            for t in all_transactions
            if not t.pending
        ]

        logger.info(f"[extraction] Fetched {len(state['transactions'])} transactions")

    except Exception as e:
        logger.error(f"[extraction] Failed: {e}")
        state["errors"].append(f"Extraction error: {e!s}")
        state["transactions"] = []

    return state


def categorization_node(state: ArthState) -> ArthState:
    """
    Node 2: Run Claude categorization on extracted transactions
    and upsert to Supabase.
    """
    logger.info(f"[categorization] Processing {len(state['transactions'])} transactions")

    if not state["transactions"]:
        state["categorized"] = []
        return state

    try:
        from backend.agents.categorization_agent import categorize_transactions
        from backend.agents.extraction_agent import is_subscription
        from backend.db.supabase import supabase

        categorized = categorize_transactions(state["transactions"])

        # Upsert to Supabase
        upsert_payload = []
        for txn in categorized:
            merchant = txn.get("merchant_name", "Unknown")
            upsert_payload.append(
                {
                    "user_id": state["user_id"],
                    "plaid_transaction_id": txn["plaid_transaction_id"],
                    "merchant_name": merchant,
                    "amount": txn["amount"],
                    "date": txn["date"],
                    "category": txn["category"],
                    "ai_category": txn.get("ai_category", txn["category"]),
                    "is_subscription": is_subscription(merchant, txn["amount"]),
                    "is_recurring": txn.get("is_recurring", False),
                }
            )

        if upsert_payload:
            supabase.table("transactions").upsert(
                upsert_payload, on_conflict="plaid_transaction_id"
            ).execute()

        state["categorized"] = categorized
        logger.info(f"[categorization] Categorized and saved {len(categorized)} transactions")

    except Exception as e:
        logger.error(f"[categorization] Failed: {e}")
        state["errors"].append(f"Categorization error: {e!s}")
        state["categorized"] = state["transactions"]

    return state


def analysis_node(state: ArthState) -> ArthState:
    """Node 3: Analyze spending patterns and detect anomalies."""
    logger.info(f"[analysis] Analyzing {len(state['categorized'])} transactions")

    try:
        state["analysis"] = analyze_spending(state["user_id"], state["categorized"])
        logger.info(
            f"[analysis] Complete — {len(state['analysis'].get('anomalies', []))} anomalies found"
        )

    except Exception as e:
        logger.error(f"[analysis] Failed: {e}")
        state["errors"].append(f"Analysis error: {e!s}")
        state["analysis"] = {}

    return state


def budget_monitor_node(state: ArthState) -> ArthState:
    """Node 4: Check spending against budget limits and generate alerts."""
    logger.info(f"[budget_monitor] Checking budgets for user {state['user_id']}")

    try:
        state["budget_alerts"] = monitor_budgets(state["user_id"], state["analysis"])
        logger.info(f"[budget_monitor] {len(state['budget_alerts'])} alerts generated")

    except Exception as e:
        logger.error(f"[budget_monitor] Failed: {e}")
        state["errors"].append(f"Budget monitor error: {e!s}")
        state["budget_alerts"] = []

    return state


def report_node(state: ArthState) -> ArthState:
    """Node 5: Generate natural language spending report."""
    logger.info(f"[report] Generating report for user {state['user_id']}")

    try:
        state["report"] = generate_report(
            user_id=state["user_id"],
            analysis=state["analysis"],
            budget_alerts=state["budget_alerts"],
            categorized=state["categorized"],
        )
        logger.info("[report] Report generated successfully")

    except Exception as e:
        logger.error(f"[report] Failed: {e}")
        state["errors"].append(f"Report error: {e!s}")
        state["report"] = "Report generation failed."

    return state


def build_workflow() -> StateGraph:
    """
    Build and compile the Artha agent workflow graph.

    Returns compiled LangGraph StateGraph ready for invocation.
    """
    graph = StateGraph(ArthState)

    # Add nodes
    graph.add_node("extract", extraction_node)
    graph.add_node("categorize", categorization_node)
    graph.add_node("analyze", analysis_node)
    graph.add_node("monitor_budget", budget_monitor_node)
    graph.add_node("summarize", report_node)

    # Define edges — linear pipeline
    graph.set_entry_point("extract")
    graph.add_edge("extract", "categorize")
    graph.add_edge("categorize", "analyze")
    graph.add_edge("analyze", "monitor_budget")
    graph.add_edge("monitor_budget", "summarize")
    graph.add_edge("summarize", END)

    # Compile with in-memory checkpointing
    # (swap MemorySaver for Redis checkpointer in production)
    memory = MemorySaver()
    return graph.compile(checkpointer=memory)


# Module-level compiled workflow
artha_workflow = build_workflow()
