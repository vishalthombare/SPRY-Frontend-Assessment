"""JSON handlers that keep expected API errors in the shared response shape."""

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


async def http_exception_handler(_: Request, exception: HTTPException) -> JSONResponse:
    """Convert deliberate HTTP errors such as 401 and 404 into the API envelope."""
    is_text_message = isinstance(exception.detail, str)
    return JSONResponse(
        status_code=exception.status_code,
        headers=exception.headers,
        content={
            "message": exception.detail if is_text_message else "Request failed.",
            "response": None if is_text_message else jsonable_encoder(exception.detail),
            "status": exception.status_code,
        },
    )


async def validation_exception_handler(
    _: Request, exception: RequestValidationError
) -> JSONResponse:
    """Return field-level validation details in a predictable error response."""
    return JSONResponse(
        status_code=422,
        content={
            "message": "Validation failed.",
            "response": {"errors": jsonable_encoder(exception.errors())},
            "status": 422,
        },
    )


def register_exception_handlers(application: FastAPI) -> None:
    """Register shared handlers once while building the FastAPI application."""
    application.add_exception_handler(HTTPException, http_exception_handler)
    application.add_exception_handler(RequestValidationError, validation_exception_handler)
