from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.core.config import settings
from app.core.database import engine, SessionLocal, Base
from app.initial_data import seed_db_if_empty
from app.routers import auth, hosted_zones, dns_records, tools

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables are created
    Base.metadata.create_all(bind=engine)
    # Seed DB if empty
    db = SessionLocal()
    try:
        seed_db_if_empty(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS configuration
origins = settings.CORS_ORIGINS
if isinstance(origins, str):
    origins = [o.strip() for o in origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(hosted_zones.router, prefix=settings.API_V1_STR)
app.include_router(dns_records.router, prefix=settings.API_V1_STR)
app.include_router(tools.router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "aws-route53-clone-api"}

@app.get("/")
def root():
    return {
        "message": "AWS Route 53 Console Clone API is running",
        "docs_url": "/docs",
        "health_check": "/health"
    }
