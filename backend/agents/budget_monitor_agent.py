"""
budget_monitor_agent.py — Budget limit monitoring and alert generation.

Compares actual spending per category against user-defined budget limits.
Generates alerts when:
- Spending exceeds 100% of budget (over budget)
- Spending exceeds 80% of budget (warning)
"""

import logging

from backend.db.supabase import supabase

logger = logging.getLogger(__name__)


def monitor_budgets(user_id: str, analysis: dict) -> list[dict]:
    """
    Check spending against budget limits and generate alerts.

    Args:
        user_id: Authenticated user's UUID
        analysis: Output from analysis_agent.analyze_spending()

    Returns:
        List of budget alert dicts
    """
    if not analysis:
        return []

    # Fetch user's budget limits
    budgets_response = supabase.table("budgets").select("*").eq("user_id", user_id).execute()

    budgets = budgets_response.data or []

    if not budgets:
        logger.info(f"[budget_monitor] No budgets set for user {user_id}")
        return []

    by_category = analysis.get("by_category", {})
    alerts = []

    for budget in budgets:
        category = budget["category"]
        limit = float(budget["monthly_limit"])
        spent = by_category.get(category, 0.0)
        percent_used = round((spent / limit * 100), 1) if limit > 0 else 0

        if percent_used >= 100:
            alerts.append(
                {
                    "category": category,
                    "spent": spent,
                    "limit": limit,
                    "percent_used": percent_used,
                    "severity": "critical",
                    "message": f"Over budget on {category}: "
                    f"${spent:.2f} spent of ${limit:.2f} limit "
                    f"({percent_used}%)",
                }
            )
        elif percent_used >= 80:
            alerts.append(
                {
                    "category": category,
                    "spent": spent,
                    "limit": limit,
                    "percent_used": percent_used,
                    "severity": "warning",
                    "message": f"Approaching budget limit on {category}: "
                    f"${spent:.2f} spent of ${limit:.2f} limit "
                    f"({percent_used}%)",
                }
            )

    logger.info(
        f"[budget_monitor] user={user_id} checked={len(budgets)} budgets, alerts={len(alerts)}"
    )

    return alerts
