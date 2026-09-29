"""
Inspect360 - Comprehensive Automated Test Suite
Smart India Hackathon 2026 (SIH26095) - Ministry of Social Justice & Empowerment (MoSJE)
Team: Smart Inspect (AMP2026018)
"""

import sys
import os

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from backend.server import app

client = TestClient(app)

def run_tests():
    print("================================================================================")
    print("         INSPECT360: AUTOMATED TEST SUITE (SIH26095)")
    print("================================================================================")

    # 1. Test Static Frontend Mounting
    res = client.get("/")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert "Inspect360" in res.text, "Frontend HTML missing title"
    print("[PASS] 1. Static Web Application Root ('/') serving successfully")

    # 2. Test KPIs
    res = client.get("/api/kpi")
    assert res.status_code == 200
    kpis = res.json()
    assert kpis["total_facilities"] >= 8
    assert kpis["total_inspectors"] >= 4
    print(f"[PASS] 2. Ministry PMU KPIs retrieved ({kpis['total_facilities']} facilities, {kpis['total_inspectors']} inspectors)")

    # 3. Test Facilities Directory
    res = client.get("/api/facilities")
    assert res.status_code == 200
    facilities = res.json()
    assert len(facilities) >= 8
    print(f"[PASS] 3. Registered Facilities Directory retrieved ({len(facilities)} facilities)")

    # 4. Test Inspector Telemetry
    res = client.get("/api/inspectors")
    assert res.status_code == 200
    inspectors = res.json()
    assert len(inspectors) >= 4
    print(f"[PASS] 4. Field Inspectors Telemetry retrieved ({len(inspectors)} officers)")

    # 5. Test Geofence Telemetry - Inside Geofence
    res = client.post("/api/telemetry/verify-geofence", json={
        "facility_id": "FAC-JH-001",
        "latitude": 23.3441,
        "longitude": 85.3096
    })
    assert res.status_code == 200
    geo = res.json()
    assert geo["inside_geofence"] is True
    assert geo["status"] == "AUTHORIZED"
    print(f"[PASS] 5. Cadastral Geofence Verification (Inside: {geo['distance_meters']}m)")

    # 6. Test Geofence Telemetry - Breach Detected
    res = client.post("/api/telemetry/verify-geofence", json={
        "facility_id": "FAC-JH-001",
        "latitude": 23.3550,
        "longitude": 85.3200
    })
    assert res.status_code == 200
    geo_breach = res.json()
    assert geo_breach["inside_geofence"] is False
    assert geo_breach["status"] == "BREACH"
    print(f"[PASS] 6. Cadastral Geofence Breach Detection (Outside: {geo_breach['distance_meters']}m)")

    # 7. Test Inspections List & Filters
    res = client.get("/api/inspections?status=ALL&type=ALL")
    assert res.status_code == 200
    inspections = res.json()
    assert len(inspections) >= 5
    print(f"[PASS] 7. Inspections Registry retrieved ({len(inspections)} audits)")

    # 8. Test Single Inspection Detail
    test_id = "INSP-2026-088"
    res = client.get(f"/api/inspections/{test_id}")
    assert res.status_code == 200
    insp = res.json()
    assert insp["id"] == test_id
    assert insp["sha256_hash"] is not None
    print(f"[PASS] 8. Inspection Dossier Retrieval ({test_id})")

    # 9. Test AI Anti-Collusion Randomizer Dispatch
    res = client.post("/api/ai/randomize-assignment")
    assert res.status_code == 200
    random_dispatch = res.json()
    assert random_dispatch["status"] == "dispatched"
    assert "inspection_id" in random_dispatch
    assert random_dispatch["anti_collusion_sealed"] is True
    print(f"[PASS] 9. AI Anti-Collusion Randomizer ({random_dispatch['inspection_id']} -> {random_dispatch['facility']['name']})")

    # 10. Test Field Inspection Submission
    new_insp_id = random_dispatch["inspection_id"]
    fac_id = random_dispatch["facility"]["id"]
    # Get facility coords
    target_fac = next(f for f in facilities if f["id"] == fac_id)
    res = client.post(f"/api/inspections/{new_insp_id}/submit", json={
        "latitude": target_fac["latitude"],
        "longitude": target_fac["longitude"],
        "reported_headcount": 110,
        "hygiene_rating": 5,
        "infrastructure_rating": 4,
        "food_quality_rating": 5,
        "staff_attendance_rating": 5,
        "remarks": "Automated test submission with verified geofence lock.",
        "photo_url": "data:image/svg+xml;utf8,<svg></svg>",
        "signature_data": "data:image/png;base64,test"
    })
    assert res.status_code == 200
    sub_data = res.json()
    assert sub_data["status"] == "success"
    assert "sha256_seal" in sub_data
    print(f"[PASS] 10. Field Inspection Submission & Cryptographic Seal Generated")

    # 11. Test Public Cryptographic Verifier
    res = client.get(f"/api/verify/{test_id}")
    assert res.status_code == 200
    ver = res.json()
    assert ver["verified"] is True
    assert ver["sha256_hash"] is not None
    print(f"[PASS] 11. Public SHA-256 Verifier ({ver['sha256_hash'][:24]}...)")

    # 12. Test AI Anomalies Feed
    res = client.get("/api/anomalies")
    assert res.status_code == 200
    anomalies = res.json()
    assert len(anomalies) >= 3
    print(f"[PASS] 12. AI Fraud & Discrepancy Alerts ({len(anomalies)} anomalies)")

    # 13. Test CCTV Video Telemetry
    res = client.get("/api/cctv")
    assert res.status_code == 200
    cctv = res.json()
    assert len(cctv) >= 2
    print(f"[PASS] 13. CCTV Telemetry & AI Headcount Corroboration ({len(cctv)} feeds)")

    # 14. Test Citizen Grievances & Upvoting
    res = client.get("/api/grievances")
    assert res.status_code == 200
    grievances = res.json()
    assert len(grievances) >= 2
    grv_id = grievances[0]["id"]
    old_votes = grievances[0]["upvotes"]

    res_up = client.post(f"/api/grievances/{grv_id}/upvote")
    assert res_up.status_code == 200
    assert res_up.json()["upvotes"] == old_votes + 1
    print(f"[PASS] 14. Citizen Whistleblower Portal & Community Upvotes ({grv_id}: {old_votes} -> {old_votes + 1})")

    # 15. Test CSV Audit Export
    res = client.get("/api/export/csv")
    assert res.status_code == 200
    assert "text/csv" in res.headers.get("content-type", "")
    assert "Inspection ID" in res.text
    print("[PASS] 15. MoSJE National Audit Registry CSV Export")

    print("\n================================================================================")
    print("       ALL 15 ENDPOINTS & INTEGRATION TESTS PASSED SUCCESSFULLY! (100%)")
    print("================================================================================")

if __name__ == "__main__":
    run_tests()
