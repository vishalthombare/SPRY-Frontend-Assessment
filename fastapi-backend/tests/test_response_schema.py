"""Tests for the shared success response contract."""

from app.schemas.response import CollectionResponse, PaginatedResponse, success


def test_single_response_envelope() -> None:
    result = success({"id": 1})

    assert result.model_dump() == {
        "message": None,
        "response": {"id": 1},
        "status": 200,
    }


def test_collection_response_envelope() -> None:
    result = success(CollectionResponse(content=[{"id": 1}, {"id": 2}]))

    assert result.model_dump() == {
        "message": None,
        "response": {"content": [{"id": 1}, {"id": 2}]},
        "status": 200,
    }


def test_paginated_response_envelope() -> None:
    result = success(
        PaginatedResponse(
            content=[{"id": 1}], page=1, page_size=10, total_elements=12, total_pages=2
        )
    )

    assert result.response.total_elements == 12
    assert result.response.total_pages == 2
