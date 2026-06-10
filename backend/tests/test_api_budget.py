"""
test_api_budget.py — Integration tests for budget routes.
"""

from unittest.mock import MagicMock

from backend.tests.conftest import FAKE_AUTH_HEADER


def make_budget(overrides: dict = {}) -> dict:
    return {
        "id": "budget-uuid-001",
        "user_id": "dc51368f-961e-480a-bc38-1836e1ab8cf2",
        "category": "FOOD_AND_DRINK",
        "monthly_limit": 400.0,
        **overrides,
    }


class TestCreateBudget:
    def test_create_budget_success(self, test_client):
        client, mock_sb = test_client
        mock_sb.execute.return_value = MagicMock(data=[make_budget()])
        response = client.post(
            "/budgets",
            json={
                "category": "FOOD_AND_DRINK",
                "monthly_limit": 400.0,
            },
            headers={"authorization": FAKE_AUTH_HEADER},
        )
        assert response.status_code == 201
        assert response.json()["category"] == "FOOD_AND_DRINK"
        assert response.json()["monthly_limit"] == 400.0

    def test_create_budget_zero_limit_rejected(self, test_client):
        client, _ = test_client
        response = client.post(
            "/budgets",
            json={
                "category": "FOOD_AND_DRINK",
                "monthly_limit": 0,
            },
            headers={"authorization": FAKE_AUTH_HEADER},
        )
        assert response.status_code == 422

    def test_create_budget_negative_limit_rejected(self, test_client):
        client, _ = test_client
        response = client.post(
            "/budgets",
            json={
                "category": "FOOD_AND_DRINK",
                "monthly_limit": -100,
            },
            headers={"authorization": FAKE_AUTH_HEADER},
        )
        assert response.status_code == 422

    def test_upsert_existing_category(self, test_client):
        """Setting budget for same category twice should upsert, not error."""
        client, mock_sb = test_client
        mock_sb.execute.return_value = MagicMock(data=[make_budget({"monthly_limit": 500.0})])
        response = client.post(
            "/budgets",
            json={
                "category": "FOOD_AND_DRINK",
                "monthly_limit": 500.0,
            },
            headers={"authorization": FAKE_AUTH_HEADER},
        )
        assert response.status_code == 201


class TestGetBudgets:
    def test_get_budgets_returns_list(self, test_client):
        client, mock_sb = test_client
        mock_sb.execute.return_value = MagicMock(
            data=[
                make_budget(),
                make_budget(
                    {"id": "budget-002", "category": "TRANSPORTATION", "monthly_limit": 150.0}
                ),
            ]
        )
        response = client.get("/budgets", headers={"authorization": FAKE_AUTH_HEADER})
        assert response.status_code == 200
        assert len(response.json()) == 2

    def test_get_budgets_empty(self, test_client):
        client, mock_sb = test_client
        mock_sb.execute.return_value = MagicMock(data=[])
        response = client.get("/budgets", headers={"authorization": FAKE_AUTH_HEADER})
        assert response.status_code == 200
        assert response.json() == []


class TestDeleteBudget:
    def test_delete_budget_success(self, test_client):
        client, mock_sb = test_client
        mock_sb.execute.return_value = MagicMock(data=[])
        response = client.delete(
            "/budgets/budget-uuid-001", headers={"authorization": FAKE_AUTH_HEADER}
        )
        assert response.status_code == 204
