from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field

RoutingPolicyType = Literal["Simple", "Weighted"]
RecordTypeLiteral = Literal["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA", "SOA"]

class DNSRecordBase(BaseModel):
    name: str
    type: RecordTypeLiteral
    routing_policy: RoutingPolicyType = "Simple"
    set_identifier: Optional[str] = ""
    weight: Optional[int] = Field(None, ge=0, le=255)
    ttl: int = Field(300, ge=0, le=2147483647)
    records: List[str] = Field(default_factory=list)
    is_alias: bool = False
    alias_target: Optional[str] = None
    evaluate_target_health: bool = False

class DNSRecordCreate(DNSRecordBase):
    pass

class DNSRecordUpdate(BaseModel):
    records: Optional[List[str]] = None
    ttl: Optional[int] = Field(None, ge=0, le=2147483647)
    routing_policy: Optional[RoutingPolicyType] = None
    set_identifier: Optional[str] = None
    weight: Optional[int] = Field(None, ge=0, le=255)
    is_alias: Optional[bool] = None
    alias_target: Optional[str] = None
    evaluate_target_health: Optional[bool] = None

class DNSRecordResponse(DNSRecordBase):
    id: str
    zone_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DNSRecordListResponse(BaseModel):
    items: List[DNSRecordResponse]
    total: int

class BulkDeleteRequest(BaseModel):
    record_ids: List[str]

class BulkDeleteResponse(BaseModel):
    deleted_count: int
    deleted_ids: List[str]
    skipped_ids: List[str]
    message: str
