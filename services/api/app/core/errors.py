from typing import Any, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse


class OmniScanException(Exception):
    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Any] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


class NotFoundError(OmniScanException):
    def __init__(self, message: str = "Resource not found", details: Optional[Any] = None):
        super().__init__(
            message=message,
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
        )


class ValidationError(OmniScanException):
    def __init__(self, message: str = "Validation failed", details: Optional[Any] = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class UnsupportedMediaTypeError(OmniScanException):
    def __init__(self, message: str = "Unsupported media type", details: Optional[Any] = None):
        super().__init__(
            message=message,
            code="UNSUPPORTED_MEDIA_TYPE",
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            details=details,
        )


class PayloadTooLargeError(OmniScanException):
    def __init__(self, message: str = "File size exceeds permitted threshold", details: Optional[Any] = None):
        super().__init__(
            message=message,
            code="PAYLOAD_TOO_LARGE",
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            details=details,
        )


class DetectorNotConfiguredError(OmniScanException):
    def __init__(self, detector_name: str, details: Optional[Any] = None):
        super().__init__(
            message=f"Detector '{detector_name}' is not configured or missing model weights.",
            code="DETECTOR_NOT_CONFIGURED",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details,
        )


async def omniscan_exception_handler(request: Request, exc: OmniScanException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Redact raw traceback in API response to prevent secret / path leakage
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred during request processing.",
            }
        },
    )
