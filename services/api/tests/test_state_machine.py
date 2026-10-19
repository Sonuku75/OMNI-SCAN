import pytest
from app.core.state_machine import AnalysisStateMachine, InvalidStateTransitionError
from app.schemas.common import AnalysisStatus


def test_valid_state_transitions():
    """Verify that legitimate state progressions pass validation."""
    # QUEUED -> PROCESSING
    AnalysisStateMachine.validate_transition(AnalysisStatus.QUEUED, AnalysisStatus.PROCESSING)

    # PROCESSING -> DETECTOR_NOT_CONFIGURED
    AnalysisStateMachine.validate_transition(
        AnalysisStatus.PROCESSING, AnalysisStatus.DETECTOR_NOT_CONFIGURED
    )

    # PROCESSING -> COMPLETED
    AnalysisStateMachine.validate_transition(AnalysisStatus.PROCESSING, AnalysisStatus.COMPLETED)

    # PROCESSING -> FAILED
    AnalysisStateMachine.validate_transition(AnalysisStatus.PROCESSING, AnalysisStatus.FAILED)

    # Safe Retries back to QUEUED
    AnalysisStateMachine.validate_transition(AnalysisStatus.FAILED, AnalysisStatus.QUEUED)
    AnalysisStateMachine.validate_transition(
        AnalysisStatus.DETECTOR_NOT_CONFIGURED, AnalysisStatus.QUEUED
    )

    # Idempotent same-state check
    AnalysisStateMachine.validate_transition(AnalysisStatus.QUEUED, AnalysisStatus.QUEUED)


def test_invalid_state_transitions():
    """Verify that illegal state jumps raise 409 InvalidStateTransitionError."""
    # Direct jump from QUEUED to COMPLETED (must go through PROCESSING)
    with pytest.raises(InvalidStateTransitionError) as exc_info:
        AnalysisStateMachine.validate_transition(AnalysisStatus.QUEUED, AnalysisStatus.COMPLETED)
    assert exc_info.value.status_code == 409
    assert exc_info.value.code == "INVALID_STATE_TRANSITION"

    # Terminal COMPLETED cannot transition to QUEUED or PROCESSING
    with pytest.raises(InvalidStateTransitionError):
        AnalysisStateMachine.validate_transition(AnalysisStatus.COMPLETED, AnalysisStatus.QUEUED)

    with pytest.raises(InvalidStateTransitionError):
        AnalysisStateMachine.validate_transition(AnalysisStatus.COMPLETED, AnalysisStatus.PROCESSING)
