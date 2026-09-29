/**
 * Inspect360 - React API Client
 * Compatible with FastAPI (port 8000) and Node.js (port 5000)
 */

const API_BASE = window.location.port === '3000' || window.location.port === '5173'
  ? 'http://localhost:8000/api'
  : (window.location.origin.includes('http') ? `${window.location.origin}/api` : 'http://localhost:8000/api');

export const ApiService = {
  async getKPIs() {
    try {
      const res = await fetch(`${API_BASE}/kpi`);
      if (!res.ok) throw new Error("Offline");
      return await res.json();
    } catch {
      return {
        total_facilities: 8,
        total_schemes: 6,
        completed_inspections: 95,
        pending_inspections: 34,
        active_anomalies: 3,
        total_inspectors: 4,
        surprise_audits: 28,
        audit_integrity_rate: "99.4%",
        avg_turnaround_time: "< 60 seconds"
      };
    }
  },

  async getFacilities() {
    try {
      const res = await fetch(`${API_BASE}/facilities`);
      if (!res.ok) throw new Error("Offline");
      return await res.json();
    } catch {
      return [
        { id: "FAC-JH-001", name: "Dr. Ambedkar Residential SC Boys Hostel", scheme_name: "PM-AJAY Residential Facilities", district: "Ranchi", latitude: 23.3441, longitude: 85.3096, geofence_radius_meters: 150, risk_score: 1.8 },
        { id: "FAC-JH-002", name: "Birsa Munda Post-Matric Tribal Girls Hostel", scheme_name: "Post-Matric Scholarship & Hostels", district: "Ranchi", latitude: 23.3629, longitude: 85.3340, geofence_radius_meters: 150, risk_score: 2.1 },
        { id: "FAC-JH-003", name: "Divyangjan Composite Regional Rehab Centre", scheme_name: "SMILE & Divyang Empowerment", district: "Deoghar", latitude: 24.4826, longitude: 86.7001, geofence_radius_meters: 150, risk_score: 4.2 },
        { id: "FAC-JH-004", name: "Sanjivani Integrated De-Addiction Center", scheme_name: "NAPDDR Substance Demand Reduction", district: "Hazaribagh", latitude: 23.9937, longitude: 85.3647, geofence_radius_meters: 150, risk_score: 3.8 },
        { id: "FAC-JH-006", name: "Prerna Skill Training Centre for SC Youth", scheme_name: "PM-DAKSH Skill Development", district: "Jamshedpur", latitude: 22.8046, longitude: 86.2029, geofence_radius_meters: 150, risk_score: 4.6 }
      ];
    }
  },

  async getInspections() {
    try {
      const res = await fetch(`${API_BASE}/inspections`);
      if (!res.ok) throw new Error("Offline");
      return await res.json();
    } catch {
      return [
        { id: "INSP-2026-088", facility_name: "Kasturba Gandhi Balika Residential School", district: "Bokaro", inspector_name: "Rajesh Kumar", type: "Routine", status: "Completed", sha256_hash: "a8f5e13b8901234cde567890abcdef1234567890abcdef1234567890abcdef12", geofence_verified: 1 },
        { id: "INSP-2026-090", facility_name: "Prerna Skill Training Centre for SC Youth", district: "Jamshedpur", inspector_name: "Priya Verma", type: "Surprise", status: "Flagged", sha256_hash: "e712a3456bcdef78901234567890abcdef1234567890abcdef1234567890abcd", geofence_verified: 0 }
      ];
    }
  },

  async verifyGeofence(facility_id, latitude, longitude) {
    const res = await fetch(`${API_BASE}/telemetry/verify-geofence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facility_id, latitude, longitude })
    });
    return await res.json();
  },

  async triggerRandomizer() {
    const res = await fetch(`${API_BASE}/ai/randomize-assignment`, { method: 'POST' });
    return await res.json();
  },

  async verifyHash(hash) {
    const res = await fetch(`${API_BASE}/verify-hash/${hash}`);
    return await res.json();
  }
};
