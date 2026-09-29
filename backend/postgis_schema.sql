-- ============================================================================
-- Inspect360 - PostgreSQL + PostGIS Spatial Schema & Migrations
-- Smart India Hackathon 2026 (SIH26095) - Ministry of Social Justice & Empowerment
-- Team: Smart Inspect (AMP2026018)
-- ============================================================================

-- 1. Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Facilities / Welfare Institutions Table with PostGIS Geography Point
CREATE TABLE IF NOT EXISTS facilities (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    scheme_id VARCHAR(50) NOT NULL,
    scheme_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL DEFAULT 'Jharkhand',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    -- PostGIS Native Spatial Column (WGS84 EPSG:4326 Geography)
    geom GEOGRAPHY(Point, 4326),
    geofence_radius_meters INTEGER DEFAULT 150,
    contact_person VARCHAR(150),
    contact_phone VARCHAR(50),
    approved_capacity INTEGER DEFAULT 100,
    current_enrollment INTEGER DEFAULT 85,
    risk_score DOUBLE PRECISION DEFAULT 2.5,
    cctv_enabled BOOLEAN DEFAULT TRUE,
    last_inspected_at TIMESTAMPTZ
);

-- Spatial GiST Index for sub-millisecond geofence proximity searches
CREATE INDEX IF NOT EXISTS idx_facilities_geom ON facilities USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_facilities_district ON facilities (district);
CREATE INDEX IF NOT EXISTS idx_facilities_risk_score ON facilities (risk_score DESC);

-- 3. PMU Field Inspectors with Real-time GPS Telemetry
CREATE TABLE IF NOT EXISTS inspectors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    role VARCHAR(100) NOT NULL DEFAULT 'PMU Field Officer',
    current_lat DOUBLE PRECISION NOT NULL,
    current_lng DOUBLE PRECISION NOT NULL,
    current_geom GEOGRAPHY(Point, 4326),
    status VARCHAR(50) NOT NULL DEFAULT 'Available', -- 'Available', 'On-Site', 'En-Route', 'On-Duty'
    active_inspection_id VARCHAR(50),
    inspections_completed INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspectors_geom ON inspectors USING GIST (current_geom);

-- 4. Audit & Inspection Dossiers Table
CREATE TABLE IF NOT EXISTS inspections (
    id VARCHAR(50) PRIMARY KEY,
    facility_id VARCHAR(50) REFERENCES facilities(id),
    facility_name VARCHAR(255) NOT NULL,
    scheme_name VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    inspector_id VARCHAR(50) REFERENCES inspectors(id),
    inspector_name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'Routine', -- 'Routine', 'Surprise', 'Emergency'
    scheduled_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'In Progress', 'Completed', 'Flagged'
    dispatch_token VARCHAR(100),
    assigned_lat DOUBLE PRECISION,
    assigned_lng DOUBLE PRECISION,
    submission_lat DOUBLE PRECISION,
    submission_lng DOUBLE PRECISION,
    submission_geom GEOGRAPHY(Point, 4326),
    geofence_distance_m DOUBLE PRECISION,
    geofence_verified BOOLEAN DEFAULT FALSE,
    reported_headcount INTEGER,
    cctv_verified_headcount INTEGER,
    hygiene_rating INTEGER DEFAULT 4,
    infrastructure_rating INTEGER DEFAULT 4,
    food_quality_rating INTEGER DEFAULT 4,
    staff_attendance_rating INTEGER DEFAULT 4,
    remarks TEXT,
    photo_url TEXT,
    signature_data TEXT,
    sha256_hash VARCHAR(64),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inspections_submission_geom ON inspections USING GIST (submission_geom);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections (status);
CREATE INDEX IF NOT EXISTS idx_inspections_sha256 ON inspections (sha256_hash);

-- 5. AI Anomalies & Vigilance Alerts
CREATE TABLE IF NOT EXISTS anomalies (
    id VARCHAR(50) PRIMARY KEY,
    inspection_id VARCHAR(50) REFERENCES inspections(id),
    facility_name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Critical'
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Active', -- 'Active', 'Investigating', 'Resolved'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Citizen Grievances & Whistleblower Reports
CREATE TABLE IF NOT EXISTS grievances (
    id VARCHAR(50) PRIMARY KEY,
    facility_id VARCHAR(50) REFERENCES facilities(id),
    facility_name VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Submitted',
    upvotes INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PostGIS Helper Trigger: Automatically Populate GEOGRAPHY Point on Insert/Update
-- ============================================================================
CREATE OR REPLACE FUNCTION update_facility_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_facility_geom ON facilities;
CREATE TRIGGER trg_facility_geom
BEFORE INSERT OR UPDATE ON facilities
FOR EACH ROW EXECUTE FUNCTION update_facility_geom();

CREATE OR REPLACE FUNCTION update_inspector_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.current_geom := ST_SetSRID(ST_MakePoint(NEW.current_lng, NEW.current_lat), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inspector_geom ON inspectors;
CREATE TRIGGER trg_inspector_geom
BEFORE INSERT OR UPDATE ON inspectors
FOR EACH ROW EXECUTE FUNCTION update_inspector_geom();

-- ============================================================================
-- PostGIS Spatial Query Functions (Sample Execution)
-- ============================================================================
-- 1. Check if an inspector is within cadastral boundary (150m) of a facility:
-- SELECT id, name, ST_Distance(geom, ST_SetSRID(ST_MakePoint(85.3095, 23.3442), 4326)::geography) AS distance_meters,
--        ST_DWithin(geom, ST_SetSRID(ST_MakePoint(85.3095, 23.3442), 4326)::geography, geofence_radius_meters) AS inside_geofence
-- FROM facilities WHERE id = 'FAC-JH-001';

-- 2. Find closest available inspector to a given facility coordinates:
-- SELECT i.id, i.name, i.phone, ST_Distance(i.current_geom, ST_SetSRID(ST_MakePoint(85.3096, 23.3441), 4326)::geography) AS distance_m
-- FROM inspectors i WHERE i.status = 'Available'
-- ORDER BY i.current_geom <-> ST_SetSRID(ST_MakePoint(85.3096, 23.3441), 4326)::geography
-- LIMIT 1;
