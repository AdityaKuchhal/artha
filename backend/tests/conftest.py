"""
conftest.py — Shared fixtures and mocks for all tests.

Strategy:
- Mock Supabase at the module level so no real DB calls are made
- Mock Plaid client so no real API calls
- Mock boto3 so no real Lambda invocations
- Provide a FastAPI TestClient with a fake JWT
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Import app at module level so all route modules are registered in sys.modules
# before any patch() call tries to resolve them. .env provides real credentials
# for supabase-py initialization — no HTTP calls are made at init time.
from backend.api.main import app

# ── Fake user ──────────────────────────────────────────────────
FAKE_USER_ID = "dc51368f-961e-480a-bc38-1836e1ab8cf2"
FAKE_TOKEN = "fake-jwt-token"
FAKE_AUTH_HEADER = f"Bearer {FAKE_TOKEN}"

# Valid UUID constants — Pydantic validates UUID fields at request time
FAKE_JOB_ID = "11111111-1111-1111-1111-111111111111"
FAKE_SHIFT_ID = "22222222-2222-2222-2222-222222222222"
FAKE_ITEM_ID = "33333333-3333-3333-3333-333333333333"

# ── Fake data factories ────────────────────────────────────────


def make_job(overrides: dict = {}) -> dict:
    return {
        "id": FAKE_JOB_ID,
        "user_id": FAKE_USER_ID,
        "name": "Tim Hortons",
        "hourly_rate": 17.20,
        "color": "#3b82f6",
        "is_active": True,
        "created_at": "2026-06-01T00:00:00Z",
        **overrides,
    }


def make_shift(overrides: dict = {}) -> dict:
    return {
        "id": FAKE_SHIFT_ID,
        "user_id": FAKE_USER_ID,
        "job_id": FAKE_JOB_ID,
        "date": "2026-06-09",
        "start_time": "09:00:00",
        "end_time": "15:00:00",
        "hours_worked": 6.0,
        "earnings": 103.20,
        "break_minutes": 0,
        "break_paid": False,
        "source": "manual",
        "notes": None,
        **overrides,
    }


def make_plaid_item(overrides: dict = {}) -> dict:
    return {
        "id": FAKE_ITEM_ID,
        "user_id": FAKE_USER_ID,
        "access_token": "access-sandbox-abc123",
        "item_id": "plaid-item-001",
        "institution_name": "RBC Royal Bank",
        **overrides,
    }


@pytest.fixture
def mock_supabase():
    """
    Returns a MagicMock that mimics the Supabase client chain:
    supabase.table("x").select("*").eq(...).execute()
    Each method returns self so chains work naturally.
    """
    mock = MagicMock()

    # Make every chained method return the mock itself
    # so .table().select().eq().execute() works
    mock.table.return_value = mock
    mock.select.return_value = mock
    mock.insert.return_value = mock
    mock.update.return_value = mock
    mock.upsert.return_value = mock
    mock.delete.return_value = mock
    mock.eq.return_value = mock
    mock.neq.return_value = mock
    mock.gte.return_value = mock
    mock.lte.return_value = mock
    mock.order.return_value = mock
    mock.limit.return_value = mock
    mock.single.return_value = mock

    # Default execute returns empty
    mock.execute.return_value = MagicMock(data=[])

    # Auth mock — returns fake user
    fake_user = MagicMock()
    fake_user.user.id = FAKE_USER_ID
    mock.auth.get_user.return_value = fake_user

    return mock


@pytest.fixture
def test_client(mock_supabase):
    """
    FastAPI TestClient with Supabase patched at every import point.
    app is imported at module level above so all routes are in sys.modules.
    """
    with (
        patch("backend.db.supabase.supabase", mock_supabase),
        patch("backend.api.routes.shifts.supabase", mock_supabase),
        patch("backend.api.routes.jobs.supabase", mock_supabase),
        patch("backend.api.routes.plaid.supabase", mock_supabase),
        patch("backend.api.routes.budget.supabase", mock_supabase),
        patch("backend.api.routes.reports.supabase", mock_supabase),
        patch("backend.api.routes.jobs_worker.supabase", mock_supabase),
        patch("backend.income.shifts.supabase", mock_supabase),
        patch("backend.income.jobs.supabase", mock_supabase),
    ):
        client = TestClient(app, raise_server_exceptions=True)
        yield client, mock_supabase
