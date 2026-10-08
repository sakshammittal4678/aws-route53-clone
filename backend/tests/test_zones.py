import pytest
from app.models.dns_record import DNSRecord

def test_create_and_get_hosted_zone(client):
    payload = {
        "name": "autotestdomain.com",
        "description": "Integration test domain",
        "type": "Public"
    }
    resp = client.post("/api/v1/hosted-zones", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "autotestdomain.com."
    assert data["record_count"] == 2
    assert data["created_by"] == "Route 53"
    zone_id = data["id"]

    # Check auto-created NS and SOA records
    rec_resp = client.get(f"/api/v1/hosted-zones/{zone_id}/records")
    assert rec_resp.status_code == 200
    records = rec_resp.json()["items"]
    assert len(records) == 2
    rec_types = {r["type"] for r in records}
    assert "NS" in rec_types
    assert "SOA" in rec_types

def test_list_and_sort_hosted_zones(client):
    # Create two zones
    client.post("/api/v1/hosted-zones", json={"name": "alpha.org", "type": "Public"})
    client.post("/api/v1/hosted-zones", json={"name": "zebra.net", "type": "Public"})

    # Test sorting by name ascending
    resp_asc = client.get("/api/v1/hosted-zones?sort_by=name&order=asc")
    assert resp_asc.status_code == 200
    names = [z["name"] for z in resp_asc.json()["items"]]
    assert names == sorted(names)

    # Test search query
    resp_search = client.get("/api/v1/hosted-zones?query=alpha")
    assert resp_search.status_code == 200
    items = resp_search.json()["items"]
    assert any("alpha" in z["name"] for z in items)

def test_cascade_delete_hosted_zone(client, db):
    resp = client.post("/api/v1/hosted-zones", json={"name": "cascadetest.com", "type": "Public"})
    zone_id = resp.json()["id"]

    # Verify records exist
    recs_before = db.query(DNSRecord).filter(DNSRecord.zone_id == zone_id).all()
    assert len(recs_before) == 2

    # Delete zone
    del_resp = client.delete(f"/api/v1/hosted-zones/{zone_id}")
    assert del_resp.status_code == 204

    # Verify records were cascade deleted
    recs_after = db.query(DNSRecord).filter(DNSRecord.zone_id == zone_id).all()
    assert len(recs_after) == 0
