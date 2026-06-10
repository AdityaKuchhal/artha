"""
jobs.py — Business logic for job profile management.

Handles CRUD operations for a user's part-time jobs.
Each job has a name, hourly rate, and color tag for UI display.
"""

import logging

from backend.api.schemas import JobCreate, JobUpdate
from backend.db.supabase import supabase

logger = logging.getLogger(__name__)


def create_job(user_id: str, data: JobCreate) -> dict:
    """
    Create a new job profile for a user.

    Args:
        user_id: Authenticated user's UUID
        data: Job creation payload

    Returns:
        Created job record
    """
    payload = {
        "user_id": user_id,
        "name": data.name,
        "hourly_rate": float(data.hourly_rate),
        "color": data.color,
        "is_active": True,
    }

    response = supabase.table("jobs").insert(payload).execute()

    if not response.data:
        raise ValueError("Failed to create job")

    logger.info(f"Created job '{data.name}' for user {user_id}")
    return response.data[0]


def get_jobs(user_id: str, active_only: bool = True) -> list[dict]:
    """
    Retrieve all job profiles for a user.

    Args:
        user_id: Authenticated user's UUID
        active_only: If True, return only active jobs

    Returns:
        List of job records
    """
    query = supabase.table("jobs").select("*").eq("user_id", user_id)

    if active_only:
        query = query.eq("is_active", True)

    response = query.order("created_at").execute()
    return response.data or []


def get_job(user_id: str, job_id: str) -> dict | None:
    """Retrieve a single job by ID, verifying ownership."""
    response = (
        supabase.table("jobs")
        .select("*")
        .eq("id", job_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    return response.data


def update_job(user_id: str, job_id: str, data: JobUpdate) -> dict:
    """Update a job profile."""
    payload = {k: v for k, v in data.model_dump().items() if v is not None}

    if not payload:
        raise ValueError("No fields to update")

    response = (
        supabase.table("jobs").update(payload).eq("id", job_id).eq("user_id", user_id).execute()
    )

    if not response.data:
        raise ValueError("Job not found or unauthorized")

    logger.info(f"Updated job {job_id} for user {user_id}")
    return response.data[0]


def delete_job(user_id: str, job_id: str) -> bool:
    """Soft delete a job by setting is_active = False."""
    response = (
        supabase.table("jobs")
        .update({"is_active": False})
        .eq("id", job_id)
        .eq("user_id", user_id)
        .execute()
    )

    if not response.data:
        raise ValueError("Job not found or unauthorized")

    logger.info(f"Deactivated job {job_id} for user {user_id}")
    return True
