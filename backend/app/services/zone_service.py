import random
import string
import uuid
from typing import List, Optional, Tuple
from sqlalchemy import func, select, desc, asc
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.hosted_zone import HostedZone
from app.models.dns_record import DNSRecord
from app.schemas.hosted_zone import HostedZoneCreate, HostedZoneUpdate, HostedZoneResponse

def generate_zone_id() -> str:
    chars = string.ascii_uppercase + string.digits
    return "Z" + "".join(random.choices(chars, k=14))

def normalize_domain_name(name: str) -> str:
    cleaned = name.strip()
    if not cleaned.endswith("."):
        cleaned += "."
    return cleaned

def create_hosted_zone(db: Session, zone_in: HostedZoneCreate) -> HostedZoneResponse:
    domain_name = normalize_domain_name(zone_in.name)

    # Check caller reference or duplicate zone name with same type
    existing = db.query(HostedZone).filter(
        HostedZone.name == domain_name,
        HostedZone.type == zone_in.type
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Hosted zone '{domain_name}' with type '{zone_in.type}' already exists"
        )

    zone_id = generate_zone_id()
    caller_ref = str(uuid.uuid4())

    zone = HostedZone(
        id=zone_id,
        name=domain_name,
        description=zone_in.description,
        type=zone_in.type,
        created_by=zone_in.created_by or "Route 53",
        vpc_id=zone_in.vpc_id if zone_in.type == "Private" else None,
        vpc_region=zone_in.vpc_region if zone_in.type == "Private" else None,
        caller_reference=caller_ref,
    )
    db.add(zone)
    db.flush()

    # Create default NS record (4 AWS Route 53 name servers)
    rand_num = random.randint(100, 999)
    ns_servers = [
        f"ns-{rand_num}.awsdns-{random.randint(10, 59)}.com.",
        f"ns-{rand_num + 1}.awsdns-{random.randint(10, 59)}.net.",
        f"ns-{rand_num + 2}.awsdns-{random.randint(10, 59)}.org.",
        f"ns-{rand_num + 3}.awsdns-{random.randint(10, 59)}.co.uk.",
    ]
    ns_record = DNSRecord(
        id=f"rec-{uuid.uuid4().hex[:12]}",
        zone_id=zone_id,
        name=domain_name,
        type="NS",
        routing_policy="Simple",
        set_identifier="",
        ttl=172800,
        records=ns_servers,
    )
    db.add(ns_record)

    # Create default SOA record
    primary_ns = ns_servers[0]
    soa_value = f"{primary_ns} awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"
    soa_record = DNSRecord(
        id=f"rec-{uuid.uuid4().hex[:12]}",
        zone_id=zone_id,
        name=domain_name,
        type="SOA",
        routing_policy="Simple",
        set_identifier="",
        ttl=900,
        records=[soa_value],
    )
    db.add(soa_record)

    db.commit()
    db.refresh(zone)

    return HostedZoneResponse(
        id=zone.id,
        name=zone.name,
        description=zone.description,
        type=zone.type,
        created_by=zone.created_by,
        vpc_id=zone.vpc_id,
        vpc_region=zone.vpc_region,
        record_count=2,
        caller_reference=zone.caller_reference,
        created_at=zone.created_at,
        updated_at=zone.updated_at,
    )

def get_hosted_zone(db: Session, zone_id: str) -> HostedZoneResponse:
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hosted zone '{zone_id}' not found"
        )
    # Compute record count dynamically
    count = db.query(func.count(DNSRecord.id)).filter(DNSRecord.zone_id == zone_id).scalar() or 0

    return HostedZoneResponse(
        id=zone.id,
        name=zone.name,
        description=zone.description,
        type=zone.type,
        created_by=zone.created_by,
        vpc_id=zone.vpc_id,
        vpc_region=zone.vpc_region,
        record_count=count,
        caller_reference=zone.caller_reference,
        created_at=zone.created_at,
        updated_at=zone.updated_at,
    )

def list_hosted_zones(
    db: Session,
    query: Optional[str] = None,
    zone_type: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "desc",
    skip: int = 0,
    limit: int = 100,
) -> Tuple[List[HostedZoneResponse], int]:
    # Query with left join to compute dynamic record counts
    count_subquery = (
        db.query(DNSRecord.zone_id, func.count(DNSRecord.id).label("record_count"))
        .group_by(DNSRecord.zone_id)
        .subquery()
    )

    base_query = db.query(
        HostedZone,
        func.coalesce(count_subquery.c.record_count, 0).label("rec_count")
    ).outerjoin(count_subquery, HostedZone.id == count_subquery.c.zone_id)

    if query:
        q_clean = f"%{query.strip().lower()}%"
        base_query = base_query.filter(
            func.lower(HostedZone.name).like(q_clean) |
            func.lower(HostedZone.id).like(q_clean) |
            func.lower(HostedZone.description).like(q_clean)
        )

    if zone_type and zone_type.lower() != "all":
        base_query = base_query.filter(func.lower(HostedZone.type) == zone_type.lower())

    total = base_query.count()

    # Sorting
    is_desc = order.lower() == "desc"
    if sort_by == "name":
        col = desc(HostedZone.name) if is_desc else asc(HostedZone.name)
    elif sort_by == "type":
        col = desc(HostedZone.type) if is_desc else asc(HostedZone.type)
    elif sort_by == "created_by":
        col = desc(HostedZone.created_by) if is_desc else asc(HostedZone.created_by)
    elif sort_by == "record_count":
        col = desc("rec_count") if is_desc else asc("rec_count")
    elif sort_by == "id":
        col = desc(HostedZone.id) if is_desc else asc(HostedZone.id)
    else:
        col = desc(HostedZone.created_at) if is_desc else asc(HostedZone.created_at)

    rows = base_query.order_by(col).offset(skip).limit(limit).all()

    items = [
        HostedZoneResponse(
            id=zone.id,
            name=zone.name,
            description=zone.description,
            type=zone.type,
            created_by=zone.created_by,
            vpc_id=zone.vpc_id,
            vpc_region=zone.vpc_region,
            record_count=rec_count,
            caller_reference=zone.caller_reference,
            created_at=zone.created_at,
            updated_at=zone.updated_at,
        )
        for zone, rec_count in rows
    ]

    return items, total

def update_hosted_zone(db: Session, zone_id: str, zone_in: HostedZoneUpdate) -> HostedZoneResponse:
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hosted zone '{zone_id}' not found"
        )

    if zone_in.description is not None:
        zone.description = zone_in.description
    if zone.type == "Private":
        if zone_in.vpc_id is not None:
            zone.vpc_id = zone_in.vpc_id
        if zone_in.vpc_region is not None:
            zone.vpc_region = zone_in.vpc_region

    db.commit()
    db.refresh(zone)
    return get_hosted_zone(db, zone_id)

def delete_hosted_zone(db: Session, zone_id: str) -> None:
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hosted zone '{zone_id}' not found"
        )
    db.delete(zone)
    db.commit()
