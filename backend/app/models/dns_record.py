from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, JSON, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class DNSRecord(Base):
    __tablename__ = "dns_records"

    id = Column(String(32), primary_key=True, index=True)
    zone_id = Column(String(32), ForeignKey("hosted_zones.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    type = Column(String(10), nullable=False, index=True)  # A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, CAA, SOA
    routing_policy = Column(String(20), nullable=False, default="Simple")  # Simple or Weighted
    set_identifier = Column(String(128), nullable=False, default="")  # Differentiator for weighted records
    weight = Column(Integer, nullable=True)  # 0 - 255 for Weighted
    ttl = Column(Integer, nullable=False, default=300)
    records = Column(JSON, nullable=False)  # List of string record values
    is_alias = Column(Boolean, nullable=False, default=False)
    alias_target = Column(String(255), nullable=True)
    evaluate_target_health = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    zone = relationship("HostedZone", back_populates="dns_records")

    __table_args__ = (
        UniqueConstraint("zone_id", "name", "type", "set_identifier", name="uq_zone_record_identity"),
    )
