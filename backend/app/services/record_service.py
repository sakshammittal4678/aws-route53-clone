import uuid
from typing import List, Optional, Tuple
from sqlalchemy import func, desc, asc
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.hosted_zone import HostedZone
from app.models.dns_record import DNSRecord
from app.schemas.dns_record import (
    DNSRecordCreate,
    DNSRecordUpdate,
    DNSRecordResponse,
    BulkDeleteResponse,
)
from app.services.validators import validate_dns_records_payload, validate_domain_name

def normalize_record_name(record_name: str, zone_name: str) -> str:
    rn = record_name.strip()
    zn = zone_name.strip()
    if not zn.endswith("."):
        zn += "."

    if not rn or rn == "@":
        return zn
    
    # If ends with dot
    if rn.endswith("."):
        if not rn.endswith(zn):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Record name '{rn}' must end with hosted zone domain '{zn}'"
            )
        return rn
    else:
        # e.g. "www" -> "www.example.com."
        if rn.endswith(zn.rstrip(".")):
            return rn + "."
        return f"{rn}.{zn}"

def create_dns_record(db: Session, zone_id: str, record_in: DNSRecordCreate) -> DNSRecordResponse:
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hosted zone '{zone_id}' not found"
        )

    # Validate and normalize record name
    full_name = normalize_record_name(record_in.name, zone.name)
    if not validate_domain_name(full_name.rstrip(".")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid DNS record name format: '{record_in.name}'"
        )

    # Validate routing policy
    if record_in.routing_policy not in ("Simple", "Weighted"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Routing policy must be either 'Simple' or 'Weighted'"
        )

    set_id = (record_in.set_identifier or "").strip()
    if record_in.routing_policy == "Weighted":
        if record_in.weight is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Weight (0-255) is required for Weighted routing policy"
            )
        if not set_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Set identifier / differentiator is required for Weighted routing policy"
            )
    else:
        set_id = ""

    # Validate values unless alias
    if not record_in.is_alias:
        valid, msg = validate_dns_records_payload(record_in.type, record_in.records)
        if not valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Validation error for {record_in.type} record: {msg}"
            )
    else:
        if not record_in.alias_target:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Alias target is required when is_alias is enabled"
            )

    # Check unique constraint (zone_id, name, type, set_identifier)
    existing = db.query(DNSRecord).filter(
        DNSRecord.zone_id == zone_id,
        DNSRecord.name == full_name,
        DNSRecord.type == record_in.type,
        DNSRecord.set_identifier == set_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A record with name '{full_name}', type '{record_in.type}', and set identifier '{set_id}' already exists in this zone"
        )

    record_id = f"rec-{uuid.uuid4().hex[:12]}"
    record = DNSRecord(
        id=record_id,
        zone_id=zone_id,
        name=full_name,
        type=record_in.type,
        routing_policy=record_in.routing_policy,
        set_identifier=set_id,
        weight=record_in.weight if record_in.routing_policy == "Weighted" else None,
        ttl=record_in.ttl,
        records=record_in.records,
        is_alias=record_in.is_alias,
        alias_target=record_in.alias_target,
        evaluate_target_health=record_in.evaluate_target_health,
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return DNSRecordResponse.model_validate(record)

def get_dns_record(db: Session, zone_id: str, record_id: str) -> DNSRecordResponse:
    record = db.query(DNSRecord).filter(
        DNSRecord.zone_id == zone_id,
        DNSRecord.id == record_id
    ).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"DNS record '{record_id}' not found in hosted zone '{zone_id}'"
        )
    return DNSRecordResponse.model_validate(record)

def list_dns_records(
    db: Session,
    zone_id: str,
    query: Optional[str] = None,
    record_type: Optional[str] = None,
    routing_policy: Optional[str] = None,
    sort_by: str = "name",
    order: str = "asc",
    skip: int = 0,
    limit: int = 100,
) -> Tuple[List[DNSRecordResponse], int]:
    # Ensure zone exists
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hosted zone '{zone_id}' not found"
        )

    base_query = db.query(DNSRecord).filter(DNSRecord.zone_id == zone_id)

    # Search by both name and record value
    if query:
        q_clean = f"%{query.strip().lower()}%"
        base_query = base_query.filter(
            func.lower(DNSRecord.name).like(q_clean) |
            func.lower(DNSRecord.records).like(q_clean) |
            func.lower(DNSRecord.set_identifier).like(q_clean)
        )

    if record_type and record_type.upper() != "ALL":
        base_query = base_query.filter(DNSRecord.type == record_type.upper())

    if routing_policy and routing_policy.capitalize() != "All":
        base_query = base_query.filter(DNSRecord.routing_policy == routing_policy.capitalize())

    total = base_query.count()

    is_desc = order.lower() == "desc"
    if sort_by == "type":
        col = desc(DNSRecord.type) if is_desc else asc(DNSRecord.type)
    elif sort_by == "routing_policy":
        col = desc(DNSRecord.routing_policy) if is_desc else asc(DNSRecord.routing_policy)
    elif sort_by == "ttl":
        col = desc(DNSRecord.ttl) if is_desc else asc(DNSRecord.ttl)
    elif sort_by == "created_at":
        col = desc(DNSRecord.created_at) if is_desc else asc(DNSRecord.created_at)
    else:
        col = desc(DNSRecord.name) if is_desc else asc(DNSRecord.name)

    records = base_query.order_by(col).offset(skip).limit(limit).all()
    items = [DNSRecordResponse.model_validate(r) for r in records]

    return items, total

def update_dns_record(
    db: Session,
    zone_id: str,
    record_id: str,
    record_in: DNSRecordUpdate
) -> DNSRecordResponse:
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hosted zone '{zone_id}' not found"
        )

    record = db.query(DNSRecord).filter(
        DNSRecord.zone_id == zone_id,
        DNSRecord.id == record_id
    ).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"DNS record '{record_id}' not found"
        )

    # If updating values, validate against existing record type
    if record_in.records is not None:
        if not (record_in.is_alias if record_in.is_alias is not None else record.is_alias):
            valid, msg = validate_dns_records_payload(record.type, record_in.records)
            if not valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Validation error for {record.type} record: {msg}"
                )
        record.records = record_in.records

    if record_in.ttl is not None:
        record.ttl = record_in.ttl

    if record_in.routing_policy is not None:
        if record_in.routing_policy not in ("Simple", "Weighted"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Routing policy must be Simple or Weighted"
            )
        record.routing_policy = record_in.routing_policy

    if record_in.set_identifier is not None:
        record.set_identifier = record_in.set_identifier

    if record_in.weight is not None:
        record.weight = record_in.weight

    if record_in.is_alias is not None:
        record.is_alias = record_in.is_alias

    if record_in.alias_target is not None:
        record.alias_target = record_in.alias_target

    if record_in.evaluate_target_health is not None:
        record.evaluate_target_health = record_in.evaluate_target_health

    db.commit()
    db.refresh(record)
    return DNSRecordResponse.model_validate(record)

def is_apex_record(record: DNSRecord, zone: HostedZone) -> bool:
    """Checks if a record is apex NS or SOA for the given hosted zone."""
    norm_rec_name = record.name.rstrip(".")
    norm_zone_name = zone.name.rstrip(".")
    return record.type in ("NS", "SOA") and (norm_rec_name == norm_zone_name)

def delete_dns_record(db: Session, zone_id: str, record_id: str) -> None:
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hosted zone '{zone_id}' not found"
        )

    record = db.query(DNSRecord).filter(
        DNSRecord.zone_id == zone_id,
        DNSRecord.id == record_id
    ).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"DNS record '{record_id}' not found"
        )

    # Protect apex NS and SOA records
    if is_apex_record(record, zone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete default apex {record.type} records for hosted zone"
        )

    db.delete(record)
    db.commit()

def bulk_delete_dns_records(
    db: Session,
    zone_id: str,
    record_ids: List[str]
) -> BulkDeleteResponse:
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hosted zone '{zone_id}' not found"
        )

    records = db.query(DNSRecord).filter(
        DNSRecord.zone_id == zone_id,
        DNSRecord.id.in_(record_ids)
    ).all()

    deleted_ids = []
    skipped_ids = []

    for r in records:
        if is_apex_record(r, zone):
            skipped_ids.append(r.id)
        else:
            deleted_ids.append(r.id)
            db.delete(r)

    db.commit()

    msg = f"Successfully deleted {len(deleted_ids)} record(s)."
    if skipped_ids:
        msg += f" {len(skipped_ids)} apex NS/SOA record(s) were protected from deletion."

    return BulkDeleteResponse(
        deleted_count=len(deleted_ids),
        deleted_ids=deleted_ids,
        skipped_ids=skipped_ids,
        message=msg
    )
