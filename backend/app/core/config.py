import os
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AWS Route 53 Console API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "aws-route53-dev-secret-key-super-secure-key-987654321")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Database configuration (support both SQLITE_PATH and DATABASE_URL)
    SQLITE_PATH: str = os.getenv("SQLITE_PATH", "./route53.db")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # CORS configuration
    CORS_ORIGINS: Union[List[str], str] = os.getenv(
        "CORS_ORIGINS", 
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
    )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_url(cls, v: str) -> str:
        if v and v.strip():
            return v.strip()
        sqlite_path = os.getenv("SQLITE_PATH", "./route53.db")
        if not sqlite_path.startswith("sqlite"):
            return f"sqlite:///{sqlite_path}"
        return sqlite_path

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    class Config:
        case_sensitive = True

settings = Settings()
