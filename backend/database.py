"""
Inspect360 - Database Layer & PostGIS / PostgreSQL Spatial Engine
Smart India Hackathon 2026 (SIH26095) - Ministry of Social Justice & Empowerment (MoSJE)
Team: Smart Inspect (AMP2026018)

Supports:
- PostgreSQL with PostGIS Spatial Extension (GEOGRAPHY(Point, 4326), ST_DWithin, ST_Distance)
- Automatic fallback to SQLite3 with Haversine distance engine for offline/local environments
"""

import os
import sys
import json
import math
import hashlib
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

# Check if PostgreSQL connection URL is configured in environment
POSTGRES_URL = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
USE_POSTGRES = bool(POSTGRES_URL)

SQLITE_PATH = os.path.join(os.path.dirname(__file__), "inspect360.db")

# Optional psycopg2 import for PostgreSQL/PostGIS
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False

import sqlite3

def get_db():
    """
    Returns an active database connection.
    Connects to PostgreSQL/PostGIS if configured; otherwise connects to SQLite3.
    """
    if USE_POSTGRES and PSYCOPG2_AVAILABLE:
        try:
            conn = psycopg2.connect(POSTGRES_URL, cursor_factory=RealDictCursor)
            return conn
        except Exception as e:
            print(f"[Inspect360 DB Warning] PostgreSQL connection failed ({e}), falling back to SQLite3.")
    
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great circle distance between two points in meters (Haversine formula)."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)

def generate_dossier_hash(data: dict) -> str:
    """Generate SHA-256 cryptographic seal for inspection dossier."""
    serialized = json.dumps(data, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode('utf-8')).hexdigest()

def verify_spatial_proximity(facility_id: str, current_lat: float, current_lng: float) -> Dict[str, Any]:
    """
    Verifies physical presence within cadastral boundary (150m default).
    Executes PostGIS ST_DWithin if connected to PostgreSQL; Haversine formula otherwise.
    """
    conn = get_db()
    cursor = conn.cursor()

    if USE_POSTGRES and PSYCOPG2_AVAILABLE and hasattr(conn, 'get_dsn_parameters'):
        # Native PostGIS Spatial Calculation
        query = """
        SELECT id, name, latitude, longitude, geofence_radius_meters,
               ST_Distance(geom, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography) as distance_meters,
               ST_DWithin(geom, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, geofence_radius_meters) as inside_geofence
        FROM facilities WHERE id = %s
        """
        cursor.execute(query, (current_lng, current_lat, current_lng, current_lat, facility_id))
        fac = cursor.fetchone()
        conn.close()
        if not fac:
            return {"error": "Facility not found"}
        
        distance = round(float(fac["distance_meters"]), 2)
        inside = bool(fac["inside_geofence"])
        radius = fac["geofence_radius_meters"] or 150
    else:
        # SQLite / Haversine Spatial Calculation
        cursor.execute("SELECT latitude, longitude, geofence_radius_meters, name FROM facilities WHERE id = ?", (facility_id,))
        fac = cursor.fetchone()
        conn.close()
        if not fac:
            return {"error": "Facility not found"}
        
        radius = fac["geofence_radius_meters"] or 150
        distance = calculate_haversine_distance(current_lat, current_lng, fac["latitude"], fac["longitude"])
        inside = distance <= radius

    return {
        "inside_geofence": inside,
        "distance_meters": distance,
        "geofence_radius_meters": radius,
        "facility_name": fac["name"],
        "status": "AUTHORIZED" if inside else "BREACH",
        "engine": "PostGIS ST_DWithin" if (USE_POSTGRES and PSYCOPG2_AVAILABLE) else "Haversine Engine"
    }

def init_db():
    """Initializes local tables and seeds baseline demonstration data."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS facilities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        scheme_id TEXT NOT NULL,
        scheme_name TEXT NOT NULL,
        category TEXT NOT NULL,
        district TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'Jharkhand',
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        geofence_radius_meters INTEGER DEFAULT 150,
        contact_person TEXT,
        contact_phone TEXT,
        approved_capacity INTEGER DEFAULT 100,
        current_enrollment INTEGER DEFAULT 85,
        risk_score REAL DEFAULT 2.5,
        cctv_enabled INTEGER DEFAULT 1,
        last_inspected_at TEXT
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inspectors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'PMU Field Officer',
        current_lat REAL NOT NULL,
        current_lng REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'Available',
        active_inspection_id TEXT,
        inspections_completed INTEGER DEFAULT 0
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inspections (
        id TEXT PRIMARY KEY,
        facility_id TEXT NOT NULL,
        facility_name TEXT NOT NULL,
        scheme_name TEXT NOT NULL,
        district TEXT NOT NULL,
        inspector_id TEXT NOT NULL,
        inspector_name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'Routine',
        scheduled_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        dispatch_token TEXT,
        assigned_lat REAL,
        assigned_lng REAL,
        submission_lat REAL,
        submission_lng REAL,
        geofence_distance_m REAL,
        geofence_verified INTEGER DEFAULT 0,
        reported_headcount INTEGER,
        cctv_verified_headcount INTEGER,
        hygiene_rating INTEGER DEFAULT 4,
        infrastructure_rating INTEGER DEFAULT 4,
        food_quality_rating INTEGER DEFAULT 4,
        staff_attendance_rating INTEGER DEFAULT 4,
        remarks TEXT,
        photo_url TEXT,
        signature_data TEXT,
        sha256_hash TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(facility_id) REFERENCES facilities(id),
        FOREIGN KEY(inspector_id) REFERENCES inspectors(id)
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS anomalies (
        id TEXT PRIMARY KEY,
        inspection_id TEXT,
        facility_name TEXT NOT NULL,
        type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'Medium',
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS grievances (
        id TEXT PRIMARY KEY,
        facility_id TEXT,
        facility_name TEXT NOT NULL,
        district TEXT NOT NULL,
        category TEXT NOT NULL,
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        photo_url TEXT,
        status TEXT NOT NULL DEFAULT 'Submitted',
        upvotes INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
    )
    """)

    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM facilities")
    row = cursor.fetchone()
    count = row[0] if isinstance(row, tuple) else (row['count'] if 'count' in row else row[list(row.keys())[0]])
    if count == 0:
        seed_data(conn)

    conn.close()

def seed_data(conn):
    cursor = conn.cursor()

    facilities_data = [
        ("FAC-JH-001", "Dr. Ambedkar Residential SC Boys Hostel", "SCH-01", "PM-AJAY Residential Facilities", "Residential Hostel", "Ranchi", "Jharkhand", 23.3441, 85.3096, 150, "R.K. Paswan", "+91 94311 00214", 120, 114, 1.8, 1, "2026-09-24T10:30:00Z"),
        ("FAC-JH-002", "Birsa Munda Post-Matric Tribal Girls Hostel", "SCH-02", "Post-Matric Scholarship & Hostels", "Tribal Hostel", "Ranchi", "Jharkhand", 23.3629, 85.3340, 150, "Sunita Soren", "+91 94311 88321", 150, 142, 2.1, 1, "2026-09-26T14:15:00Z"),
        ("FAC-JH-003", "Divyangjan Composite Regional Rehabilitation Centre (CRC)", "SCH-03", "SMILE & Divyang Empowerment", "Rehabilitation Centre", "Deoghar", "Jharkhand", 24.4826, 86.7001, 150, "Dr. Alok Verma", "+91 94313 44521", 80, 68, 4.2, 1, "2026-09-20T11:00:00Z"),
        ("FAC-JH-004", "Sanjivani Integrated De-Addiction Center (IRCA)", "SCH-04", "NAPDDR Substance Demand Reduction", "De-Addiction Centre", "Hazaribagh", "Jharkhand", 23.9937, 85.3647, 150, "Manoj Pandey", "+91 94314 99120", 60, 52, 3.8, 1, "2026-09-22T16:45:00Z"),
        ("FAC-JH-005", "Vridh Jan Seva Ashram (Senior Citizen Home)", "SCH-05", "Atal Vayo Abhyuday Yojana (AVAY)", "Senior Living", "Dhanbad", "Jharkhand", 23.7957, 86.4304, 150, "Mrs. Kalyani Devi", "+91 94312 33419", 90, 88, 1.4, 1, "2026-09-25T09:20:00Z"),
        ("FAC-JH-006", "Prerna Skill Training Centre for SC Youth", "SCH-06", "PM-DAKSH Skill Development", "Skill Training Centre", "Jamshedpur", "Jharkhand", 22.8046, 86.2029, 150, "Amitabh Ghosh", "+91 94317 11984", 100, 42, 4.6, 1, "2026-09-18T13:00:00Z"),
        ("FAC-JH-007", "Kasturba Gandhi Balika Residential Special School", "SCH-07", "PM-AJAY Special Schools", "Residential School", "Bokaro", "Jharkhand", 23.6693, 86.1511, 150, "Shanti Murmu", "+91 94315 77651", 200, 195, 1.2, 1, "2026-09-27T11:30:00Z"),
        ("FAC-JH-008", "Asha Deep Drug Treatment Centre", "SCH-04", "NAPDDR Substance Demand Reduction", "De-Addiction Centre", "Giridih", "Jharkhand", 24.1852, 86.3079, 150, "Dr. S.K. Sinha", "+91 94316 22091", 50, 48, 2.9, 1, "2026-09-21T15:10:00Z")
    ]
    cursor.executemany("INSERT INTO facilities VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", facilities_data)

    inspectors_data = [
        ("INS-001", "Vikram Sharma", "vikram.sharma@mosje.gov.in", "+91 98351 12345", "Senior Field PMU Officer", 23.3450, 85.3105, "On-Duty", "INSP-2026-091", 42),
        ("INS-002", "Neha Singh", "neha.singh@mosje.gov.in", "+91 98352 23456", "Regional Vigilance Inspector", 24.4840, 86.7020, "On-Site", "INSP-2026-092", 38),
        ("INS-003", "Rajesh Kumar", "rajesh.kumar@mosje.gov.in", "+91 98353 34567", "Special Audit Officer", 23.9920, 85.3630, "Available", None, 51),
        ("INS-004", "Priya Verma", "priya.verma@mosje.gov.in", "+91 98354 45678", "Field Compliance Officer", 22.8050, 86.2040, "En-Route", "INSP-2026-094", 29)
    ]
    cursor.executemany("INSERT INTO inspectors VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", inspectors_data)

    inspections_data = [
        ("INSP-2026-088", "FAC-JH-007", "Kasturba Gandhi Balika Residential Special School", "PM-AJAY Special Schools", "Bokaro", "INS-003", "Rajesh Kumar", "Routine", "2026-09-27", "Completed", "DISP-88-SECURE", 23.6693, 86.1511, 23.6692, 86.1512, 14.2, 1, 195, 194, 5, 5, 5, 5, "Excellent compliance. Clean kitchen, full student attendance, robust CCTV recordings.", "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='250'><rect width='400' height='250' fill='%231e293b'/><text x='20' y='40' fill='%2338bdf8' font-family='monospace' font-size='14'>[GEOTAG VERIFIED] Bokaro School</text></svg>", "SIG_VERIFIED_77651", "a8f5e13b8901234cde567890abcdef1234567890abcdef1234567890abcdef12", "2026-09-27T13:45:00Z", "2026-09-27T08:00:00Z"),
        ("INSP-2026-089", "FAC-JH-001", "Dr. Ambedkar Residential SC Boys Hostel", "PM-AJAY Residential Facilities", "Ranchi", "INS-001", "Vikram Sharma", "Surprise", "2026-09-24", "Completed", "DISP-89-RANDOM", 23.3441, 85.3096, 23.3442, 85.3095, 18.5, 1, 114, 112, 4, 4, 4, 4, "Surprise verification conducted. Verified biometric log and food stores. Safe drinking water certified.", "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='250'><rect width='400' height='250' fill='%230f172a'/><text x='20' y='40' fill='%2338bdf8' font-family='monospace' font-size='14'>[MOSJE FIELD PROOF] Ranchi Hostel</text></svg>", "SIG_VERIFIED_00214", "9c23d45e67890123456789abcdef0123456789abcdef0123456789abcdef0123", "2026-09-24T12:30:00Z", "2026-09-24T09:00:00Z"),
        ("INSP-2026-090", "FAC-JH-006", "Prerna Skill Training Centre for SC Youth", "PM-DAKSH Skill Development", "Jamshedpur", "INS-004", "Priya Verma", "Surprise", "2026-09-18", "Flagged", "DISP-90-RANDOM", 22.8046, 86.2029, 22.8090, 86.2070, 620.0, 0, 85, 42, 2, 2, 2, 2, "AI ANOMALY: Headcount disparity detected! Report claimed 85 trainees; AI CCTV count detected only 42 trainees present.", "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='250'><rect width='400' height='250' fill='%23450a0a'/><text x='20' y='40' fill='%23ef4444' font-family='monospace' font-size='14'>[DISCREPANCY FLAGGED]</text></svg>", "SIG_FLAGGED_11984", "e712a3456bcdef78901234567890abcdef1234567890abcdef1234567890abcd", "2026-09-18T15:20:00Z", "2026-09-18T10:00:00Z"),
        ("INSP-2026-091", "FAC-JH-002", "Birsa Munda Post-Matric Tribal Girls Hostel", "Post-Matric Scholarship & Hostels", "Ranchi", "INS-001", "Vikram Sharma", "Routine", "2026-09-28", "In Progress", "DISP-91-ACTIVE", 23.3629, 85.3340, None, None, None, 0, None, None, 4, 4, 4, 4, "Inspector on site conducting physical infrastructure and dining hall hygiene audit.", None, None, None, None, "2026-09-28T09:30:00Z"),
        ("INSP-2026-092", "FAC-JH-003", "Divyangjan Composite Regional Rehabilitation Centre (CRC)", "SMILE & Divyang Empowerment", "Deoghar", "INS-002", "Neha Singh", "Surprise", "2026-09-28", "In Progress", "DISP-92-SURPRISE", 24.4826, 86.7001, None, None, None, 0, None, None, 3, 3, 3, 3, "Surprise verification triggered by AI Randomizer. Officer validating prosthetic fitment inventory.", None, None, None, None, "2026-09-28T10:15:00Z"),
        ("INSP-2026-093", "FAC-JH-004", "Sanjivani Integrated De-Addiction Center (IRCA)", "NAPDDR Substance Demand Reduction", "Hazaribagh", "INS-003", "Rajesh Kumar", "Surprise", "2026-09-28", "Pending", "DISP-93-TOKEN", 23.9937, 85.3647, None, None, None, 0, None, None, 4, 4, 4, 4, "Surprise audit dispatched via AI Randomizer. Arrival deadline in 45 minutes.", None, None, None, None, "2026-09-28T14:00:00Z")
    ]
    cursor.executemany("INSERT INTO inspections VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", inspections_data)

    anomalies_data = [
        ("ANO-2026-01", "INSP-2026-090", "Prerna Skill Training Centre for SC Youth", "Beneficiary Headcount Discrepancy", "Critical", "Report claims 85 active enrolled trainees; AI CCTV analysis counted only 42 individuals.", "Active", "2026-09-18T15:20:00Z"),
        ("ANO-2026-02", "INSP-2026-090", "Prerna Skill Training Centre for SC Youth", "Geofence Perimeter Breach", "High", "Submission attempt recorded at 620m distance outside the cadastral 150m polygon.", "Active", "2026-09-18T14:40:00Z"),
        ("ANO-2026-03", None, "Divyangjan Composite Regional Rehabilitation Centre (CRC)", "Overdue Surprise Inspection", "Medium", "High-risk score (4.2) requires monthly unannounced audit. Last routine was 8 days past cycle.", "Investigating", "2026-09-27T08:00:00Z")
    ]
    cursor.executemany("INSERT INTO anomalies VALUES (?, ?, ?, ?, ?, ?, ?, ?)", anomalies_data)

    grievances_data = [
        ("GRV-101", "FAC-JH-001", "Dr. Ambedkar Residential SC Boys Hostel", "Ranchi", "Food & Nutrition", "Dinner Meal Quality Inadequate", "Meals served on Friday did not match the prescribed nutritional chart under PM-AJAY.", None, "Under Review", 8, "2026-09-25T19:30:00Z"),
        ("GRV-102", "FAC-JH-004", "Sanjivani Integrated De-Addiction Center (IRCA)", "Hazaribagh", "Medical Supplies", "Absence of Resident Medical Officer", "Resident physician was missing during weekend rounds as required by NAPDDR guidelines.", None, "Inspected", 14, "2026-09-23T11:20:00Z")
    ]
    cursor.executemany("INSERT INTO grievances VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", grievances_data)

    conn.commit()

if __name__ == "__main__":
    init_db()
    print("Inspect360 Database initialized. PostGIS Engine Ready.")
