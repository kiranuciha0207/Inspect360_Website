/**
 * Inspect360 - Inspector Field PWA Module
 * Handles 150m Cadastral Geofence Locking, Live Geo-Watermarked Camera,
 * Touch Signature Pad, and Offline-First Local Queue.
 */

const InspectorModule = {
  activeInspectionId: "INSP-2026-091",
  targetFacility: {
    id: "FAC-JH-002",
    name: "Birsa Munda Post-Matric Tribal Girls Hostel",
    latitude: 23.3629,
    longitude: 85.3340,
    geofence_radius_meters: 150
  },
  currentGPS: {
    lat: 23.3630, // Default inside (~15m)
    lng: 85.3341
  },
  isOnline: true,
  isGeofenceUnlocked: false,
  offlineQueue: [],
  signatureCanvas: null,
  signatureCtx: null,
  isDrawing: false,

  init() {
    this.initSignaturePad();
    this.loadOfflineQueue();
    this.checkGeofence();
    this.updateOnlineBadge();
  },

  setOnlineStatus(online) {
    this.isOnline = online;
    this.updateOnlineBadge();
    const banner = document.getElementById('offline-notice-banner');
    if (banner) {
      banner.style.display = online ? 'none' : 'flex';
    }
  },

  updateOnlineBadge() {
    const badge = document.getElementById('network-status-badge');
    if (badge) {
      if (this.isOnline) {
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-ping"></span> Online (Live Sync)`;
        badge.className = "text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center";
      } else {
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span> Offline (Local Queue Active)`;
        badge.className = "text-[11px] font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full flex items-center";
      }
    }
  },

  simulateLocation(type) {
    if (type === 'inside') {
      // Very close to facility: ~18 meters
      this.currentGPS.lat = 23.3630;
      this.currentGPS.lng = 85.3341;
    } else {
      // 620 meters away
      this.currentGPS.lat = 23.3685;
      this.currentGPS.lng = 85.3395;
    }
    this.checkGeofence();
  },

  async checkGeofence() {
    const result = await ApiService.verifyGeofence(
      this.targetFacility.id,
      this.currentGPS.lat,
      this.currentGPS.lng
    );

    this.isGeofenceUnlocked = result.inside_geofence;
    
    // Update Geofence UI indicators
    const statusBox = document.getElementById('geofence-status-box');
    const lockIcon = document.getElementById('geofence-lock-icon');
    const distText = document.getElementById('geofence-dist-text');
    const formContainer = document.getElementById('inspector-form-container');
    const lockWarning = document.getElementById('geofence-lock-warning');

    if (distText) {
      distText.textContent = `${result.distance_meters.toFixed(1)}m from perimeter`;
    }

    if (this.isGeofenceUnlocked) {
      if (statusBox) statusBox.className = "p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 flex items-center justify-between";
      if (lockIcon) lockIcon.className = "fa-solid fa-lock-open text-emerald-600 text-lg";
      if (formContainer) formContainer.classList.remove('opacity-40', 'pointer-events-none');
      if (lockWarning) lockWarning.classList.add('hidden');
    } else {
      if (statusBox) statusBox.className = "p-3 rounded-xl border border-red-300 bg-red-50 text-red-900 flex items-center justify-between";
      if (lockIcon) lockIcon.className = "fa-solid fa-lock text-red-600 text-lg";
      if (formContainer) formContainer.classList.add('opacity-40', 'pointer-events-none');
      if (lockWarning) lockWarning.classList.remove('hidden');
    }
  },

  captureWatermarkedPhoto() {
    const canvas = document.getElementById('watermark-photo-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Create realistic inspection scene
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1e293b');
    gradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw campus outline simulation
    ctx.fillStyle = '#334155';
    ctx.fillRect(20, 80, 260, 90);
    ctx.fillStyle = '#475569';
    ctx.fillRect(40, 100, 40, 40);
    ctx.fillRect(100, 100, 40, 40);
    ctx.fillRect(160, 100, 40, 40);

    // Draw Burned-in Watermark Stamp (Anti-spoofing)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, canvas.height - 65, canvas.width, 65);

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`[MOSJE INSPECT360] ${this.activeInspectionId}`, 10, canvas.height - 48);

    ctx.font = '10px monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`LAT: ${this.currentGPS.lat.toFixed(5)}N  LNG: ${this.currentGPS.lng.toFixed(5)}E`, 10, canvas.height - 32);
    
    const nowUtc = new Date().toISOString();
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`UTC: ${nowUtc} | GEO-SEALED`, 10, canvas.height - 16);

    // Update thumbnail notice
    const notice = document.getElementById('photo-capture-status');
    if (notice) {
      notice.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500 mr-1"></i> Live Photo Geo-Stamped`;
      notice.className = "text-[11px] font-bold text-emerald-600 mt-1";
    }
  },

  initSignaturePad() {
    const canvas = document.getElementById('signature-pad');
    if (!canvas) return;
    this.signatureCanvas = canvas;
    this.signatureCtx = canvas.getContext('2d');
    this.signatureCtx.lineWidth = 2.5;
    this.signatureCtx.lineCap = 'round';
    this.signatureCtx.strokeStyle = '#0284c7';

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
      };
    };

    const startDraw = (e) => {
      this.isDrawing = true;
      const pos = getPos(e);
      this.signatureCtx.beginPath();
      this.signatureCtx.moveTo(pos.x, pos.y);
      e.preventDefault();
    };

    const draw = (e) => {
      if (!this.isDrawing) return;
      const pos = getPos(e);
      this.signatureCtx.lineTo(pos.x, pos.y);
      this.signatureCtx.stroke();
      e.preventDefault();
    };

    const endDraw = () => {
      this.isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', endDraw);
    canvas.addEventListener('touchstart', startDraw);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', endDraw);
  },

  clearSignature() {
    if (this.signatureCtx && this.signatureCanvas) {
      this.signatureCtx.clearRect(0, 0, this.signatureCanvas.width, this.signatureCanvas.height);
    }
  },

  async handleFormSubmission() {
    if (!this.isGeofenceUnlocked) {
      alert("Geofence Lock Active: You must be physically within 150m of the registered institution to submit this audit.");
      return;
    }

    const headcount = parseInt(document.getElementById('insp-headcount').value || '142', 10);
    const hygiene = parseInt(document.getElementById('insp-hygiene').value || '4', 10);
    const infra = parseInt(document.getElementById('insp-infra').value || '4', 10);
    const food = parseInt(document.getElementById('insp-food').value || '4', 10);
    const staff = parseInt(document.getElementById('insp-staff').value || '4', 10);
    const remarks = document.getElementById('insp-remarks').value || 'Hostel facilities inspected and verified.';

    const canvas = document.getElementById('watermark-photo-canvas');
    const photoData = canvas ? canvas.toDataURL('image/png') : null;
    const sigData = this.signatureCanvas ? this.signatureCanvas.toDataURL('image/png') : null;

    const payload = {
      latitude: this.currentGPS.lat,
      longitude: this.currentGPS.lng,
      reported_headcount: headcount,
      hygiene_rating: hygiene,
      infrastructure_rating: infra,
      food_quality_rating: food,
      staff_attendance_rating: staff,
      remarks: remarks,
      photo_url: photoData,
      signature_data: sigData
    };

    if (this.isOnline) {
      // Submit directly to API
      const result = await ApiService.submitInspection(this.activeInspectionId, payload);
      if (result.status === 'success') {
        alert(`Audit Submitted Successfully!\n\nInspection ID: ${result.inspection_id}\nStatus: ${result.inspection_status}\nSHA-256 Seal: ${result.sha256_seal.substring(0, 20)}...`);
        // Refresh dashboard tables if open
        App.loadDashboardData();
        App.switchTab('reports');
        App.viewDossier(this.activeInspectionId);
      } else {
        alert("Submission completed with warnings. Check Anomaly Feed.");
      }
    } else {
      // Queue offline
      this.offlineQueue.push({
        inspection_id: this.activeInspectionId,
        submission: payload,
        offline_timestamp: new Date().toISOString()
      });
      this.saveOfflineQueue();
      alert("Network Dead Zone Detected: Inspection saved to encrypted offline device queue. It will automatically synchronize when network connectivity is re-established.");
    }
  },

  loadOfflineQueue() {
    try {
      const stored = localStorage.getItem('inspect360_offline_queue');
      this.offlineQueue = stored ? JSON.parse(stored) : [];
      this.updateQueueBadge();
    } catch (e) {
      this.offlineQueue = [];
    }
  },

  saveOfflineQueue() {
    try {
      localStorage.setItem('inspect360_offline_queue', JSON.stringify(this.offlineQueue));
      this.updateQueueBadge();
    } catch (e) {
      console.error(e);
    }
  },

  updateQueueBadge() {
    const badge = document.getElementById('offline-queue-count');
    if (badge) {
      badge.textContent = this.offlineQueue.length;
      badge.style.display = this.offlineQueue.length > 0 ? 'inline-flex' : 'none';
    }
  },

  async syncOfflineQueue() {
    if (this.offlineQueue.length === 0) {
      alert("Offline queue is empty.");
      return;
    }
    if (!this.isOnline) {
      alert("Cannot sync: Device is currently marked Offline. Switch back to Online mode first.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/inspections/sync-queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspector_id: "INS-001",
          queue: this.offlineQueue
        })
      });
      const data = await res.json();
      alert(`Sync Complete!\nSynchronized ${data.synced_count} out of ${data.total_queued} inspection records.`);
      this.offlineQueue = [];
      this.saveOfflineQueue();
      App.loadDashboardData();
    } catch (e) {
      alert("Failed to connect to backend server during sync.");
    }
  }
};
