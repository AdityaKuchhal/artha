"""
analysis_agent.py — Spending pattern analysis and anomaly detection.

Analyzes categorized transactions to find:
- Top spending categories
- Unusual transactions (amount anomalies)
- Spending velocity (daily burn rate)
- Month-over-month category changes
"""

import logging
from collections import defaultdict
from statistics import mean, stdev

logger = logging.getLogger(__name__)

# Amount threshold for flagging as anomaly (z-score)
ANOMALY_Z_THRESHOLD = 2.0


def analyze_spending(user_id: str, transactions: list[dict]) -> dict:
    """
    Analyze spending patterns from categorized transactions.

    Args:
        user_id: Authenticated user's UUID
        transactions: List of categorized transaction dicts

    Returns:
        Analysis dict with totals, anomalies, and burn rate
    """
    if not transactions:
        return {
            "total_spent": 0,
            "by_category": {},
            "anomalies": [],
            "daily_burn_rate": 0,
            "top_merchants": [],
            "transaction_count": 0,
        }

    # Filter out credits and income
    expenses = [t for t in transactions if t["amount"] > 0]

    # Category totals
    by_category: dict[str, float] = defaultdict(float)
    by_merchant: dict[str, float] = defaultdict(float)

    for txn in expenses:
        cat = txn.get("ai_category") or txn.get("category", "Other")
        by_category[cat] += txn["amount"]
        merchant = txn.get("merchant_name", "Unknown")
        by_merchant[merchant] += txn["amount"]

    # Round all values
    by_category = {k: round(v, 2) for k, v in by_category.items()}
    by_merchant = {k: round(v, 2) for k, v in by_merchant.items()}

    total_spent = round(sum(by_category.values()), 2)

    # Anomaly detection — z-score on transaction amounts
    amounts = [t["amount"] for t in expenses]
    anomalies = []

    if len(amounts) > 2:
        avg = mean(amounts)
        std = stdev(amounts) if len(amounts) > 1 else 0

        if std > 0:
            for txn in expenses:
                z_score = (txn["amount"] - avg) / std
                if abs(z_score) >= ANOMALY_Z_THRESHOLD:
                    anomalies.append(
                        {
                            "merchant": txn.get("merchant_name", "Unknown"),
                            "amount": txn["amount"],
                            "date": txn.get("date", ""),
                            "category": txn.get("ai_category", "Other"),
                            "z_score": round(z_score, 2),
                            "reason": "Unusually large transaction"
                            if z_score > 0
                            else "Unusually small transaction",
                        }
                    )

    # Daily burn rate
    dates = [t["date"] for t in expenses if t.get("date")]
    if dates:
        min_date = min(dates)
        max_date = max(dates)
        from datetime import datetime

        days_span = max(
            (datetime.fromisoformat(max_date) - datetime.fromisoformat(min_date)).days, 1
        )
        daily_burn_rate = round(total_spent / days_span, 2)
    else:
        daily_burn_rate = 0

    # Top 5 merchants by spend
    top_merchants = sorted(
        [{"merchant": k, "total": v} for k, v in by_merchant.items()],
        key=lambda x: x["total"],
        reverse=True,
    )[:5]

    logger.info(
        f"[analysis] user={user_id} total=${total_spent} "
        f"anomalies={len(anomalies)} burn_rate=${daily_burn_rate}/day"
    )

    return {
        "total_spent": total_spent,
        "by_category": by_category,
        "anomalies": anomalies,
        "daily_burn_rate": daily_burn_rate,
        "top_merchants": top_merchants,
        "transaction_count": len(expenses),
    }
