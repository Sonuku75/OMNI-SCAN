from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.core.database import get_db
from app.core.errors import AuthenticationError, ConflictError, PermissionDeniedError
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new analyst account",
)
async def register_user(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """
    Registers a new forensic analyst account with securely hashed credentials.
    Returns access token and provisioned user profile.
    """
    email_clean = body.email.strip().lower()

    # Check for existing user
    stmt = select(User).where(User.email == email_clean)
    existing = await db.execute(stmt)
    if existing.scalar_one_or_none():
        raise ConflictError(f"Account with email '{email_clean}' is already registered.")

    hashed = hash_password(body.password)
    user = User(
        email=email_clean,
        hashed_password=hashed,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user_id=user.id, email=user.email)

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Authenticate and receive JWT token",
)
async def login_user(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """
    Authenticates an analyst using email and password.
    Employs timing-safe bcrypt verification and neutral error messages.
    """
    email_clean = body.email.strip().lower()

    stmt = select(User).where(User.email == email_clean)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password:
        # Prevent account enumeration: return identical invalid credentials message
        raise AuthenticationError("Invalid email or password.")

    if not verify_password(body.password, user.hashed_password):
        raise AuthenticationError("Invalid email or password.")

    if not user.is_active:
        raise PermissionDeniedError("Account is inactive or disabled. Contact system administrator.")

    token = create_access_token(user_id=user.id, email=user.email)

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get authenticated analyst profile",
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """
    Returns current authenticated analyst profile.
    """
    return UserResponse.model_validate(current_user)


@router.post(
    "/logout",
    summary="Log out active session",
)
async def logout(
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Signals logout completion for client session invalidation.
    """
    return {"message": "Session invalidated successfully."}
