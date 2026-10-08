from datetime import timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Header, Cookie
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, decode_access_token
from app.models.user import User
from app.schemas.auth import LoginRequest, UserResponse, Token

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
) -> User:
    token = None
    if session_token:
        token = session_token
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = decode_access_token(token)
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == int(user_id_str)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, response: Response, db: Session = Depends(get_db)):
    identifier = login_data.username_or_email.strip().lower()
    user = db.query(User).filter(
        or_(
            User.username.ilike(identifier),
            User.email.ilike(identifier)
        )
    ).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password"
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(subject=str(user.id), expires_delta=access_token_expires)

    # Set httpOnly cookie
    response.set_cookie(
        key="session_token",
        value=token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in production HTTPS
        path="/",
    )

    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        key="session_token",
        path="/",
        httponly=True,
        samesite="lax"
    )
    return {"message": "Logged out successfully"}
