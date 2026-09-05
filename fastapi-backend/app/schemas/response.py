"""Shared success envelopes that keep every API response predictable."""

from pydantic import BaseModel


class ApiResponse[ResponseData](BaseModel):
    """Standard top-level shape for successful API responses."""

    message: str | None = None
    response: ResponseData
    status: int


class CollectionResponse[ContentItem](BaseModel):
    """Container used when an endpoint returns an array of objects."""

    content: list[ContentItem]


def success[ResponseData](
    response: ResponseData,
    *,
    status_code: int = 200,
    message: str | None = None,
) -> ApiResponse[ResponseData]:
    """Build the standard envelope without repeating fields in every route."""
    return ApiResponse(message=message, response=response, status=status_code)
