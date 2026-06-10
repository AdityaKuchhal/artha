"""
test_workflow.py — Agent workflow state transition tests.

Tests the LangGraph pipeline without calling real LLMs.
All agent functions are mocked — we test that:
1. State passes correctly between nodes
2. Errors are caught and stored in state["errors"]
3. Pipeline completes even with partial failures
"""

import pytest
from unittest.mock import patch, MagicMock
from backend.orchestrator.workflow import (
    extraction_node,
    categorization_node,
    analysis_node,
    budget_monitor_node,
    report_node,
    ArthState,
)

FAKE_USER_ID = "dc51368f-961e-480a-bc38-1836e1ab8cf2"


def base_state(overrides: dict = {}) -> ArthState:
    return {
        "user_id": FAKE_USER_ID,
        "transactions": [],
        "categorized": [],
        "analysis": {},
        "budget_alerts": [],
        "report": "",
        "errors": [],
        "sync_period_days": 30,
        **overrides,
    }


def make_transaction(overrides: dict = {}) -> dict:
    return {
        "plaid_transaction_id": "txn-001",
        "merchant_name": "Tim Hortons",
        "amount": 5.50,
        "date": "2026-06-09",
        "category": "FOOD_AND_DRINK",
        "is_subscription": False,
        **overrides,
    }


class TestExtractionNode:

    def test_no_linked_accounts_adds_error(self):
        """No plaid_items → error added, empty transactions returned."""
        state = base_state()
        mock_sb = MagicMock()
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            MagicMock(data=[])

        # extraction_node lazily imports supabase — patch the source module
        with patch("backend.db.supabase.supabase", mock_sb):
            result = extraction_node(state)

        assert result["transactions"] == []
        assert any("No linked bank accounts" in e for e in result["errors"])

    def test_plaid_error_caught_gracefully(self):
        """Plaid API failure → error stored, pipeline continues."""
        state = base_state()
        mock_sb = MagicMock()
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            MagicMock(data=[{"access_token": "bad-token", "item_id": "item-001"}])

        # extraction_node lazily imports supabase and plaid_api — patch both at source
        with patch("backend.db.supabase.supabase", mock_sb), \
             patch("plaid.api.plaid_api.PlaidApi") as mock_plaid_class:
            mock_plaid_class.return_value.transactions_get.side_effect = Exception("Plaid error")
            result = extraction_node(state)

        assert result["transactions"] == []
        assert len(result["errors"]) > 0


class TestCategorizationNode:

    def test_empty_transactions_skipped(self):
        """No transactions → categorized stays empty, no error."""
        state = base_state({"transactions": []})
        result = categorization_node(state)
        assert result["categorized"] == []
        assert result["errors"] == []

    def test_categorization_failure_uses_fallback(self):
        """If Claude categorization fails, raw transactions used as fallback."""
        txns = [make_transaction()]
        state = base_state({"transactions": txns})

        # categorization_node lazily imports categorize_transactions — patch source
        # categorization_node lazily imports supabase — patch source
        with patch("backend.agents.categorization_agent.categorize_transactions",
                   side_effect=Exception("Claude error")), \
             patch("backend.db.supabase.supabase", MagicMock()):
            result = categorization_node(state)

        # Fallback: categorized = transactions
        assert result["categorized"] == txns
        assert any("Categorization error" in e for e in result["errors"])

    def test_categorization_success_upserts_to_supabase(self):
        """Successful categorization stores results in DB."""
        txns = [make_transaction()]
        categorized = [make_transaction({"ai_category": "FOOD_AND_DRINK"})]
        state = base_state({"transactions": txns, "user_id": FAKE_USER_ID})

        mock_sb = MagicMock()
        mock_sb.table.return_value.upsert.return_value.execute.return_value = MagicMock(data=[])

        with patch("backend.agents.categorization_agent.categorize_transactions",
                   return_value=categorized), \
             patch("backend.agents.extraction_agent.is_subscription", return_value=False), \
             patch("backend.db.supabase.supabase", mock_sb):
            result = categorization_node(state)

        assert result["categorized"] == categorized
        mock_sb.table.assert_called_with("transactions")


class TestAnalysisNode:

    def test_analysis_failure_caught(self):
        state = base_state({"categorized": [make_transaction()]})
        # analyze_spending is module-level imported in workflow.py — patch the binding there
        with patch("backend.orchestrator.workflow.analyze_spending",
                   side_effect=Exception("Analysis error")):
            result = analysis_node(state)
        assert result["analysis"] == {}
        assert any("Analysis error" in e for e in result["errors"])

    def test_analysis_success(self):
        txns = [make_transaction()]
        state = base_state({"categorized": txns})
        mock_analysis = {"total_spent": 5.50, "by_category": {}, "anomalies": []}

        with patch("backend.orchestrator.workflow.analyze_spending",
                   return_value=mock_analysis):
            result = analysis_node(state)

        assert result["analysis"]["total_spent"] == 5.50
        assert result["errors"] == []


class TestBudgetMonitorNode:

    def test_budget_monitor_failure_caught(self):
        state = base_state({"analysis": {"total_spent": 100}})
        # monitor_budgets is module-level imported in workflow.py — patch the binding there
        with patch("backend.orchestrator.workflow.monitor_budgets",
                   side_effect=Exception("DB error")):
            result = budget_monitor_node(state)
        assert result["budget_alerts"] == []
        assert any("Budget monitor error" in e for e in result["errors"])

    def test_no_alerts_when_under_budget(self):
        state = base_state({"analysis": {"total_spent": 50, "by_category": {"FOOD_AND_DRINK": 50}}})
        with patch("backend.orchestrator.workflow.monitor_budgets", return_value=[]):
            result = budget_monitor_node(state)
        assert result["budget_alerts"] == []


class TestReportNode:

    def test_report_failure_returns_fallback_message(self):
        state = base_state({
            "analysis": {},
            "budget_alerts": [],
            "categorized": [],
        })
        # generate_report is module-level imported in workflow.py — patch the binding there
        with patch("backend.orchestrator.workflow.generate_report",
                   side_effect=Exception("Claude timeout")):
            result = report_node(state)
        assert result["report"] == "Report generation failed."
        assert any("Report error" in e for e in result["errors"])

    def test_report_success(self):
        state = base_state({
            "analysis": {"total_spent": 500},
            "budget_alerts": [],
            "categorized": [make_transaction()],
        })
        with patch("backend.orchestrator.workflow.generate_report",
                   return_value="Your spending looks healthy this month."):
            result = report_node(state)
        assert "healthy" in result["report"]
        assert result["errors"] == []


class TestFullPipeline:

    def test_pipeline_completes_with_all_errors(self):
        """Even if every agent fails, pipeline returns a result with errors logged."""
        state = base_state()

        mock_sb = MagicMock()
        mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value = \
            MagicMock(data=[])

        with patch("backend.db.supabase.supabase", mock_sb), \
             patch("backend.orchestrator.workflow.analyze_spending",
                   side_effect=Exception("analysis fail")), \
             patch("backend.orchestrator.workflow.monitor_budgets",
                   side_effect=Exception("budget fail")), \
             patch("backend.orchestrator.workflow.generate_report",
                   side_effect=Exception("report fail")):
            s1 = extraction_node(state)
            s2 = categorization_node(s1)
            s3 = analysis_node(s2)
            s4 = budget_monitor_node(s3)
            s5 = report_node(s4)

        # Pipeline completed without raising
        assert isinstance(s5["errors"], list)
        assert s5["transactions"] == []
        assert s5["categorized"] == []
