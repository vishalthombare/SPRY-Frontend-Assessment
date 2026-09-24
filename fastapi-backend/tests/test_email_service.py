"""Tests for branded OTP email rendering and safe Resend failure handling."""

import json

import httpx
import pytest

from app.modules.auth.email_service import (
    EMAIL_DELIVERY_MESSAGE,
    EmailDeliveryError,
    ResendEmailService,
)


@pytest.mark.asyncio
async def test_resend_service_sends_html_and_plain_text_otp_email() -> None:
    captured_request: httpx.Request | None = None

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured_request
        captured_request = request
        return httpx.Response(200, json={"id": "email-id"})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        service = ResendEmailService(
            api_key="re_test_secret",
            from_address="SPRY Assessment <no-reply@example.com>",
            client=client,
        )
        await service.send_otp(
            recipient="reviewer@icloud.com",
            code="123456",
            expires_minutes=5,
        )

    assert captured_request is not None
    assert captured_request.headers["authorization"] == "Bearer re_test_secret"
    payload = json.loads(captured_request.content)
    assert payload["from"] == "SPRY Assessment <no-reply@example.com>"
    assert payload["to"] == ["reviewer@icloud.com"]
    assert payload["subject"] == "Your SPRY verification code"
    assert "123456" in payload["html"]
    assert "expires in 5 minutes" in payload["html"]
    assert "123456" in payload["text"]


@pytest.mark.asyncio
async def test_provider_failure_returns_safe_error_without_credentials() -> None:
    async def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(500, text="provider-internal-details")

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        service = ResendEmailService(
            api_key="re_private_key",
            from_address="no-reply@example.com",
            client=client,
        )
        with pytest.raises(EmailDeliveryError) as error:
            await service.send_otp(
                recipient="reviewer@icloud.com",
                code="123456",
                expires_minutes=5,
            )

    assert str(error.value) == EMAIL_DELIVERY_MESSAGE
    assert "re_private_key" not in str(error.value)
    assert "provider-internal-details" not in str(error.value)


def test_email_service_rejects_missing_provider_configuration() -> None:
    with pytest.raises(ValueError, match="configuration is incomplete"):
        ResendEmailService(api_key="", from_address="")
