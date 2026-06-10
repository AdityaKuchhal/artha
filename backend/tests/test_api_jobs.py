"""
test_api_jobs.py — Integration tests for job API routes.
"""

from unittest.mock import MagicMock, patch

from backend.tests.conftest import FAKE_AUTH_HEADER, make_job


class TestCreateJob:
    def test_create_job_success(self, test_client):
        client, mock_sb = test_client
        mock_sb.execute.return_value = MagicMock(data=[make_job()])
        response = client.post(
            "/jobs",
            json={
                "name": "Tim Hortons",
                "hourly_rate": 17.20,
                "color": "#3b82f6",
            },
            headers={"authorization": FAKE_AUTH_HEADER},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Tim Hortons"
        assert data["hourly_rate"] == 17.20

    def test_create_job_missing_name(self, test_client):
        client, _ = test_client
        response = client.post(
            "/jobs",
            json={
                "hourly_rate": 17.20,
            },
            headers={"authorization": FAKE_AUTH_HEADER},
        )
        assert response.status_code == 422

    def test_create_job_negative_rate(self, test_client):
        client, _ = test_client
        response = client.post(
            "/jobs",
            json={
                "name": "Job",
                "hourly_rate": -5.0,
            },
            headers={"authorization": FAKE_AUTH_HEADER},
        )
        assert response.status_code == 422

    def test_create_job_no_auth(self, test_client):
        client, _ = test_client
        response = client.post(
            "/jobs",
            json={
                "name": "Tim Hortons",
                "hourly_rate": 17.20,
            },
        )
        assert response.status_code == 422


class TestGetJobs:
    def test_get_jobs_returns_list(self, test_client):
        client, mock_sb = test_client
        mock_sb.execute.return_value = MagicMock(
            data=[make_job(), make_job({"id": "job-002", "name": "Walmart"})]
        )
        response = client.get("/jobs", headers={"authorization": FAKE_AUTH_HEADER})
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_get_jobs_empty(self, test_client):
        client, mock_sb = test_client
        mock_sb.execute.return_value = MagicMock(data=[])
        response = client.get("/jobs", headers={"authorization": FAKE_AUTH_HEADER})
        assert response.status_code == 200
        assert response.json() == []


class TestDeleteJob:
    def test_delete_job_success(self, test_client):
        client, mock_sb = test_client
        mock_sb.execute.return_value = MagicMock(data=[make_job({"is_active": False})])
        response = client.delete("/jobs/job-uuid-001", headers={"authorization": FAKE_AUTH_HEADER})
        assert response.status_code == 204

    def test_delete_job_not_found(self, test_client):
        client, mock_sb = test_client
        mock_sb.execute.return_value = MagicMock(data=[])
        with patch(
            "backend.income.jobs.delete_job",
            side_effect=ValueError("Job not found or unauthorized"),
        ):
            response = client.delete(
                "/jobs/nonexistent", headers={"authorization": FAKE_AUTH_HEADER}
            )
        assert response.status_code == 404
