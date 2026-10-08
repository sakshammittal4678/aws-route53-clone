import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.core.database import Base, get_db
from app.core.security import hash_password, create_access_token
from app.models.user import User
from app.main import app

# Test SQLite in-memory or file database
TEST_DATABASE_URL = "sqlite:///./test_route53.db"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

@event.listens_for(test_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

@pytest.fixture
def db():
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def test_user(db):
    user = db.query(User).filter(User.username == "testadmin").first()
    if not user:
        user = User(
            username="testadmin",
            email="testadmin@example.com",
            account_id="111122223333",
            hashed_password=hash_password("password123")
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

@pytest.fixture
def auth_token(test_user):
    return create_access_token(subject=str(test_user.id))

@pytest.fixture
def client(db, auth_token):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    # Set session_token cookie on the client
    test_client.cookies.set("session_token", auth_token)
    yield test_client
    app.dependency_overrides.clear()
