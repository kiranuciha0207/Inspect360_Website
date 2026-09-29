"""
Inspect360 - Application Launcher
Smart India Hackathon 2026 (SIH26095) - Ministry of Social Justice & Empowerment (MoSJE)
Team: Smart Inspect (AMP2026018)
"""

import sys
import os
import time
import webbrowser
import threading
import uvicorn

# UTF-8 Console Support for Windows PowerShell
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.dirname(__file__))

from backend.database import init_db

HOST = "127.0.0.1"
PORT = 8000
URL = f"http://localhost:{PORT}"

def open_browser():
    time.sleep(1.2)
    print(f"\n[LAUNCHER] Opening Inspect360 Platform in default browser at: {URL}")
    webbrowser.open(URL)

def print_banner():
    banner = f"""
================================================================================
  INSPECT360: SMART REAL-TIME MONITORING & VIGILANCE ECOSYSTEM
  Smart India Hackathon 2026 | Problem Statement: SIH26095
  Ministry of Social Justice & Empowerment (MoSJE) | Team: Smart Inspect
================================================================================
  [✓] Central PMU Real-Time Dashboard (KPIs, Risk heatmaps & Live Metrics)
  [✓] Inspector Field PWA Simulator (150m Cadastral Geofence, Camera, Signature)
  [✓] GIS Spatial Command Center (Leaflet, Dual Map Tiles & Inspector GPS)
  [✓] AI Anti-Collusion Surprise Audit Randomizer (Dynamic Risk Pairing)
  [✓] Real-Time CCTV Stream Monitoring & AI Headcount Corroboration
  [✓] Public Citizen Transparency & Whistleblower Portal with Upvoting
  [✓] Cryptographic SHA-256 Tamper-Proof Audit Dossiers
--------------------------------------------------------------------------------
  * Web Application URL: {URL}
  * Interactive API Docs: {URL}/docs
================================================================================
  Press Ctrl + C to stop the server.
"""
    print(banner)

def main():
    # 1. Initialize SQLite Database & Seeds
    init_db()

    # 2. Print Welcome Banner
    print_banner()

    # 3. Auto-open Web Browser
    threading.Thread(target=open_browser, daemon=True).start()

    # 4. Start Uvicorn ASGI Server
    uvicorn.run(
        "backend.server:app",
        host=HOST,
        port=PORT,
        log_level="info",
        reload=False
    )

if __name__ == "__main__":
    main()
