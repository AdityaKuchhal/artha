"""
test_jobs.py — Unit tests for job business logic.
"""

import pytest
from unittest.mock import MagicMock, patch
from backend.api.schemas import JobCreate, JobUpdate


class TestJobCreate:
    """Schema validation for job creation."""

    def test_valid_job(self):
        job = JobCreate(name="Tim Hortons", hourly_rate=17.20, color="#3b82f6")
        assert job.name == "Tim Hortons"
        assert job.hourly_rate == 17.20
        assert job.color == "#3b82f6"

    def test_default_color(self):
        job = JobCreate(name="Walmart", hourly_rate=16.55)
        assert job.color == "#00e5a0"

    def test_name_too_short(self):
        with pytest.raises(Exception):
            JobCreate(name="", hourly_rate=17.20)

    def test_negative_rate_rejected(self):
        with pytest.raises(Exception):
            JobCreate(name="Job", hourly_rate=-5.0)

    def test_zero_rate_rejected(self):
        with pytest.raises(Exception):
            JobCreate(name="Job", hourly_rate=0)

    def test_rate_over_limit_rejected(self):
        with pytest.raises(Exception):
            JobCreate(name="Job", hourly_rate=1001.0)


class TestJobUpdate:
    """Partial update schema."""

    def test_all_fields_optional(self):
        update = JobUpdate()
        assert update.name is None
        assert update.hourly_rate is None

    def test_partial_update(self):
        update = JobUpdate(hourly_rate=18.50)
        assert update.hourly_rate == 18.50
        assert update.name is None

    def test_deactivate(self):
        update = JobUpdate(is_active=False)
        assert update.is_active is False
