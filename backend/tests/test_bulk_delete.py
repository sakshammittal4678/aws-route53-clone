import pytest

def test_bulk_delete_records_with_apex_protection(client):
    z_resp = client.post("/api/v1/hosted-zones", json={"name": "bulkdeletetest.org", "type": "Public"})
    zone_id = z_resp.json()["id"]

    # Create two regular records
    rec1 = client.post(f"/api/v1/hosted-zones/{zone_id}/records", json={
        "name": "a1.bulkdeletetest.org",
        "type": "A",
        "ttl": 300,
        "records": ["1.1.1.1"]
    }).json()

    rec2 = client.post(f"/api/v1/hosted-zones/{zone_id}/records", json={
        "name": "a2.bulkdeletetest.org",
        "type": "A",
        "ttl": 300,
        "records": ["2.2.2.2"]
    }).json()

    # Get apex NS record ID
    all_recs = client.get(f"/api/v1/hosted-zones/{zone_id}/records").json()["items"]
    ns_rec = next(r for r in all_recs if r["type"] == "NS")

    # Bulk delete: rec1, rec2, and apex ns_rec
    bulk_payload = {
        "record_ids": [rec1["id"], rec2["id"], ns_rec["id"]]
    }
    bulk_resp = client.post(f"/api/v1/hosted-zones/{zone_id}/records/bulk-delete", json=bulk_payload)
    assert bulk_resp.status_code == 200
    res_data = bulk_resp.json()

    # Apex NS record should be skipped
    assert res_data["deleted_count"] == 2
    assert rec1["id"] in res_data["deleted_ids"]
    assert rec2["id"] in res_data["deleted_ids"]
    assert ns_rec["id"] in res_data["skipped_ids"]
    assert "protected from deletion" in res_data["message"]
