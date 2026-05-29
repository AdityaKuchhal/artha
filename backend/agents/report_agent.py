"""
report_agent.py — Natural language financial report generation.

Uses Claude to produce a concise, actionable weekly/monthly
spending summary based on analysis and budget alerts.
"""

import os
import json
import logging
from anthropic import Anthropic

logger = logging.getLogger(__name__)

REPORT_SYSTEM_PROMPT = """You are Artha, a personal finance assistant.
Generate a concise, friendly financial summary based on the data provided.

Format:
- 2-3 sentence overview of spending this period
- Key insights (bullet points, max 4)
- One actionable recommendation

Tone: direct, supportive, non-judgmental. Like a smart friend who knows finance.
Keep it under 200 words. No markdown headers."""


def generate_report(
    user_id: str,
    analysis: dict,
    budget_alerts: list[dict],
    categorized: list[dict],
) -> str:
    """
    Generate a natural language spending report using Claude.

    Args:
        user_id: Authenticated user's UUID
        analysis: Output from analysis_agent
        budget_alerts: Output from budget_monitor_agent
        categorized: List of categorized transactions

    Returns:
        Natural language report string
    """
    if not analysis:
        return "No transaction data available to generate a report."

    client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    # Build context for Claude
    context = {
        "total_spent": analysis.get("total_spent", 0),
        "transaction_count": analysis.get("transaction_count", 0),
        "daily_burn_rate": analysis.get("daily_burn_rate", 0),
        "top_categories": sorted(
            analysis.get("by_category", {}).items(),
            key=lambda x: x[1],
            reverse=True
        )[:5],
        "top_merchants": analysis.get("top_merchants", [])[:3],
        "anomalies": analysis.get("anomalies", []),
        "budget_alerts": budget_alerts,
    }

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=400,
            system=REPORT_SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": f"Generate a spending report based on this data:\n{json.dumps(context, indent=2)}"
            }]
        )

        report = response.content[0].text
        logger.info(f"[report] Generated {len(report)} char report for user {user_id}")
        return report

    except Exception as e:
        logger.error(f"[report] Generation failed: {e}")
        return (
            f"This period you spent ${analysis.get('total_spent', 0):.2f} "
            f"across {analysis.get('transaction_count', 0)} transactions. "
            f"Daily burn rate: ${analysis.get('daily_burn_rate', 0):.2f}/day."
        )
