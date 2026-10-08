import ipaddress
import re
from typing import List, Tuple

DOMAIN_REGEX = re.compile(
    r"^(?:[a-zA-Z0-9_](?:[a-zA-Z0-9-_]{0,61}[a-zA-Z0-9_])?\.)*[a-zA-Z0-9_](?:[a-zA-Z0-9-_]{0,61}[a-zA-Z0-9_])?\.?$"
)

def validate_domain_name(name: str) -> bool:
    if not name or len(name) > 255:
        return False
    if name == "@" or name == ".":
        return True
    return bool(DOMAIN_REGEX.match(name))

def validate_record_value(record_type: str, value: str) -> Tuple[bool, str]:
    """Validates an individual record value based on DNS record type."""
    v = value.strip()
    if not v:
        return False, "Record value cannot be empty"

    if record_type == "A":
        try:
            ip = ipaddress.IPv4Address(v)
            return True, ""
        except ValueError:
            return False, f"Invalid IPv4 address: '{v}'"

    elif record_type == "AAAA":
        try:
            ip = ipaddress.IPv6Address(v)
            return True, ""
        except ValueError:
            return False, f"Invalid IPv6 address: '{v}'"

    elif record_type == "CNAME":
        # CNAME must be a valid hostname/domain
        clean = v.rstrip(".")
        if validate_domain_name(clean):
            return True, ""
        return False, f"Invalid CNAME domain target: '{v}'"

    elif record_type == "TXT":
        # TXT value is either quoted string or text up to 255 chars per segment
        if len(v) > 4000:
            return False, "TXT record value exceeds 4000 character maximum"
        return True, ""

    elif record_type == "MX":
        # Format: <priority 0-65535> <mail server domain>
        parts = v.split(maxsplit=1)
        if len(parts) != 2:
            return False, f"MX record must be in format '<priority> <domain>', received: '{v}'"
        try:
            prio = int(parts[0])
            if prio < 0 or prio > 65535:
                return False, f"MX priority must be between 0 and 65535, received: {prio}"
        except ValueError:
            return False, f"MX priority must be an integer, received: '{parts[0]}'"
        clean_target = parts[1].rstrip(".")
        if not validate_domain_name(clean_target):
            return False, f"Invalid MX host domain: '{parts[1]}'"
        return True, ""

    elif record_type in ("NS", "PTR"):
        clean = v.rstrip(".")
        if validate_domain_name(clean):
            return True, ""
        return False, f"Invalid domain target for {record_type}: '{v}'"

    elif record_type == "SRV":
        # Format: <priority> <weight> <port> <target>
        parts = v.split()
        if len(parts) != 4:
            return False, f"SRV record must be in format '<priority> <weight> <port> <target>', received: '{v}'"
        try:
            prio, weight, port = int(parts[0]), int(parts[1]), int(parts[2])
            if not (0 <= prio <= 65535 and 0 <= weight <= 65535 and 0 <= port <= 65535):
                return False, "SRV priority, weight, and port must be between 0 and 65535"
        except ValueError:
            return False, "SRV priority, weight, and port must be integers"
        clean_target = parts[3].rstrip(".")
        if not validate_domain_name(clean_target):
            return False, f"Invalid SRV target domain: '{parts[3]}'"
        return True, ""

    elif record_type == "CAA":
        # Format: <flags> <tag> "<value>"
        parts = v.split(maxsplit=2)
        if len(parts) < 3:
            return False, f"CAA record must be in format '<flags> <tag> \"<value>\"', received: '{v}'"
        try:
            flags = int(parts[0])
            if flags < 0 or flags > 255:
                return False, "CAA flags must be between 0 and 255"
        except ValueError:
            return False, f"CAA flags must be an integer, received: '{parts[0]}'"
        if parts[1].lower() not in ("issue", "issuewild", "iodef"):
            return False, f"CAA tag must be issue, issuewild, or iodef, received: '{parts[1]}'"
        return True, ""

    elif record_type == "SOA":
        # Format: <mname> <rname> <serial> <refresh> <retry> <expire> <minimum>
        parts = v.split()
        if len(parts) != 7:
            return False, "SOA record must contain 7 fields: mname rname serial refresh retry expire minimum"
        try:
            for num in parts[2:]:
                int(num)
        except ValueError:
            return False, "SOA serial, refresh, retry, expire, and minimum must be integers"
        return True, ""

    return True, ""

def validate_dns_records_payload(record_type: str, records: List[str]) -> Tuple[bool, str]:
    if not records:
        return False, "At least one record value must be specified"
    for r in records:
        valid, msg = validate_record_value(record_type, r)
        if not valid:
            return False, msg
    return True, ""
