"""
schemas.py — Pydantic models for request/response validation.
"""

from datetime import date as DateType
from datetime import time as TimeType
from uuid import UUID

from pydantic import BaseModel, Field

# ── Job Schemas ────────────────────────────────────────────────


class JobCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Job or employer name")
    hourly_rate: float = Field(..., gt=0, le=1000, description="Hourly pay rate in CAD")
    color: str = Field(default="#00e5a0", description="Color tag for UI display")

    model_config = {
        "json_schema_extra": {
            "examples": [{"name": "Tim Hortons", "hourly_rate": 17.20, "color": "#00e5a0"}]
        }
    }


class JobUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    hourly_rate: float | None = Field(None, gt=0, le=1000)
    color: str | None = None
    is_active: bool | None = None


class JobResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    hourly_rate: float
    color: str
    is_active: bool
    created_at: str


# ── Shift Schemas ──────────────────────────────────────────────


class ShiftCreate(BaseModel):
    job_id: UUID = Field(..., description="Job this shift belongs to")
    date: DateType = Field(..., description="Date of the shift")
    start_time: TimeType = Field(..., description="Shift start time")
    end_time: TimeType = Field(..., description="Shift end time")
    break_minutes: int | None = Field(None, ge=0, le=480, description="Break duration in minutes")
    break_paid: bool | None = Field(None, description="Whether the break is paid")
    notes: str | None = Field(None, max_length=500)


class ShiftUpdate(BaseModel):
    job_id: UUID | None = None
    date: DateType | None = None
    start_time: TimeType | None = None
    end_time: TimeType | None = None
    break_minutes: int | None = Field(None, ge=0, le=480)
    break_paid: bool | None = None
    notes: str | None = Field(None, max_length=500)

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "job_id": "uuid-here",
                    "date": "2026-06-02",
                    "start_time": "09:00:00",
                    "end_time": "15:00:00",
                    "notes": "Covered for Sarah",
                }
            ]
        }
    }


class ShiftResponse(BaseModel):
    id: UUID
    user_id: UUID
    job_id: UUID
    date: str
    start_time: str
    end_time: str
    hours_worked: float
    earnings: float
    source: str
    notes: str | None
    created_at: str


# ── Earnings Summary Schemas ───────────────────────────────────


class EarningsSummary(BaseModel):
    period: str  # daily | weekly | biweekly | monthly
    total_hours: float
    total_earnings: float
    by_job: list[dict]  # breakdown per job
    shift_count: int


# ── Auth Schemas ───────────────────────────────────────────────


class UserSignUp(BaseModel):
    email: str
    password: str = Field(..., min_length=8)


class UserSignIn(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    user_id: str
    email: str
