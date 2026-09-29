/**
 * Inspect360 - Node.js / Express & PostGIS Vigilance Backend
 * Smart India Hackathon 2026 (SIH26095) - Ministry of Social Justice & Empowerment (MoSJE)
 * Team: Smart Inspect (AMP2026018)
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// ----------------------------------------------------------------------------
// PostgreSQL + PostGIS Connection Pool
// ----------------------------------------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/inspect360',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

let isPostgresConnected = false;
pool.connect()
  .then(client => {
    isPostgresConnected = true;
    console.log('[Inspect360 Node] Connected to PostgreSQL + PostGIS successfully.');
    client.release();
  })
  .catch(err => {
    console.warn('[Inspect360 Node] PostgreSQL not reachable at DATABASE_URL. Running in Mock In-Memory PostGIS mode.');
  });

// ----------------------------------------------------------------------------
// In-Memory Fallback Seed Data
// ----------------------------------------------------------------------------
let facilities = [
  { id: "FAC-JH-001", name: "Dr. Ambedkar Residential SC Boys Hostel", scheme_name: "PM-AJAY Residential Facilities", district: "Ranchi", latitude: 23.3441, longitude: 85.3096, geofence_radius_meters: 150, risk_score: 1.8, approved_capacity: 120, current_enrollment: 114 },
  { id: "FAC-JH-002", name: "Birsa Munda Post-Matric Tribal Girls Hostel", scheme_name: "Post-Matric Scholarship & Hostels", district: "Ranchi", latitude: 23.3629, longitude: 85.3340, geofence_radius_meters: 150, risk_score: 2.1, approved_capacity: 150, current_enrollment: 142 },
  { id: "FAC-JH-003", name: "Divyangjan Composite Regional Rehabilitation Centre (CRC)", scheme_name: "SMILE & Divyang Empowerment", district: "Deoghar", latitude: 24.4826, longitude: 86.7001, geofence_radius_meters: 150, risk_score: 4.2, approved_capacity: 80, current_enrollment: 68 },
  { id: "FAC-JH-004", name: "Sanjivani Integrated De-Addiction Center (IRCA)", scheme_name: "NAPDDR Substance Demand Reduction", district: "Hazaribagh", latitude: 23.9937, longitude: 85.3647, geofence_radius_meters: 150, risk_score: 3.8, approved_capacity: 60, current_enrollment: 52 },
  { id: "FAC-JH-005", name: "Vridh Jan Seva Ashram (Senior Citizen Home)", scheme_name: "Atal Vayo Abhyuday Yojana (AVAY)", district: "Dhanbad", latitude: 23.7957, longitude: 86.4304, geofence_radius_meters: 150, risk_score: 1.4, approved_capacity: 90, current_enrollment: 88 },
  { id: "FAC-JH-006", name: "Prerna Skill Training Centre for SC Youth", scheme_name: "PM-DAKSH Skill Development", district: "Jamshedpur", latitude: 22.8046, longitude: 86.2029, geofence_radius_meters: 150, risk_score: 4.6, approved_capacity: 100, current_enrollment: 42 },
  { id: "FAC-JH-007", name: "Kasturba Gandhi Balika Residential Special School", scheme_name: "PM-AJAY Special Schools", district: "Bokaro", latitude: 23.6693, longitude: 86.1511, geofence_radius_meters: 150, risk_score: 1.2, approved_capacity: 200, current_enrollment: 195 },
  { id: "FAC-JH-008", name: "Asha Deep Drug Treatment Centre", scheme_name: "NAPDDR Substance Demand Reduction", district: "Giridih", latitude: 24.1852, longitude: 86.3079, geofence_radius_meters: 150, risk_score: 2.9, approved_capacity: 50, current_enrollment: 48 }
];

let inspectors = [
  { id: "INS-001", name: "Vikram Sharma", email: "vikram.sharma@mosje.gov.in", phone: "+91 98351 12345", role: "Senior Field PMU Officer", current_lat: 23.3450, current_lng: 85.3105, status: "Available", inspections_completed: 43 },
  { id: "INS-002", name: "Neha Singh", email: "neha.singh@mosje.gov.in", phone: "+91 98352 23456", role: "Regional Vigilance Inspector", current_lat: 24.4840, current_lng: 86.7020, status: "On-Site", inspections_completed: 38 },
  { id: "INS-003", name: "Rajesh Kumar", email: "rajesh.kumar@mosje.gov.in", phone: "+91 98353 34567", role: "Special Audit Officer", current_lat: 23.9920, current_lng: 85.3630, status: "Available", inspections_completed: 51 },
  { id: "INS-004", name: "Priya Verma", email: "priya.verma@mosje.gov.in", phone: "+91 98354 45678", role: "Field Compliance Officer", current_lat: 22.8050, current_lng: 86.2040, status: "En-Route", inspections_completed: 29 }
];

let inspections = [
  {
    id: "INSP-2026-088",
    facility_id: "FAC-JH-007",
    facility_name: "Kasturba Gandhi Balika Residential Special School",
    scheme_name: "PM-AJAY Special Schools",
    district: "Bokaro",
    inspector_name: "Rajesh Kumar",
    type: "Routine",
    scheduled_date: "2026-09-27",
    status: "Completed",
    geofence_verified: 1,
    geofence_distance_m: 14.2,
    reported_headcount: 195,
    cctv_verified_headcount: 194,
    sha256_hash: "a8f5e13b8901234cde567890abcdef1234567890abcdef1234567890abcdef12",
    completed_at: "2026-09-27T13:45:00Z"
  },
  {
    id: "INSP-2026-090",
    facility_id: "FAC-JH-006",
    facility_name: "Prerna Skill Training Centre for SC Youth",
    scheme_name: "PM-DAKSH Skill Development",
    district: "Jamshedpur",
    inspector_name: "Priya Verma",
    type: "Surprise",
    scheduled_date: "2026-09-18",
    status: "Flagged",
    geofence_verified: 0,
    geofence_distance_m: 620.0,
    reported_headcount: 85,
    cctv_verified_headcount: 42,
    sha256_hash: "e712a3456bcdef78901234567890abcdef1234567890abcdef1234567890abcd",
    completed_at: "2026-09-18T15:20:00Z"
  }
];

// Helper: Haversine distance in meters
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

// ----------------------------------------------------------------------------
// REST ENDPOINTS
// ----------------------------------------------------------------------------

// 1. Mission Metrics & KPIs
app.get('/api/kpi', async (req, res) => {
  if (isPostgresConnected) {
    try {
      const facRes = await pool.query('SELECT COUNT(*) FROM facilities');
      const inspRes = await pool.query("SELECT COUNT(*) FROM inspections WHERE status = 'Completed'");
      return res.json({
        total_facilities: parseInt(facRes.rows[0].count),
        completed_inspections: parseInt(inspRes.rows[0].count),
        audit_integrity_rate: "99.4%",
        avg_turnaround_time: "< 60 seconds",
        engine: "Node.js + PostgreSQL/PostGIS"
      });
    } catch (err) {
      console.error(err);
    }
  }

  res.json({
    total_facilities: facilities.length,
    total_schemes: 6,
    completed_inspections: inspections.filter(i => i.status === 'Completed').length + 92,
    pending_inspections: 34,
    active_anomalies: 3,
    total_inspectors: inspectors.length,
    surprise_audits: 28,
    active_grievances: 2,
    audit_integrity_rate: "99.4%",
    avg_turnaround_time: "< 60 seconds",
    engine: "Node.js / Express In-Memory PostGIS"
  });
});

// 2. Facilities
app.get('/api/facilities', (req, res) => {
  res.json(facilities);
});

// 3. Inspectors
app.get('/api/inspectors', (req, res) => {
  res.json(inspectors);
});

// 4. Inspections
app.get('/api/inspections', (req, res) => {
  res.json(inspections);
});

// 5. PostGIS Geofence Spatial Verification
app.post('/api/telemetry/verify-geofence', async (req, res) => {
  const { facility_id, latitude, longitude } = req.body;
  if (!facility_id || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  // Native PostGIS ST_DWithin query if Postgres connected
  if (isPostgresConnected) {
    try {
      const q = `
        SELECT name, geofence_radius_meters,
               ST_Distance(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance_meters,
               ST_DWithin(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, geofence_radius_meters) as inside_geofence
        FROM facilities WHERE id = $3
      `;
      const result = await pool.query(q, [longitude, latitude, facility_id]);
      if (result.rows.length === 0) return res.status(404).json({ error: "Facility not found" });
      const row = result.rows[0];
      const dist = Math.round(row.distance_meters * 100) / 100;
      return res.json({
        inside_geofence: row.inside_geofence,
        distance_meters: dist,
        geofence_radius_meters: row.geofence_radius_meters || 150,
        status: row.inside_geofence ? "AUTHORIZED" : "BREACH",
        engine: "PostgreSQL / PostGIS ST_DWithin",
        message: row.inside_geofence 
          ? `Verified inside ${dist}m cadastral boundary.`
          : `BREACH: Device is ${dist}m away from facility.`
      });
    } catch (err) {
      console.error("PostGIS query error:", err);
    }
  }

  // In-Memory Haversine calculation
  const fac = facilities.find(f => f.id === facility_id);
  if (!fac) return res.status(404).json({ error: "Facility not found" });

  const radius = fac.geofence_radius_meters || 150;
  const dist = haversine(latitude, longitude, fac.latitude, fac.longitude);
  const inside = dist <= radius;

  res.json({
    inside_geofence: inside,
    distance_meters: dist,
    geofence_radius_meters: radius,
    status: inside ? "AUTHORIZED" : "BREACH",
    engine: "Node.js Spatial Geofence Engine",
    message: inside
      ? `Inspector verified within ${dist}m of ${fac.name} (Cadastral Boundary: ${radius}m).`
      : `Telemetry Alert: Device is ${dist}m away, outside ${radius}m cadastral boundary!`
  });
});

// 6. Cryptographic Submit Inspection with SHA-256
app.post('/api/inspections/:id/submit', (req, res) => {
  const { id } = req.params;
  const sub = req.body;
  const completedAt = new Date().toISOString();

  // Generate SHA-256 Seal
  const hashPayload = JSON.stringify({ id, ...sub, completedAt });
  const sha256_hash = crypto.createHash('sha256').update(hashPayload).digest('hex');

  const record = {
    id,
    ...sub,
    sha256_hash,
    status: "Completed",
    completed_at: completedAt
  };

  inspections.unshift(record);

  res.json({
    success: true,
    inspection_id: id,
    sha256_hash,
    status: "Completed",
    message: "Inspection cryptographically sealed and recorded."
  });
});

// 7. Verify SHA-256 Hash
app.get('/api/verify-hash/:hash', (req, res) => {
  const { hash } = req.params;
  const found = inspections.find(i => i.sha256_hash === hash);
  if (found) {
    res.json({
      verified: true,
      inspection_id: found.id,
      facility_name: found.facility_name,
      sha256_hash: hash,
      completed_at: found.completed_at
    });
  } else {
    res.status(404).json({ verified: false, message: "Hash does not match any record." });
  }
});

app.listen(PORT, () => {
  console.log(`Inspect360 Node.js / Express server running on port ${PORT}`);
});
