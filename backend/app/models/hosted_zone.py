from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class HostedZone(Base):
    __tablename__ = "hosted_zones"

    id = Column(String(32), primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    type = Column(String(20), nullable=False, default="Public")  # Public or Private
    created_by = Column(String(50), nullable=False, default="Route 53")
    vpc_id = Column(String(50), nullable=True)
    vpc_region = Column(String(50), nullable=True)
    caller_reference = Column(String(64), unique=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Cascade delete to dns_records
    dns_records = relationship(
        "DNSRecord",
        back_populates="zone",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
