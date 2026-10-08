from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.schemas.dns_record import (
    DNSRecordCreate,
    DNSRecordUpdate,
    DNSRecordResponse,
    DNSRecordListResponse,
    BulkDeleteRequest,
    BulkDeleteResponse,
)
from app.services.record_service import (
    create_dns_record,
    get_dns_record,
    list_dns_records,
    update_dns_record,
    delete_dns_record,
    bulk_delete_dns_records,
)

router = APIRouter(prefix="/hosted-zones/{zone_id}/records", tags=["DNS Records"])

@router.get("", response_model=DNSRecordListResponse)
def get_records(
    zone_id: str,
    query: Optional[str] = Query(None, description="Search term across record name and value"),
    type: Optional[str] = Query(None, description="Filter by record type (A, CNAME, etc.)"),
    routing_policy: Optional[str] = Query(None, description="Filter by routing policy (Simple, Weighted)"),
    sort_by: str = Query("name", description="Field to sort by: name, type, routing_policy, ttl, created_at"),
    order: str = Query("asc", description="Sort order: asc or desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items, total = list_dns_records(
        db=db,
        zone_id=zone_id,
        query=query,
        record_type=type,
        routing_policy=routing_policy,
        sort_by=sort_by,
        order=order,
        skip=skip,
        limit=limit
    )
    return DNSRecordListResponse(items=items, total=total)

@router.post("", response_model=DNSRecordResponse, status_code=status.HTTP_201_CREATED)
def create_record(
    zone_id: str,
    record_in: DNSRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_dns_record(db, zone_id, record_in)

@router.get("/{record_id}", response_model=DNSRecordResponse)
def get_record(
    zone_id: str,
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_dns_record(db, zone_id, record_id)

@router.put("/{record_id}", response_model=DNSRecordResponse)
def update_record(
    zone_id: str,
    record_id: str,
    record_in: DNSRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return update_dns_record(db, zone_id, record_id, record_in)

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(
    zone_id: str,
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    delete_dns_record(db, zone_id, record_id)
    return None

@router.post("/bulk-delete", response_model=BulkDeleteResponse)
def bulk_delete_records(
    zone_id: str,
    payload: BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return bulk_delete_dns_records(db, zone_id, payload.record_ids)
