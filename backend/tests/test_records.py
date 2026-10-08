import pytest

def test_create_and_search_records(client):
    # Create zone
    z_resp = client.post("/api/v1/hosted-zones", json={"name": "recordstest.org", "type": "Public"})
    zone_id = z_resp.json()["id"]

    # 1. Create Simple A record
    rec1_payload = {
        "name": "www.recordstest.org",
        "type": "A",
        "routing_policy": "Simple",
        "ttl": 300,
        "records": ["198.51.100.25"]
    }
    rec1_resp = client.post(f"/api/v1/hosted-zones/{zone_id}/records", json=rec1_payload)
    assert rec1_resp.status_code == 201

    # 2. Create Weighted A record
    rec2_payload = {
        "name": "app.recordstest.org",
        "type": "A",
        "routing_policy": "Weighted",
        "set_identifier": "canary-v1",
        "weight": 20,
        "ttl": 60,
        "records": ["198.51.100.50"]
    }
    rec2_resp = client.post(f"/api/v1/hosted-zones/{zone_id}/records", json=rec2_payload)
    assert rec2_resp.status_code == 201
    assert rec2_resp.json()["set_identifier"] == "canary-v1"
    assert rec2_resp.json()["weight"] == 20

    # 3. Duplicate identity check
    dup_resp = client.post(f"/api/v1/hosted-zones/{zone_id}/records", json=rec2_payload)
    assert dup_resp.status_code == 400
    assert "already exists" in dup_resp.json()["detail"]

    # 4. Search by record value (198.51.100.50)
    search_resp = client.get(f"/api/v1/hosted-zones/{zone_id}/records?query=198.51.100.50")
    assert search_resp.status_code == 200
    items = search_resp.json()["items"]
    assert len(items) == 1
    assert items[0]["name"] == "app.recordstest.org."

def test_apex_protection(client):
    z_resp = client.post("/api/v1/hosted-zones", json={"name": "apexprotect.com", "type": "Public"})
    zone_id = z_resp.json()["id"]

    recs = client.get(f"/api/v1/hosted-zones/{zone_id}/records").json()["items"]
    soa_rec = next(r for r in recs if r["type"] == "SOA")
    ns_rec = next(r for r in recs if r["type"] == "NS")

    # Attempt to delete SOA
    del_soa = client.delete(f"/api/v1/hosted-zones/{zone_id}/records/{soa_rec['id']}")
    assert del_soa.status_code == 400
    assert "Cannot delete default apex SOA" in del_soa.json()["detail"]

    # Attempt to delete NS
    del_ns = client.delete(f"/api/v1/hosted-zones/{zone_id}/records/{ns_rec['id']}")
    assert del_ns.status_code == 400
    assert "Cannot delete default apex NS" in del_ns.json()["detail"]
