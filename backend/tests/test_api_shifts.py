"""
test_api_shifts.py — Integration tests for shift API routes.
"""

import pytest
from unittest.mock import MagicMock, patch
from backend.tests.conftest import FAKE_AUTH_HEADER, make_shift, make_job, FAKE_USER_ID, FAKE_JOB_ID, FAKE_SHIFT_ID


class TestLogShift:

    def test_log_shift_success(self, test_client):
        client, mock_sb = test_client

        # Mock job lookup
        mock_sb.execute.return_value = MagicMock(data=make_job())

        with patch("backend.income.shifts.get_job", return_value=make_job()):
            mock_sb.execute.return_value = MagicMock(data=[make_shift()])

            response = client.post("/shifts", json={
                "job_id": FAKE_JOB_ID,
                "date": "2026-06-09",
                "start_time": "09:00:00",
                "end_time": "15:00:00",
            }, headers={"authorization": FAKE_AUTH_HEADER})

        assert response.status_code == 201

    def test_log_shift_unauthorized(self, test_client):
        client, _ = test_client
        response = client.post("/shifts", json={
            "job_id": FAKE_JOB_ID,
            "date": "2026-06-09",
            "start_time": "09:00:00",
            "end_time": "15:00:00",
        })
        assert response.status_code == 422  # missing auth header

    def test_log_shift_invalid_job(self, test_client):
        client, mock_sb = test_client
        with patch("backend.income.shifts.get_job", return_value=None):
            response = client.post("/shifts", json={
                "job_id": "99999999-9999-9999-9999-999999999999",
                "date": "2026-06-09",
                "start_time": "09:00:00",
                "end_time": "15:00:00",
            }, headers={"authorization": FAKE_AUTH_HEADER})
        assert response.status_code == 400

    def test_log_shift_with_unpaid_break(self, test_client):
        client, mock_sb = test_client
        # 6h shift - 30min unpaid = 5.5h @ $17.20 = $94.60
        expected_shift = make_shift({
            "hours_worked": 5.5,
            "earnings": 94.60,
            "break_minutes": 30,
            "break_paid": False,
        })
        with patch("backend.income.shifts.get_job", return_value=make_job()):
            mock_sb.execute.return_value = MagicMock(data=[expected_shift])
            response = client.post("/shifts", json={
                "job_id": FAKE_JOB_ID,
                "date": "2026-06-09",
                "start_time": "09:00:00",
                "end_time": "15:00:00",
                "break_minutes": 30,
                "break_paid": False,
            }, headers={"authorization": FAKE_AUTH_HEADER})
        assert response.status_code == 201
        data = response.json()
        assert data["hours_worked"] == 5.5
        assert data["earnings"] == 94.60

    def test_log_shift_with_paid_break(self, test_client):
        client, mock_sb = test_client
        # 6h shift with 30min PAID break = still 6h
        expected_shift = make_shift({
            "hours_worked": 6.0,
            "earnings": 103.20,
            "break_minutes": 30,
            "break_paid": True,
        })
        with patch("backend.income.shifts.get_job", return_value=make_job()):
            mock_sb.execute.return_value = MagicMock(data=[expected_shift])
            response = client.post("/shifts", json={
                "job_id": FAKE_JOB_ID,
                "date": "2026-06-09",
                "start_time": "09:00:00",
                "end_time": "15:00:00",
                "break_minutes": 30,
                "break_paid": True,
            }, headers={"authorization": FAKE_AUTH_HEADER})
        assert response.status_code == 201
        data = response.json()
        assert data["hours_worked"] == 6.0
        assert data["earnings"] == 103.20


class TestUpdateShift:

    def test_update_shift_success(self, test_client):
        client, mock_sb = test_client
        updated = make_shift({"hours_worked": 7.0, "earnings": 120.40})

        # Patch the name bound in the route module, not the source module
        with patch("backend.api.routes.shifts.update_shift", return_value=updated):
            response = client.patch(f"/shifts/{FAKE_SHIFT_ID}", json={
                "end_time": "16:00:00",
            }, headers={"authorization": FAKE_AUTH_HEADER})

        assert response.status_code == 200

    def test_update_shift_not_found(self, test_client):
        client, _ = test_client
        with patch("backend.api.routes.shifts.update_shift", side_effect=ValueError("Shift not found or unauthorized")):
            response = client.patch("/shifts/nonexistent", json={
                "end_time": "16:00:00",
            }, headers={"authorization": FAKE_AUTH_HEADER})
        assert response.status_code == 400


class TestDeleteShift:

    def test_delete_shift_success(self, test_client):
        client, mock_sb = test_client
        mock_sb.execute.return_value = MagicMock(data=[make_shift()])
        response = client.delete("/shifts/shift-uuid-001",
                                  headers={"authorization": FAKE_AUTH_HEADER})
        assert response.status_code == 204

    def test_delete_shift_not_found(self, test_client):
        client, mock_sb = test_client
        mock_sb.execute.return_value = MagicMock(data=[])
        response = client.delete("/shifts/nonexistent",
                                  headers={"authorization": FAKE_AUTH_HEADER})
        assert response.status_code == 404


class TestGetShifts:

    def test_get_shifts_returns_list(self, test_client):
        client, mock_sb = test_client
        mock_sb.execute.return_value = MagicMock(data=[make_shift(), make_shift({"id": "shift-002"})])
        response = client.get("/shifts", headers={"authorization": FAKE_AUTH_HEADER})
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_shifts_empty(self, test_client):
        client, mock_sb = test_client
        mock_sb.execute.return_value = MagicMock(data=[])
        response = client.get("/shifts", headers={"authorization": FAKE_AUTH_HEADER})
        assert response.status_code == 200
        assert response.json() == []


class TestEarningsSummary:

    def test_earnings_summary_monthly(self, test_client):
        client, mock_sb = test_client
        mock_sb.execute.return_value = MagicMock(data=[
            make_shift({"hours_worked": 6.0, "earnings": 103.20, "jobs": {"name": "Tim Hortons", "hourly_rate": 17.20, "color": "#3b82f6"}}),
            make_shift({"id": "shift-002", "hours_worked": 4.0, "earnings": 68.80, "jobs": {"name": "Tim Hortons", "hourly_rate": 17.20, "color": "#3b82f6"}}),
        ])
        response = client.get("/shifts/earnings/summary?period=monthly",
                               headers={"authorization": FAKE_AUTH_HEADER})
        assert response.status_code == 200
        data = response.json()
        assert "total_earnings" in data
        assert "total_hours" in data
        assert "by_job" in data

    def test_earnings_summary_invalid_period(self, test_client):
        client, _ = test_client
        response = client.get("/shifts/earnings/summary?period=yearly",
                               headers={"authorization": FAKE_AUTH_HEADER})
        assert response.status_code == 422
