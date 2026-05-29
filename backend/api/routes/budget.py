"""
budget.py — Budget management endpoints.
"""

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field
from backend.db.supabase import supabase

router = APIRouter(prefix="/budgets", tags=["Budgets"])


def get_user_id(authorization: str) -> str:
    try:
        token = authorization.replace("Bearer ", "")
        user = supabase.auth.get_user(token)
        return str(user.user.id)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


class BudgetCreate(BaseModel):
    category: str = Field(..., description="Spending category")
    monthly_limit: float = Field(..., gt=0, description="Monthly budget limit")


@router.post("", status_code=201)
async def create_budget(
    data: BudgetCreate,
    authorization: str = Header(...),
):
    """Set a monthly budget for a spending category."""
    user_id = get_user_id(authorization)

    response = supabase.table("budgets").upsert({
        "user_id": user_id,
        "category": data.category,
        "monthly_limit": data.monthly_limit,
    }, on_conflict="user_id,category").execute()

    if not response.data:
        raise HTTPException(status_code=400, detail="Failed to create budget")

    return response.data[0]


@router.get("")
async def get_budgets(authorization: str = Header(...)):
    """Get all budget limits for the authenticated user."""
    user_id = get_user_id(authorization)
    response = supabase.table("budgets")\
        .select("*")\
        .eq("user_id", user_id)\
        .execute()
    return response.data or []


@router.delete("/{budget_id}", status_code=204)
async def delete_budget(
    budget_id: str,
    authorization: str = Header(...),
):
    """Delete a budget limit."""
    user_id = get_user_id(authorization)
    supabase.table("budgets")\
        .delete()\
        .eq("id", budget_id)\
        .eq("user_id", user_id)\
        .execute()
