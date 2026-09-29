# Inspect360 | Smart Real-Time Monitoring & Inspection Ecosystem

> **Smart India Hackathon 2026 (SIH26095)**  
> **Theme:** Smart Automation | **Category:** Software  
> **Sponsoring Ministry:** Ministry of Social Justice & Empowerment (MoSJE)  
> **Team ID:** AMP2026018 | **Team Name:** Smart Inspect  

---

## 🏛️ Executive Summary

**Inspect360** is an enterprise-grade digital vigilance and real-time inspection ecosystem engineered specifically for the **Ministry of Social Justice & Empowerment (MoSJE)** under problem statement **SIH26095**. 

The platform replaces cumbersome, manual, paper-based inspection procedures with an end-to-end automated platform featuring **150m cadastral geofence locking**, **AI-driven anti-collusion surprise audit dispatch**, **live CCTV biometric and headcount corroboration**, **tamper-evident SHA-256 cryptographic dossier sealing**, and a **public citizen whistleblower portal with upvoting**.

---

## 🚀 Core Modules & Capabilities

1. **🏢 Central MoSJE PMU Command Dashboard**
   - Real-time KPIs (Total facilities, completed vs. pending audits, active AI anomalies, surprise inspections).
   - Dynamic bar charts tracking routine vs. surprise inspections.
   - Comprehensive audit registry with instant search, filtering, and CSV export.
   - Tamper-proof inspection dossier inspection modal with full audit trails.

2. **📱 Inspector Field PWA Simulator**
   - **150m Cadastral Geofence Lock:** Hardware-enforced submission lock preventing audits outside facility boundaries.
   - **Live Watermarked Camera:** Real-time canvas capturing tamper-proof photos with embedded coordinates, UTC timestamps, and inspection IDs.
   - **Digital Touch Signature Pad:** In-charge touch signature capture with undo and clear controls.
   - **Offline-First Synchronization:** Local encrypted queue allowing inspections in dead zones with one-click background sync.

3. **🗺️ GIS Spatial Command Map**
   - High-performance Leaflet engine with dual tiles (CartoDB Clean & OpenStreetMap).
   - Real-time plotting of registered welfare centers with 150m cadastral geofence circles color-coded by risk level.
   - Live telemetry tracking of field inspection officers (On-Duty, On-Site, En-Route, Available).

4. **🤖 AI Anti-Collusion Surprise Audit Randomizer**
   - Automated dynamic pairing of high-risk institutions with available field inspectors.
   - Cryptographic dispatch token generation with estimated arrival windows (ETAs) to prevent tip-offs and collusion.

5. **📹 Real-Time CCTV Stream Monitoring**
   - Integrated IP camera simulator for institutional common areas (dining halls, classrooms, workshops).
   - AI computer vision headcount comparison against claimed enrollment with automatic fraud discrepancy alerts.

6. **👥 Public Citizen Transparency & Whistleblower Portal**
   - Public inspection record verification using Inspection IDs or SHA-256 cryptographic hashes.
   - Community whistleblower report submission with photographic evidence and civic upvoting system.

---

## 📂 Project Architecture & Multi-Stack Ecosystem

```
Inspect360_Website/
├── backend/
│   ├── database.py             # PostGIS / PostgreSQL spatial adapter + SQLite fallback
│   ├── postgis_schema.sql      # Production PostGIS schema with GiST spatial indexes & triggers
│   ├── server.py               # FastAPI REST API with PostGIS ST_DWithin spatial endpoints
│   ├── test_api.py             # Automated end-to-end integration test suite (15/15 tests PASS)
│   └── node-server/
│       ├── package.json        # Node.js / Express backend dependencies
│       └── server.js           # Production Node.js + PostGIS REST API server
│
├── frontend/
│   ├── index.html              # Main responsive command portal shell
│   ├── js/                     # Modular vanilla frontend modules
│   └── react-app/              # Modern React 18 + Tailwind + Lucide Application
│       ├── package.json        # React 18 dependencies (Vite, Lucide, Leaflet)
│       ├── index.html          # React root HTML
│       └── src/
│           ├── App.jsx         # Complete React.js Vigilance Portal & Dashboard
│           ├── api.js          # React API service layer
│           └── main.jsx        # React DOM entry point
│
├── mobile/
│   ├── flutter_app/            # Flutter Cross-Platform PMU Field Inspector App
│   │   ├── pubspec.yaml        # Geolocator, Signature, Hive, Crypto dependencies
│   │   └── lib/main.dart       # Material 3 Inspector UI with 150m Geofencing & SHA-256 seal
│   └── react-native/           # React Native Expo Field Inspector App
│       ├── package.json        # Expo, AsyncStorage, Crypto-js dependencies
│       └── App.jsx             # React Native offline-first geofence & audit engine
│
├── docs/                       # SIH 2026 Presentation PPTX & Architecture diagrams
├── launcher.py                 # Multi-threaded server launcher & auto browser open
├── run.bat                     # Windows one-click batch launcher
└── README.md                   # System documentation
```

---

## 🛠️ Multi-Tech Implementation Breakdown

| Technology Layer | Files | Key Features & Implementation |
|---|---|---|
| **PostgreSQL + PostGIS** | `backend/postgis_schema.sql`<br>`backend/database.py` | • `GEOGRAPHY(Point, 4326)` columns & GiST spatial indexing<br>• `ST_DWithin` & `ST_Distance` 150m cadastral geofencing<br>• Automated triggers for geometry updates with SQLite fallback |
| **FastAPI (Python)** | `backend/server.py`<br>`backend/test_api.py` | • High-performance async REST API with Pydantic validation<br>• PostGIS spatial query endpoints (`/api/spatial/*`)<br>• Automated AI anti-collusion dispatch engine & 15/15 test suite |
| **Node.js + Express** | `backend/node-server/server.js`<br>`backend/node-server/package.json` | • Express REST API with `pg` PostGIS connection pool<br>• SHA-256 cryptographic seal generator & offline sync handler<br>• In-memory spatial fallback engine for zero-configuration testing |
| **React.js (Frontend)** | `frontend/react-app/src/App.jsx`<br>`frontend/react-app/src/api.js` | • React 18 responsive dashboard with Lucide icons & Tailwind<br>• Role-based switching (Ministry, Field Officer, Citizen)<br>• Real-time KPI cards, AI alert feeds, and SHA-256 dossier verifier |
| **Flutter (Mobile)** | `mobile/flutter_app/lib/main.dart`<br>`mobile/flutter_app/pubspec.yaml` | • Native mobile app with Material 3 government theme<br>• Hardware GPS geofencing via `geolocator`<br>• Touch signature canvas (`signature`) & offline queue |
| **React Native (Mobile)** | `mobile/react-native/App.jsx`<br>`mobile/react-native/package.json` | • Cross-platform Expo mobile unit<br>• Local offline queue in `AsyncStorage`<br>• Hardware lock and SHA-256 tamper-proof sealing |

---

## ⚡ Quick Start & Verification

### 1. Launch FastAPI Backend & Web Portal:
```bash
python launcher.py
```
Or double-click `run.bat`.

### 2. Run Automated API Tests:
```bash
python backend/test_api.py
```

### 3. Start Node.js / Express Backend:
```bash
cd backend/node-server
npm install
npm start
```

### 4. Run React.js Application:
```bash
cd frontend/react-app
npm install
npm run dev
```

### 5. Run Flutter Mobile App:
```bash
cd mobile/flutter_app
flutter pub get
flutter run
```


### 1. Launch the Application (One-Click)
Double-click [`run.bat`](file:///c:/Users/WIN%2011/OneDrive/Desktop/SIH/Inspect360_Website/run.bat) or execute from PowerShell:
```powershell
cd "c:\Users\WIN 11\OneDrive\Desktop\SIH\Inspect360_Website"
python launcher.py
```
- Web Application: **http://localhost:8000**
- Interactive Swagger API Docs: **http://localhost:8000/docs**

### 2. Run Automated Integration Tests
To execute all 15 automated validation checks:
```powershell
python backend/test_api.py
```
*(All 15 tests pass with 100% success).*
