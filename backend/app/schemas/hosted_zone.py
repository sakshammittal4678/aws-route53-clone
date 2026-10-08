from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class HostedZoneBase(BaseModel):
    name: str = Field(..., description="Domain name (e.g. example.com.)")
    description: Optional[str] = Field(None, max_length=256)
    type: str = Field("Public", description="Public or Private")
    vpc_id: Optional[str] = None
    vpc_region: Optional[str] = None

class HostedZoneCreate(HostedZoneBase):
    created_by: Optional[str] = "Route 53"

class HostedZoneUpdate(BaseModel):
    description: Optional[str] = Field(None, max_length=256)
    vpc_id: Optional[str] = None
    vpc_region: Optional[str] = None

class HostedZoneResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    type: str
    created_by: str
    vpc_id: Optional[str] = None
    vpc_region: Optional[str] = None
    record_count: int
    caller_reference: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class HostedZoneListResponse(BaseModel):
    items: List[HostedZoneResponse]
    total: int
