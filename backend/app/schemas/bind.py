from typing import List
from pydantic import BaseModel
from app.schemas.dns_record import DNSRecordResponse

class BindImportRequest(BaseModel):
    zone_content: str

class BindImportResponse(BaseModel):
    imported_count: int
    records: List[DNSRecordResponse]
    message: str
