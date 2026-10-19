from typing import Dict, Set
from app.core.errors import OmniScanException
from app.schemas.common import AnalysisStatus


class InvalidStateTransitionError(OmniScanException):
    def __init__(self, from_state: str, to_state: str):
        super().__init__(
            message=f"Cannot transition analysis from '{from_state}' to '{to_state}'.",
            code="INVALID_STATE_TRANSITION",
            status_code=409,
            details={"from_state": from_state, "to_state": to_state},
        )


class AnalysisStateMachine:
    """
    Strict state machine for forensic analysis runs.
    Enforces valid transitions and rejects illegal state jumps.
    """

    ALLOWED_TRANSITIONS: Dict[AnalysisStatus, Set[AnalysisStatus]] = {
        AnalysisStatus.QUEUED: {
            AnalysisStatus.PROCESSING,
            AnalysisStatus.FAILED,
        },
        AnalysisStatus.PROCESSING: {
            AnalysisStatus.COMPLETED,
            AnalysisStatus.DETECTOR_NOT_CONFIGURED,
            AnalysisStatus.FAILED,
        },
        AnalysisStatus.FAILED: {
            AnalysisStatus.QUEUED,  # Safe retry transition
        },
        AnalysisStatus.DETECTOR_NOT_CONFIGURED: {
            AnalysisStatus.QUEUED,  # Safe retry transition once configured
        },
        AnalysisStatus.COMPLETED: set(),  # Terminal immutable state
    }

    @classmethod
    def validate_transition(cls, current: AnalysisStatus, target: AnalysisStatus) -> None:
        """
        Validate whether transitioning from current to target status is permitted.
        Raises InvalidStateTransitionError if illegal.
        """
        if current == target:
            return

        allowed = cls.ALLOWED_TRANSITIONS.get(current, set())
        if target not in allowed:
            raise InvalidStateTransitionError(
                from_state=current.value if hasattr(current, "value") else str(current),
                to_state=target.value if hasattr(target, "value") else str(target),
            )
