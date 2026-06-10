"""
routes/shifts.py — Shift logging and earnings API endpoints.
"""

from datetime import date

from fastapi import APIRouter, Header, HTTPException, Query

from backend.api.schemas import ShiftCreate, ShiftUpdate
from backend.db.supabase import supabase
from backend.income.shifts import get_earnings_summary, get_shifts, log_shift, update_shift

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
    result = supabase.table("shifts").delete().eq("id", shift_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Shift not found")


@router.get("")
async def get_shifts_route(
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    job_id: str | None = Query(None),
    authorization: str = Header(...),
):
    """Get shifts with optional date range and job filters."""
    user_id = get_user_id(authorization)
    return get_shifts(user_id, start_date, end_date, job_id)


@router.get("/earnings/summary")
async def earnings_summary_route(
    period: str = Query(default="monthly", pattern="^(daily|weekly|biweekly|monthly)$"),
    authorization: str = Header(...),
):
    """
    Get earnings summary for a period.

    Returns total hours, total earnings, and per-job breakdown.
    """
    user_id = get_user_id(authorization)
    return get_earnings_summary(user_id, period)


@router.get("/earnings/daily")
async def daily_earnings_route(
    days: int = Query(default=7, ge=1, le=30),
    authorization: str = Header(...),
):
    """
    Get per-day earnings for the last N days.
    Used for the weekly bar chart on the dashboard.
    """
    from datetime import timedelta

    user_id = get_user_id(authorization)

    today = date.today()
    start_date = today - timedelta(days=days - 1)

    shifts = (
        supabase.table("shifts")
        .select("date, earnings, hours_worked, job_id")
        .eq("user_id", user_id)
        .gte("date", str(start_date))
        .lte("date", str(today))
        .execute()
    )

    # Build day-by-day map
    daily: dict[str, dict] = {}
    cursor = start_date
    while cursor <= today:
        daily[str(cursor)] = {
            "date": str(cursor),
            "earnings": 0.0,
            "hours": 0.0,
            "shifts": 0,
        }
        cursor += timedelta(days=1)

    for s in shifts.data or []:
        d = s["date"]
        if d in daily:
            daily[d]["earnings"] = round(daily[d]["earnings"] + s["earnings"], 2)
            daily[d]["hours"] = round(daily[d]["hours"] + s["hours_worked"], 2)
            daily[d]["shifts"] += 1

    return {
        "days": list(daily.values()),
        "total_earnings": round(sum(d["earnings"] for d in daily.values()), 2),
        "total_hours": round(sum(d["hours"] for d in daily.values()), 2),
    }
