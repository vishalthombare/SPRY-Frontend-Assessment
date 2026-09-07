"""Shared success envelopes that keep every API response predictable."""

from pydantic import BaseModel


class ApiResponse[ResponseData](BaseModel):
    """Generic top-level shape that keeps every successful API response predictable."""

    message: str | None = None
    response: ResponseData
    status: int


class CollectionResponse[ContentItem](BaseModel):
    """Container used when an endpoint returns an array of objects."""

    content: list[ContentItem]


class PaginatedResponse[ContentItem](CollectionResponse[ContentItem]):
    """Collection response with one-based pagination metadata."""

    page: int
    page_size: int
    total_elements: int
    total_pages: int


def success[ResponseData](
    response: ResponseData,
    *,
    status_code: int = 200,
    message: str | None = None,
) -> ApiResponse[ResponseData]:
    """Build the standard envelope without repeating fields in every route."""
    return ApiResponse(message=message, response=response, status=status_code)
