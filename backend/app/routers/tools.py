from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session
from typing import Literal

from app.core.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.hosted_zone import HostedZone
from app.models.dns_record import DNSRecord
from app.schemas.bind import BindImportRequest, BindImportResponse
from app.services.zone_service import get_hosted_zone
from app.services.bind_service import export_zone_to_bind, import_bind_to_zone

router = APIRouter(prefix="/hosted-zones/{zone_id}", tags=["Zone Tools"])

@router.get("/export")
def export_zone(
    zone_id: str,
    format: Literal["bind", "json"] = Query("bind", description="Export format: bind or json"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        from fastapi import HTTPException
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hosted zone not found")

    records = db.query(DNSRecord).filter(DNSRecord.zone_id == zone_id).all()

    if format == "json":
        data = {
            "hosted_zone": {
                "id": zone.id,
                "name": zone.name,
                "type": zone.type,
                "description": zone.description,
            },
            "records": [
                {
                    "name": r.name,
                    "type": r.type,
                    "routing_policy": r.routing_policy,
                    "set_identifier": r.set_identifier,
                    "weight": r.weight,
                    "ttl": r.ttl,
                    "records": r.records,
                    "is_alias": r.is_alias,
                    "alias_target": r.alias_target,
                }
                for r in records
            ]
        }
        return data

    bind_content = export_zone_to_bind(zone, records)
    filename = f"{zone.name.rstrip('.')}.zone"
    return Response(
        content=bind_content,
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.post("/import-bind", response_model=BindImportResponse)
def import_bind(
    zone_id: str,
    payload: BindImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    imported = import_bind_to_zone(db, zone_id, payload.zone_content)
    return BindImportResponse(
        imported_count=len(imported),
        records=imported,
        message=f"Successfully imported {len(imported)} record(s) from BIND zone file."
    )
