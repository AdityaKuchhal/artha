"""
transactions.py — Transaction query endpoints.
"""

import logging
from fastapi import APIRouter, Header, HTTPException, Query
from datetime import date
from typing import Optional
from backend.db.supabase import supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/transactions", tags=["Transactions"])


def get_user_id(authorization: str) -> str:
    try:
        token = authorization.replace("Bearer ", "")
        user = supabase.auth.get_user(token)
        return str(user.user.id)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.get("")
async def get_transactions(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    category: Optional[str] = Query(None),
    is_subscription: Optional[bool] = Query(None),
    authorization: str = Header(...),
):
    """Get transactions with optional filters."""
    user_id = get_user_id(authorization)

    query = supabase.table("transactions")\
        .select("*")\
        .eq("user_id", user_id)

    if start_date:
        query = query.gte("date", str(start_date))
    if end_date:
        query = query.lte("date", str(end_date))
    if category:
        query = query.eq("ai_category", category)
    if is_subscription is not None:
        query = query.eq("is_subscription", is_subscription)

    response = query.order("date", desc=True).execute()
    return response.data or []


@router.get("/summary")
async def get_spending_summary(
    period: str = Query(default="monthly",
                        pattern="^(weekly|monthly)$"),
    authorization: str = Header(...),
):
    """
    Get spending summary grouped by AI category.
    Used for the dashboard spending breakdown.
    """
    from datetime import timedelta
    today = date.today()

    if period == "weekly":
        start_date = today - timedelta(days=today.weekday())
    else:
        start_date = today.replace(day=1)

    user_id = get_user_id(authorization)

    response = supabase.table("transactions")\
        .select("ai_category, amount")\
        .eq("user_id", user_id)\
        .gte("date", str(start_date))\
        .lte("date", str(today))\
        .execute()

    transactions = response.data or []

    # Aggregate by category
    summary: dict[str, float] = {}
    for txn in transactions:
        cat = txn["ai_category"] or "Other"
        summary[cat] = round(summary.get(cat, 0) + txn["amount"], 2)

    return {
        "period": period,
        "start_date": str(start_date),
        "end_date": str(today),
        "by_category": [
            {"category": k, "total": v}
            for k, v in sorted(summary.items(), key=lambda x: x[1], reverse=True)
        ],
        "total_spent": round(sum(summary.values()), 2),
    }


@router.get("/subscriptions")
async def get_subscriptions(authorization: str = Header(...)):
    """Get all detected subscriptions."""
    user_id = get_user_id(authorization)

    response = supabase.table("transactions")\
        .select("merchant_name, amount, date, ai_category")\
        .eq("user_id", user_id)\
        .eq("is_subscription", True)\
        .order("amount", desc=True)\
        .execute()

    return response.data or []
