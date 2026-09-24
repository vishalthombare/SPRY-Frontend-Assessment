"""Async email abstraction and Resend implementation for OTP delivery."""

from importlib.resources import files
from typing import Protocol

import httpx

from app.core.config import Settings

RESEND_EMAILS_URL = "https://api.resend.com/emails"
EMAIL_DELIVERY_MESSAGE = "Unable to send the verification code. Please try again later."


class EmailDeliveryError(Exception):
    """Safe application error that never exposes provider details or credentials."""

    def __init__(self) -> None:
        super().__init__(EMAIL_DELIVERY_MESSAGE)


class OtpEmailSender(Protocol):
    """Provider-neutral contract used by the authentication workflow."""

    async def send_otp(self, *, recipient: str, code: str, expires_minutes: int) -> None:
        """Deliver one OTP without returning or logging sensitive content."""


class ResendEmailService:
    """Send branded OTP messages through Resend's HTTPS API."""

    def __init__(
        self,
        *,
        api_key: str,
        from_address: str,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        if not api_key or not from_address:
            raise ValueError("Email provider configuration is incomplete.")
        self._api_key = api_key
        self._from_address = from_address
        self._client = client

    @classmethod
    def from_settings(
        cls, settings: Settings, *, client: httpx.AsyncClient | None = None
    ) -> "ResendEmailService":
        """Create the provider from backend-only environment settings."""
        return cls(
            api_key=settings.resend_api_key.get_secret_value(),
            from_address=settings.email_from,
            client=client,
        )

    async def send_otp(self, *, recipient: str, code: str, expires_minutes: int) -> None:
        """Send HTML and plain-text versions and convert provider failures to one safe error."""
        payload = {
            "from": self._from_address,
            "to": [recipient],
            "subject": "Your SPRY verification code",
            "html": _render_template("otp_email.html", code, expires_minutes),
            "text": _render_template("otp_email.txt", code, expires_minutes),
        }
        try:
            if self._client is not None:
                await self._post(self._client, payload)
            else:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    await self._post(client, payload)
        except httpx.HTTPError:
            raise EmailDeliveryError from None

    async def _post(self, client: httpx.AsyncClient, payload: dict[str, object]) -> None:
        response = await client.post(
            RESEND_EMAILS_URL,
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        response.raise_for_status()


def _render_template(template_name: str, code: str, expires_minutes: int) -> str:
    """Render controlled numeric values into packaged templates without a new dependency."""
    template = (
        files("app.modules.auth").joinpath("templates", template_name).read_text(encoding="utf-8")
    )
    return template.replace("{{ otp_code }}", code).replace(
        "{{ expiry_minutes }}", str(expires_minutes)
    )
