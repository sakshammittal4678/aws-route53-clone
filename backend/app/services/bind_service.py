import re
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.hosted_zone import HostedZone
from app.models.dns_record import DNSRecord
from app.schemas.dns_record import DNSRecordCreate, DNSRecordResponse
from app.services.record_service import create_dns_record, normalize_record_name

SUPPORTED_TYPES = {"A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA", "SOA"}

def export_zone_to_bind(zone: HostedZone, records: List[DNSRecord]) -> str:
    lines = [
        f"; Zone file exported from AWS Route 53 Clone",
        f"; Zone: {zone.name}",
        f"; Exported timestamp: {zone.updated_at.isoformat() if zone.updated_at else ''}",
        f"$ORIGIN {zone.name}",
        f"$TTL 300",
        ""
    ]

    for r in records:
        rel_name = r.name
        if rel_name == zone.name:
            rel_name = "@"
        elif rel_name.endswith(zone.name):
            rel_name = rel_name[:-len(zone.name)].rstrip(".")

        for val in r.records:
            if r.type == "TXT" and not (val.startswith('"') and val.endswith('"')):
                formatted_val = f'"{val}"'
            else:
                formatted_val = val
            lines.append(f"{rel_name:<24} {r.ttl:<8} IN  {r.type:<6} {formatted_val}")

    return "\n".join(lines) + "\n"

def parse_bind_zone_file(zone_content: str, default_origin: str) -> List[Dict[str, Any]]:
    """
    Parses a BIND 9 zone file content into a list of parsed record dictionaries.
    Handles $ORIGIN, $TTL, multiline parentheses, comments.
    """
    origin = default_origin.strip()
    if not origin.endswith("."):
        origin += "."
    
    current_ttl = 300
    last_name = "@"

    # Remove multi-line parentheses by collapsing them
    content = zone_content.replace("\r\n", "\n").replace("\r", "\n")
    
    # Strip comments first line-by-line (while keeping quotes intact)
    cleaned_lines = []
    in_paren = False
    paren_buffer = []

    for line in content.split("\n"):
        # Remove comment outside of quotes
        in_quotes = False
        chars = []
        for ch in line:
            if ch == '"':
                in_quotes = not in_quotes
            elif ch == ';' and not in_quotes:
                break
            chars.append(ch)
        line_no_comment = "".join(chars).strip()
        if not line_no_comment:
            continue

        if "(" in line_no_comment and ")" not in line_no_comment:
            in_paren = True
            paren_buffer.append(line_no_comment.replace("(", " "))
        elif in_paren:
            if ")" in line_no_comment:
                in_paren = False
                paren_buffer.append(line_no_comment.replace(")", " "))
                cleaned_lines.append(" ".join(paren_buffer))
                paren_buffer = []
            else:
                paren_buffer.append(line_no_comment)
        else:
            cleaned_lines.append(line_no_comment)

    parsed_records: Dict[Tuple[str, str], Dict[str, Any]] = {}

    for line in cleaned_lines:
        tokens = line.split()
        if not tokens:
            continue

        first = tokens[0].upper()
        if first == "$ORIGIN":
            if len(tokens) > 1:
                origin = tokens[1]
                if not origin.endswith("."):
                    origin += "."
            continue
        elif first == "$TTL":
            if len(tokens) > 1:
                try:
                    current_ttl = int(tokens[1])
                except ValueError:
                    pass
            continue

        idx = 0
        name = last_name
        # Check if first token is record name
        # If line starts with whitespace, name is last_name
        if not line.startswith(" ") and not line.startswith("\t"):
            name = tokens[0]
            last_name = name
            idx += 1

        ttl = current_ttl
        # Check if next token is TTL
        if idx < len(tokens) and tokens[idx].isdigit():
            ttl = int(tokens[idx])
            idx += 1

        # Check if next token is IN / CH / HS class
        if idx < len(tokens) and tokens[idx].upper() in ("IN", "CS", "CH", "HS"):
            idx += 1

        # Check if next token is TTL if it was after IN
        if idx < len(tokens) and tokens[idx].isdigit():
            ttl = int(tokens[idx])
            idx += 1

        if idx >= len(tokens):
            continue

        rec_type = tokens[idx].upper()
        idx += 1
        if rec_type not in SUPPORTED_TYPES:
            continue

        # Remaining is rdata
        rdata = " ".join(tokens[idx:]).strip()
        if not rdata:
            continue

        # Clean quotes for TXT
        if rec_type == "TXT" and rdata.startswith('"') and rdata.endswith('"'):
            rdata = rdata[1:-1]

        # Normalize relative name
        if name == "@":
            full_name = origin
        elif name.endswith("."):
            full_name = name
        else:
            full_name = f"{name}.{origin}"

        key = (full_name, rec_type)
        if key not in parsed_records:
            parsed_records[key] = {
                "name": full_name,
                "type": rec_type,
                "ttl": ttl,
                "routing_policy": "Simple",
                "set_identifier": "",
                "records": [rdata]
            }
        else:
            if rdata not in parsed_records[key]["records"]:
                parsed_records[key]["records"].append(rdata)

    return list(parsed_records.values())

def import_bind_to_zone(db: Session, zone_id: str, zone_content: str) -> List[DNSRecordResponse]:
    zone = db.query(HostedZone).filter(HostedZone.id == zone_id).first()
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hosted zone '{zone_id}' not found"
        )

    parsed_list = parse_bind_zone_file(zone_content, zone.name)
    if not parsed_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid DNS records found in BIND zone content"
        )

    imported_records = []
    for item in parsed_list:
        # Check if apex NS or SOA already exists
        is_apex = (item["name"].rstrip(".") == zone.name.rstrip(".")) and item["type"] in ("NS", "SOA")
        existing = db.query(DNSRecord).filter(
            DNSRecord.zone_id == zone_id,
            DNSRecord.name == item["name"],
            DNSRecord.type == item["type"]
        ).first()

        if existing:
            # Update existing records
            existing.records = item["records"]
            existing.ttl = item["ttl"]
            db.commit()
            db.refresh(existing)
            imported_records.append(DNSRecordResponse.model_validate(existing))
        else:
            try:
                rec_in = DNSRecordCreate(
                    name=item["name"],
                    type=item["type"],
                    ttl=item["ttl"],
                    records=item["records"],
                    routing_policy="Simple",
                    set_identifier="",
                )
                new_rec = create_dns_record(db, zone_id, rec_in)
                imported_records.append(new_rec)
            except Exception:
                # If individual record fails validation, continue importing others
                continue

    return imported_records
