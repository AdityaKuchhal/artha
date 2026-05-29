"""
reports.py — Report and workflow trigger endpoints.
"""

import logging
from fastapi import APIRouter, Header, HTTPException, Query
from backend.db.supabase import supabase
from backend.orchestrator.workflow import artha_workflow

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reports", tags=["Reports"])


def get_user_id(authorization: str) -> str:
    try:
        token = authorization.replace("Bearer ", "")
        user = supabase.auth.get_user(token)
        return str(user.user.id)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/run")
async def run_workflow(
    days: int = Query(default=30, ge=1, le=90),
    authorization: str = Header(...),
):
    """
    Trigger the full Artha multi-agent workflow.

    Runs: extract → categorize → analyze → monitor_budget → report
    Returns the complete analysis and AI-generated report.
    """
    user_id = get_user_id(authorization)

    initial_state = {
        "user_id": user_id,
        "transactions": [],
        "categorized": [],
        "analysis": {},
        "budget_alerts": [],
        "report": "",
        "errors": [],
        "sync_period_days": days,
    }

    try:
        config = {"configurable": {"thread_id": f"artha_{user_id}"}}
        result = artha_workflow.invoke(initial_state, config=config)

        return {
            "status": "success",
            "user_id": user_id,
            "transactions_processed": len(result["categorized"]),
            "total_spent": result["analysis"].get("total_spent", 0),
            "daily_burn_rate": result["analysis"].get("daily_burn_rate", 0),
            "top_categories": sorted(
                result["analysis"].get("by_category", {}).items(),
                key=lambda x: x[1],
                reverse=True
            )[:5],
            "anomalies": result["analysis"].get("anomalies", []),
            "budget_alerts": result["budget_alerts"],
            "report": result["report"],
            "errors": result["errors"],
        }

    except Exception as e:
        logger.error(f"Workflow failed for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/latest")
async def get_latest_report(authorization: str = Header(...)):
    """
    Get the latest analysis without re-running the full workflow.
    Uses cached transactions from Supabase.
    """
    user_id = get_user_id(authorization)

    from backend.agents.analysis_agent import analyze_spending
    from backend.agents.budget_monitor_agent import monitor_budgets
    from backend.agents.report_agent import generate_report
    from datetime import date

    # Pull this month's transactions from Supabase
    start_date = date.today().replace(day=1)
    response = supabase.table("transactions")\
        .select("*")\
        .eq("user_id", user_id)\
        .gte("date", str(start_date))\
        .execute()

    transactions = response.data or []

    if not transactions:
        return {"message": "No transactions found. Run /reports/run first."}

    analysis = analyze_spending(user_id, transactions)
    alerts = monitor_budgets(user_id, analysis)
    report = generate_report(user_id, analysis, alerts, transactions)

    return {
        "period": f"{start_date} to {date.today()}",
        "total_spent": analysis["total_spent"],
        "daily_burn_rate": analysis["daily_burn_rate"],
        "top_categories": sorted(
            analysis["by_category"].items(),
            key=lambda x: x[1],
            reverse=True
        )[:5],
        "anomalies": analysis["anomalies"],
        "budget_alerts": alerts,
        "report": report,
    }
