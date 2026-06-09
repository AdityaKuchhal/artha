"""
shifts.py — Shift logging and earnings calculation.

Core income engine: takes a shift (date, start, end, job)
and calculates hours worked and earnings automatically.

Example:
  Job: Tim Hortons @ $17.20/hr
  Shift: 9:00 AM → 3:00 PM = 6 hours = $103.20
"""

import logging
from datetime import datetime, time, date
from backend.db.supabase import supabase
from backend.api.schemas import ShiftCreate, ShiftUpdate
from backend.income.jobs import get_job

logger = logging.getLogger(__name__)


def calculate_hours(start: time, end: time) -> float:
    """
    Calculate hours worked between two times.
    Handles overnight shifts (end < start).

    Returns:
        Hours worked, rounded to 2 decimal places
    """
    start_dt = datetime.combine(date.today(), start)
    end_dt = datetime.combine(date.today(), end)

    # Handle overnight shifts
    if end_dt <= start_dt:
        from datetime import timedelta
        end_dt += timedelta(days=1)

    delta = end_dt - start_dt
    hours = delta.total_seconds() / 3600
    return round(hours, 2)


def log_shift(user_id: str, data: ShiftCreate) -> dict:
    """
    Log a shift and calculate earnings automatically.

    Args:
        user_id: Authenticated user's UUID
        data: Shift creation payload

    Returns:
        Created shift record with hours_worked and earnings
    """
    # Verify job belongs to user and get hourly rate
    job = get_job(user_id, str(data.job_id))
    if not job:
        raise ValueError("Job not found or unauthorized")

    # Calculate hours, subtract unpaid break
    hours_worked = calculate_hours(data.start_time, data.end_time)
    if data.break_minutes and not data.break_paid:
        hours_worked = round(hours_worked - data.break_minutes / 60, 2)
    earnings = round(hours_worked * float(job["hourly_rate"]), 2)

    payload = {
        "user_id": user_id,
        "job_id": str(data.job_id),
        "date": str(data.date),
        "start_time": str(data.start_time),
        "end_time": str(data.end_time),
        "hours_worked": hours_worked,
        "earnings": earnings,
        "source": "manual",
        "notes": data.notes,
    }

    response = supabase.table("shifts").insert(payload).execute()

    if not response.data:
        raise ValueError("Failed to log shift")

    logger.info(
        f"Logged shift for user {user_id}: "
        f"{hours_worked}hrs @ ${job['hourly_rate']}/hr = ${earnings}"
    )
    return response.data[0]


def update_shift(user_id: str, shift_id: str, data: ShiftUpdate) -> dict:
    """Update an existing shift, recalculating hours and earnings if times changed."""
    existing = (
        supabase.table("shifts")
        .select("*, jobs(hourly_rate)")
        .eq("id", shift_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not existing.data:
        raise ValueError("Shift not found or unauthorized")

    row = existing.data
    updates: dict = {}

    if data.job_id is not None:
        job = get_job(user_id, str(data.job_id))
        if not job:
            raise ValueError("Job not found or unauthorized")
        updates["job_id"] = str(data.job_id)
        hourly_rate = float(job["hourly_rate"])
    else:
        hourly_rate = float(row["jobs"]["hourly_rate"])

    if data.date is not None:
        updates["date"] = str(data.date)
    if data.notes is not None:
        updates["notes"] = data.notes

    from datetime import time as time_type
    start = data.start_time or time_type.fromisoformat(row["start_time"])
    end = data.end_time or time_type.fromisoformat(row["end_time"])
    if data.start_time is not None:
        updates["start_time"] = str(data.start_time)
    if data.end_time is not None:
        updates["end_time"] = str(data.end_time)

    break_minutes = data.break_minutes if data.break_minutes is not None else row.get("break_minutes", 0) or 0
    break_paid = data.break_paid if data.break_paid is not None else row.get("break_paid", False) or False

    hours_worked = calculate_hours(start, end)
    if break_minutes and not break_paid:
        hours_worked = round(hours_worked - break_minutes / 60, 2)
    earnings = round(hours_worked * hourly_rate, 2)

    updates["hours_worked"] = hours_worked
    updates["earnings"] = earnings

    response = (
        supabase.table("shifts")
        .update(updates)
        .eq("id", shift_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not response.data:
        raise ValueError("Failed to update shift")
    return response.data[0]


def get_shifts(
    user_id: str,
    start_date: date | None = None,
    end_date: date | None = None,
    job_id: str | None = None,
) -> list[dict]:
    """
    Retrieve shifts for a user with optional filters.

    Args:
        user_id: Authenticated user's UUID
        start_date: Filter shifts from this date
        end_date: Filter shifts to this date
        job_id: Filter by specific job

    Returns:
        List of shift records
    """
    query = (
        supabase.table("shifts")
        .select("*, jobs(name, hourly_rate, color)")
        .eq("user_id", user_id)
    )

    if start_date:
        query = query.gte("date", str(start_date))
    if end_date:
        query = query.lte("date", str(end_date))
    if job_id:
        query = query.eq("job_id", job_id)

    response = query.order("date", desc=True).execute()
    return response.data or []


def get_earnings_summary(user_id: str, period: str = "monthly") -> dict:
    """
    Calculate earnings summary for a given period.

    Args:
        user_id: Authenticated user's UUID
        period: daily | weekly | biweekly | monthly

    Returns:
        EarningsSummary with totals and per-job breakdown
    """
    from datetime import timedelta

    today = date.today()

    # Determine date range
    if period == "daily":
        start_date = today
    elif period == "weekly":
        start_date = today - timedelta(days=today.weekday())
    elif period == "biweekly":
        start_date = today - timedelta(days=13)
    else:  # monthly
        start_date = today.replace(day=1)

    shifts = get_shifts(user_id, start_date=start_date, end_date=today)

    total_hours = sum(s["hours_worked"] for s in shifts)
    total_earnings = sum(s["earnings"] for s in shifts)

    # Per-job breakdown
    job_totals: dict[str, dict] = {}
    for shift in shifts:
        job_id = shift["job_id"]
        job_name = shift.get("jobs", {}).get("name", "Unknown")
        job_color = shift.get("jobs", {}).get("color", "#00e5a0")

        if job_id not in job_totals:
            job_totals[job_id] = {
                "job_id": job_id,
                "job_name": job_name,
                "color": job_color,
                "hours": 0.0,
                "earnings": 0.0,
                "shifts": 0,
            }

        job_totals[job_id]["hours"] += shift["hours_worked"]
        job_totals[job_id]["earnings"] += shift["earnings"]
        job_totals[job_id]["shifts"] += 1

    # Round all job totals
    for job in job_totals.values():
        job["hours"] = round(job["hours"], 2)
        job["earnings"] = round(job["earnings"], 2)

    return {
        "period": period,
        "start_date": str(start_date),
        "end_date": str(today),
        "total_hours": round(total_hours, 2),
        "total_earnings": round(total_earnings, 2),
        "by_job": list(job_totals.values()),
        "shift_count": len(shifts),
    }
