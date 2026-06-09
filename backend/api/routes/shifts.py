"""
routes/shifts.py — Shift logging and earnings API endpoints.
"""

from fastapi import APIRouter, Header, HTTPException, Query
from datetime import date
from typing import Optional
from backend.api.schemas import ShiftCreate, ShiftUpdate
from backend.income.shifts import log_shift, update_shift, get_shifts, get_earnings_summary
from backend.db.supabase import supabase

router = APIRouter(prefix="/shifts", tags=["Shifts"])


def get_user_id(authorization: str) -> str:
    try:
        token = authorization.replace("Bearer ", "")
        user = supabase.auth.get_user(token)
        return str(user.user.id)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("", status_code=201)
async def log_shift_route(
    data: ShiftCreate,
    authorization: str = Header(...),
):
    """
    Log a shift. Automatically calculates hours worked and earnings.

    Example: 9:00 AM to 3:00 PM @ $17.20/hr = 6hrs = $103.20
    """
    user_id = get_user_id(authorization)
    try:
        return log_shift(user_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{shift_id}")
async def update_shift_route(
    shift_id: str,
    data: ShiftUpdate,
    authorization: str = Header(...),
):
    """Update an existing shift. Recalculates hours and earnings automatically."""
    user_id = get_user_id(authorization)
    try:
        return update_shift(user_id, shift_id, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{shift_id}", status_code=204)
async def delete_shift_route(
    shift_id: str,
    authorization: str = Header(...),
):
    """Delete a shift log."""
    user_id = get_user_id(authorization)
    result = supabase.table("shifts")\
        .delete()\
        .eq("id", shift_id)\
        .eq("user_id", user_id)\
        .execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Shift not found")


@router.get("")
async def get_shifts_route(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    job_id: Optional[str] = Query(None),
    authorization: str = Header(...),
):
    """Get shifts with optional date range and job filters."""
    user_id = get_user_id(authorization)
    return get_shifts(user_id, start_date, end_date, job_id)


@router.get("/earnings/summary")
async def earnings_summary_route(
    period: str = Query(default="monthly",
                        pattern="^(daily|weekly|biweekly|monthly)$"),
    authorization: str = Header(...),
):
    """
    Get earnings summary for a period.

    Returns total hours, total earnings, and per-job breakdown.
    """
    user_id = get_user_id(authorization)
    return get_earnings_summary(user_id, period)
