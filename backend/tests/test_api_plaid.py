"""
test_api_plaid.py — Integration tests for Plaid routes.
"""

from unittest.mock import MagicMock, patch

from backend.tests.conftest import FAKE_AUTH_HEADER, make_plaid_item


class TestLinkToken:
    def test_create_link_token_success(self, test_client):
        client, _ = test_client
        mock_response = MagicMock()
        mock_response.link_token = "link-sandbox-abc123"

        with patch("backend.api.routes.plaid.get_plaid_client") as mock_client:
            mock_client.return_value.link_token_create.return_value = mock_response
            response = client.post("/plaid/link-token", headers={"authorization": FAKE_AUTH_HEADER})

        assert response.status_code == 200
        assert response.json()["link_token"] == "link-sandbox-abc123"

    def test_create_link_token_plaid_error(self, test_client):
        client, _ = test_client
        with patch("backend.api.routes.plaid.get_plaid_client") as mock_client:
            mock_client.return_value.link_token_create.side_effect = Exception("Plaid error")
            response = client.post("/plaid/link-token", headers={"authorization": FAKE_AUTH_HEADER})
        assert response.status_code == 400


class TestExchangeToken:
    def test_exchange_token_success(self, test_client):
        client, mock_sb = test_client
        mock_exchange = MagicMock()
        mock_exchange.access_token = "access-sandbox-xyz"
        mock_exchange.item_id = "item-001"
        mock_sb.execute.return_value = MagicMock(data=[make_plaid_item()])

        with patch("backend.api.routes.plaid.get_plaid_client") as mock_client:
            mock_client.return_value.item_public_token_exchange.return_value = mock_exchange
            response = client.post(
                "/plaid/exchange",
                json={
                    "public_token": "public-sandbox-token",
                    "institution_name": "RBC Royal Bank",
                },
                headers={"authorization": FAKE_AUTH_HEADER},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["institution"] == "RBC Royal Bank"

    def test_exchange_token_missing_body(self, test_client):
        client, _ = test_client
        response = client.post(
            "/plaid/exchange", json={}, headers={"authorization": FAKE_AUTH_HEADER}
        )
        assert response.status_code == 422


class TestSyncTransactions:
    def test_sync_no_linked_accounts(self, test_client):
        client, mock_sb = test_client
        mock_sb.execute.return_value = MagicMock(data=[])
        response = client.post("/plaid/sync", headers={"authorization": FAKE_AUTH_HEADER})
        assert response.status_code == 404
        assert "No linked bank accounts" in response.json()["detail"]

    def test_sync_returns_job_id(self, test_client):
        client, mock_sb = test_client
        # First call: plaid_items query returns item; second call: insert returns job id
        mock_sb.execute.side_effect = [
            MagicMock(data=[make_plaid_item()]),
            MagicMock(data=[{"id": "job-uuid-async"}]),
        ]

        # invoke_job_async is lazily imported inside the handler — patch at source
        with patch("backend.utils.async_invoker.invoke_job_async"):
            response = client.post("/plaid/sync", headers={"authorization": FAKE_AUTH_HEADER})

        assert response.status_code == 200
        assert "job_id" in response.json()
