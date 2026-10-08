from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.schemas.hosted_zone import (
    HostedZoneCreate,
    HostedZoneUpdate,
    HostedZoneResponse,
    HostedZoneListResponse
)
from app.services.zone_service import (
    create_hosted_zone,
    get_hosted_zone,
    list_hosted_zones,
    update_hosted_zone,
    delete_hosted_zone
)

router = APIRouter(prefix="/hosted-zones", tags=["Hosted Zones"])

@router.get("", response_model=HostedZoneListResponse)
def get_zones(
    query: Optional[str] = Query(None, description="Search term for zone name, description or ID"),
    type: Optional[str] = Query(None, description="Filter by Public or Private"),
    sort_by: str = Query("created_at", description="Field to sort by: name, type, created_by, record_count, id, created_at"),
    order: str = Query("desc", description="Sort order: asc or desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items, total = list_hosted_zones(
        db=db,
        query=query,
        zone_type=type,
        sort_by=sort_by,
        order=order,
        skip=skip,
        limit=limit
    )
    return HostedZoneListResponse(items=items, total=total)

@router.post("", response_model=HostedZoneResponse, status_code=status.HTTP_201_CREATED)
def create_zone(
    zone_in: HostedZoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Set created_by if not provided
    if not zone_in.created_by:
        zone_in.created_by = current_user.username or "Route 53"
    return create_hosted_zone(db, zone_in)

@router.get("/{zone_id}", response_model=HostedZoneResponse)
def get_zone(
    zone_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_hosted_zone(db, zone_id)

@router.put("/{zone_id}", response_model=HostedZoneResponse)
def update_zone(
    zone_id: str,
    zone_in: HostedZoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return update_hosted_zone(db, zone_id, zone_in)

@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_zone(
    zone_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    delete_hosted_zone(db, zone_id)
    return None
