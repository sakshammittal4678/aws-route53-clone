import pytest
from app.services.bind_service import parse_bind_zone_file, export_zone_to_bind
from app.models.hosted_zone import HostedZone
from app.models.dns_record import DNSRecord

def test_parse_bind_zone_file():
    bind_sample = """
    $ORIGIN example.com.
    $TTL 300
    @       IN  SOA     ns1.example.com. admin.example.com. ( 2026100801 7200 3600 1209600 300 )
    @       IN  NS      ns1.example.com.
    @       IN  A       93.184.216.34
    www     IN  CNAME   example.com.
    mail    IN  MX  10  mailserver.example.com.
    ; this is a comment
    @       IN  TXT     "v=spf1 ~all"
    """
    records = parse_bind_zone_file(bind_sample, "example.com.")
    assert len(records) >= 5
    
    types = [r["type"] for r in records]
    assert "A" in types
    assert "CNAME" in types
    assert "MX" in types
    assert "TXT" in types

def test_export_zone_to_bind():
    zone = HostedZone(
        id="Z1234567890",
        name="testzone.com.",
        type="Public",
        created_by="Route 53",
        caller_reference="test-ref"
    )
    records = [
        DNSRecord(
            id="rec-1",
            zone_id="Z1234567890",
            name="testzone.com.",
            type="A",
            ttl=300,
            records=["1.2.3.4"],
            routing_policy="Simple"
        ),
        DNSRecord(
            id="rec-2",
            zone_id="Z1234567890",
            name="www.testzone.com.",
            type="CNAME",
            ttl=300,
            records=["testzone.com."],
            routing_policy="Simple"
        ),
    ]

    bind_text = export_zone_to_bind(zone, records)
    assert "$ORIGIN testzone.com." in bind_text
    assert "IN  A      1.2.3.4" in bind_text
    assert "IN  CNAME  testzone.com." in bind_text
