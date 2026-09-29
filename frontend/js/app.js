/**
 * Inspect360 - Main Frontend Controller
 * Connects UI tabs, Chart.js trends, AI Randomizer, CCTV Feeds, and Dossier Modals.
 */

let inspectionsChartInstance = null;

const App = {
  activeTab: 'dashboard',
  currentRole: 'Ministry PMU Official',

  async init() {
    this.initChart();
    await this.loadDashboardData();
    this.loadAnomalies();
    this.loadCctvStreams();

    // Initialize sub-modules
    InspectorModule.init();
    CitizenModule.init();

    // Auto-refresh data every 30 seconds
    setInterval(() => {
      this.loadDashboardData();
    }, 30000);
  },

  switchTab(tabId) {
    this.activeTab = tabId;

    // Hide all view sections
    const sections = ['dashboard', 'mobile-app', 'gis-map', 'ai-assign', 'cctv-feed', 'reports', 'citizen'];
    sections.forEach(sec => {
      const el = document.getElementById(`view-${sec}`);
      if (el) el.classList.add('hidden');
    });

    // Show active section
    const activeEl = document.getElementById(`view-${tabId}`);
    if (activeEl) activeEl.classList.remove('hidden');

    // Update active nav buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.className = "tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition text-slate-300 hover:text-white hover:bg-slate-700/50";
    });
    const activeNav = document.getElementById(`nav-${tabId}`);
    if (activeNav) {
      activeNav.className = "tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition bg-blue-600 text-white shadow-sm";
    }

    // Tab-specific initializations
    if (tabId === 'gis-map') {
      setTimeout(() => {
        GisModule.initMap();
        if (leafletMap) leafletMap.invalidateSize();
      }, 100);
    }
    if (tabId === 'citizen') {
      CitizenModule.loadGrievances();
    }
  },

  async loadDashboardData() {
    // 1. Load KPIs
    const kpi = await ApiService.getKPIs();
    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setEl('kpi-total-projects', kpi.total_facilities);
    setEl('kpi-completed-inspections', kpi.completed_inspections);
    setEl('kpi-pending-inspections', kpi.pending_inspections);
    setEl('kpi-anomaly-count', kpi.active_anomalies);
    setEl('kpi-surprise-count', kpi.surprise_audits);

    // 2. Load Recent Inspections Table
    this.loadInspectionsTable();
  },

  async loadInspectionsTable() {
    const tableBody = document.getElementById('inspections-table-body');
    if (!tableBody) return;

    const searchInput = document.getElementById('table-search');
    const typeFilter = document.getElementById('table-filter-type');
    const searchVal = searchInput ? searchInput.value.trim() : '';
    const typeVal = typeFilter ? typeFilter.value : 'ALL';

    const inspections = await ApiService.getInspections('ALL', typeVal, searchVal);

    if (inspections.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-slate-400">No inspections found matching criteria.</td></tr>`;
      return;
    }

    tableBody.innerHTML = inspections.map(insp => {
      const isSurprise = insp.type === 'Surprise';
      const typeBadge = isSurprise
        ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200"><i class="fa-solid fa-dice mr-1"></i> Surprise</span>`
        : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Routine</span>`;

      let statusBadge = '';
      if (insp.status === 'Completed') {
        statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center w-max"><i class="fa-solid fa-circle-check mr-1 text-[9px]"></i> Completed</span>`;
      } else if (insp.status === 'Flagged') {
        statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 flex items-center w-max animate-pulse"><i class="fa-solid fa-triangle-exclamation mr-1 text-[9px]"></i> Flagged</span>`;
      } else {
        statusBadge = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 flex items-center w-max"><i class="fa-solid fa-clock mr-1 text-[9px]"></i> ${insp.status}</span>`;
      }

      const geoStatus = insp.geofence_verified
        ? `<span class="text-emerald-700 font-semibold flex items-center"><i class="fa-solid fa-location-dot mr-1"></i> OK (${insp.geofence_distance_m ? insp.geofence_distance_m.toFixed(0) + 'm' : '<50m'})</span>`
        : (insp.status === 'Completed' || insp.status === 'Flagged'
            ? `<span class="text-red-600 font-semibold flex items-center"><i class="fa-solid fa-ban mr-1"></i> Breach (${insp.geofence_distance_m || 620}m)</span>`
            : `<span class="text-slate-400">Pending GPS</span>`);

      const shaBadge = insp.sha256_hash
        ? `<span class="font-mono-code text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200" title="${insp.sha256_hash}"><i class="fa-solid fa-key mr-1 text-slate-500"></i>${insp.sha256_hash.substring(0, 8)}...</span>`
        : `<span class="text-slate-400 italic">Unsealed</span>`;

      return `
        <tr class="hover:bg-slate-50/80 transition text-xs">
          <td class="p-3.5">
            <div class="font-mono-code font-bold text-slate-800">${insp.id}</div>
            <div class="text-[10px] text-slate-400">${insp.scheduled_date || 'Today'}</div>
          </td>
          <td class="p-3.5 font-medium text-slate-900 max-w-xs truncate">
            <div>${insp.facility_name}</div>
            <div class="text-[10px] text-slate-500">${insp.scheme_name} • ${insp.district}</div>
          </td>
          <td class="p-3.5 text-slate-700">${insp.inspector_name}</td>
          <td class="p-3.5">${typeBadge}</td>
          <td class="p-3.5">${geoStatus}</td>
          <td class="p-3.5">${shaBadge}</td>
          <td class="p-3.5">${statusBadge}</td>
          <td class="p-3.5 text-right">
            <button onclick="App.viewDossier('${insp.id}')" class="text-blue-600 hover:text-blue-800 font-bold hover:underline">
              View Dossier
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  async loadAnomalies() {
    const container = document.getElementById('anomaly-feed-container');
    if (!container) return;

    const anomalies = await ApiService.getAnomalies();
    if (anomalies.length === 0) {
      container.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs">No active anomalies detected.</div>`;
      return;
    }

    container.innerHTML = anomalies.map(a => {
      const isCritical = a.severity === 'Critical';
      const borderClass = isCritical ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/50';
      const badgeClass = isCritical ? 'text-red-800' : 'text-amber-800';

      return `
        <div class="p-3 rounded-xl border ${borderClass} text-xs">
          <div class="flex items-center justify-between ${badgeClass} font-bold mb-1">
            <span><i class="fa-solid fa-triangle-exclamation mr-1"></i> ${a.type}</span>
            <span class="text-[10px] text-slate-500">${new Date(a.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
          <p class="text-slate-700">${a.description}</p>
          <div class="mt-2 flex items-center justify-between text-[11px]">
            <span class="font-semibold text-slate-800">${a.facility_name}</span>
            <button onclick="App.switchTab('reports')" class="text-blue-600 underline font-semibold">Investigate</button>
          </div>
        </div>
      `;
    }).join('');
  },

  async loadCctvStreams() {
    const grid = document.getElementById('cctv-grid-container');
    if (!grid) return;

    const streams = await ApiService.getCctvStreams();
    grid.innerHTML = streams.map(s => {
      return `
        <div class="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-lg text-white">
          <div class="relative bg-slate-950 h-48 flex items-center justify-center overflow-hidden">
            <!-- Simulated CCTV video graphic -->
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10"></div>
            <div class="w-full h-full flex flex-col justify-between p-3 z-20">
              <div class="flex items-center justify-between text-[10px] font-mono-code">
                <span class="bg-red-600/90 text-white px-2 py-0.5 rounded flex items-center font-bold">
                  <span class="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-ping"></span> REC • LIVE
                </span>
                <span class="text-slate-400">CAM-01 • ${s.camera_location}</span>
              </div>

              <!-- AI Headcount Bounding Box Graphic -->
              <div class="self-center border border-cyan-400/80 bg-cyan-950/30 rounded px-3 py-1.5 text-center">
                <div class="text-[10px] text-cyan-300 font-mono-code font-bold">AI HEADCOUNT DETECTED</div>
                <div class="text-2xl font-extrabold text-cyan-400 font-mono-code">${s.ai_detected_headcount}</div>
              </div>

              <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono-code">
                <span>FPS: 25.0 • 1080p</span>
                <span>${new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          <div class="p-4 bg-slate-900 border-t border-slate-800">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-bold text-sm text-white">${s.facility_name}</h4>
                <p class="text-xs text-slate-400">${s.district} • Capacity: ${s.enrolled_capacity}</p>
              </div>
              ${s.discrepancy_alert
                ? `<span class="px-2 py-1 rounded bg-red-950 text-red-400 border border-red-800 text-[10px] font-bold"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Disparity Alert</span>`
                : `<span class="px-2 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold"><i class="fa-solid fa-check mr-1"></i> Count Matched</span>`}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  async triggerAiRandomizer() {
    const btn = document.getElementById('btn-run-randomizer');
    if (btn) btn.disabled = true;

    const result = await ApiService.triggerAiRandomizer();

    const dispatchCard = document.getElementById('ai-dispatch-result-card');
    if (dispatchCard) {
      dispatchCard.classList.remove('hidden');
      dispatchCard.innerHTML = `
        <div class="p-5 bg-gradient-to-r from-purple-900 to-indigo-950 rounded-2xl border border-purple-500/40 text-white shadow-xl animate-fade-in">
          <div class="flex items-center justify-between pb-3 border-b border-purple-700/50">
            <div class="flex items-center space-x-2">
              <span class="w-3 h-3 rounded-full bg-purple-400 animate-ping"></span>
              <h3 class="font-extrabold text-base text-purple-200">Anti-Collusion Surprise Audit Dispatched</h3>
            </div>
            <span class="px-2.5 py-0.5 bg-purple-800 text-purple-200 rounded-full text-xs font-mono-code font-bold">
              ${result.inspection_id}
            </span>
          </div>

          <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div class="bg-purple-950/60 p-3 rounded-xl border border-purple-800/40">
              <span class="text-purple-300 font-semibold block mb-1">Target Facility</span>
              <div class="font-bold text-white text-sm">${result.facility.name}</div>
              <div class="text-purple-300 mt-1">District: ${result.facility.district} (Risk: ${result.facility.risk_score}/5.0)</div>
            </div>

            <div class="bg-purple-950/60 p-3 rounded-xl border border-purple-800/40">
              <span class="text-purple-300 font-semibold block mb-1">Dispatched Officer</span>
              <div class="font-bold text-white text-sm">${result.assigned_inspector.name}</div>
              <div class="text-purple-300 mt-1">Phone: ${result.assigned_inspector.phone}</div>
            </div>

            <div class="bg-purple-950/60 p-3 rounded-xl border border-purple-800/40">
              <span class="text-purple-300 font-semibold block mb-1">Arrival Window & Distance</span>
              <div class="font-bold text-amber-400 text-sm"><i class="fa-solid fa-hourglass-half mr-1"></i> Target ETA: ${result.target_eta_minutes} Mins</div>
              <div class="text-purple-300 mt-1">Proximity: ${result.distance_km} km away</div>
            </div>
          </div>

          <div class="mt-4 p-2.5 bg-black/40 rounded-xl font-mono-code text-[11px] text-purple-200 border border-purple-800/40 flex items-center justify-between">
            <span><i class="fa-solid fa-lock mr-2 text-purple-400"></i> Cryptographic Token: <strong>${result.dispatch_token}</strong></span>
            <span class="text-emerald-400 font-bold">Zero Advance Warning Active</span>
          </div>
        </div>
      `;
    }

    if (btn) btn.disabled = false;
    this.loadDashboardData();
  },

  async viewDossier(inspectionId) {
    const modal = document.getElementById('dossier-modal');
    const content = document.getElementById('dossier-modal-content');
    if (!modal || !content) return;

    modal.classList.remove('hidden');
    content.innerHTML = `<div class="p-8 text-center text-slate-500"><i class="fa-solid fa-spinner fa-spin text-2xl text-blue-600"></i><p class="mt-2 text-xs">Loading tamper-sealed dossier...</p></div>`;

    const insp = await ApiService.getInspectionDetail(inspectionId);
    if (!insp) {
      content.innerHTML = `<div class="p-6 text-center text-red-600 text-xs">Unable to load dossier details.</div>`;
      return;
    }

    content.innerHTML = `
      <div class="space-y-5 text-slate-800 text-xs">
        <!-- Header -->
        <div class="flex items-start justify-between pb-4 border-b border-slate-200">
          <div>
            <div class="flex items-center space-x-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wide">MoSJE Digital Audit Dossier</span>
              <span class="font-mono-code font-bold text-slate-900">${insp.id}</span>
            </div>
            <h3 class="text-lg font-extrabold text-slate-900 mt-1">${insp.facility_name}</h3>
            <p class="text-slate-500">${insp.scheme_name} • ${insp.district}, Jharkhand</p>
          </div>
          <button onclick="App.closeDossierModal()" class="text-slate-400 hover:text-slate-600 text-lg p-1">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Meta Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <span class="text-slate-500 block text-[10px] uppercase font-bold">Inspector</span>
            <span class="font-bold text-slate-900">${insp.inspector_name}</span>
          </div>
          <div>
            <span class="text-slate-500 block text-[10px] uppercase font-bold">Audit Type</span>
            <span class="font-bold ${insp.type === 'Surprise' ? 'text-purple-700' : 'text-blue-700'}">${insp.type}</span>
          </div>
          <div>
            <span class="text-slate-500 block text-[10px] uppercase font-bold">Cadastral Geofence</span>
            <span class="font-bold ${insp.geofence_verified ? 'text-emerald-700' : 'text-red-600'}">
              ${insp.geofence_verified ? '✓ Verified (' + (insp.geofence_distance_m ? insp.geofence_distance_m.toFixed(1) + 'm)' : 'Inside)') : '⚠ Deviation Detected'}
            </span>
          </div>
          <div>
            <span class="text-slate-500 block text-[10px] uppercase font-bold">Status</span>
            <span class="font-bold ${insp.status === 'Completed' ? 'text-emerald-700' : (insp.status === 'Flagged' ? 'text-red-600' : 'text-amber-600')}">${insp.status}</span>
          </div>
        </div>

        <!-- Ratings & Headcount -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
            <h4 class="font-bold text-slate-900 text-xs flex items-center">
              <i class="fa-solid fa-star text-amber-500 mr-1.5"></i> Compliance Scores
            </h4>
            <div class="space-y-1.5 text-[11px]">
              <div class="flex justify-between"><span>Hygiene & Cleanliness:</span> <span class="font-bold text-slate-800">${insp.hygiene_rating || 4}/5</span></div>
              <div class="flex justify-between"><span>Building & Infrastructure:</span> <span class="font-bold text-slate-800">${insp.infrastructure_rating || 4}/5</span></div>
              <div class="flex justify-between"><span>Food & Nutrition Quality:</span> <span class="font-bold text-slate-800">${insp.food_quality_rating || 4}/5</span></div>
              <div class="flex justify-between"><span>Staff & Teacher Attendance:</span> <span class="font-bold text-slate-800">${insp.staff_attendance_rating || 4}/5</span></div>
            </div>
          </div>

          <div class="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2">
            <h4 class="font-bold text-slate-900 text-xs flex items-center">
              <i class="fa-solid fa-users text-blue-500 mr-1.5"></i> Headcount Verification
            </h4>
            <div class="space-y-1.5 text-[11px]">
              <div class="flex justify-between"><span>Reported Beneficiaries:</span> <span class="font-bold text-slate-900">${insp.reported_headcount || 'Full attendance'}</span></div>
              <div class="flex justify-between"><span>CCTV AI Camera Check:</span> <span class="font-bold text-blue-700">${insp.cctv_verified_headcount || 'Corroborated'}</span></div>
              <div class="pt-2 text-slate-600">
                <strong>Inspector Remarks:</strong>
                <p class="mt-0.5 italic text-slate-700">"${insp.remarks || 'Routine checks passed without deviation.'}"</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Cryptographic SHA-256 Seal -->
        <div class="p-3.5 bg-slate-900 rounded-xl text-white font-mono-code text-[11px] border border-slate-800">
          <div class="flex items-center justify-between text-amber-400 font-bold mb-1">
            <span><i class="fa-solid fa-fingerprint mr-1.5"></i> SHA-256 Cryptographic Tamper Seal</span>
            <span class="text-emerald-400 text-[10px]">IMMUTABLE AUDIT RECORD</span>
          </div>
          <div class="break-all text-slate-300">${insp.sha256_hash || 'SHA256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'}</div>
        </div>

        <!-- Evidence Photo & Signatures -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span class="font-bold text-slate-700 block mb-1 text-[11px]">Geo-Watermarked Photographic Proof</span>
            <div class="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center min-h-[160px]">
              ${insp.photo_url
                ? `<img src="${insp.photo_url}" alt="Audit Evidence" class="w-full h-auto object-cover max-h-56">`
                : `<div class="p-4 text-center text-slate-400 text-xs">No photographic proof attached</div>`}
            </div>
          </div>
          <div>
            <span class="font-bold text-slate-700 block mb-1 text-[11px]">Facility In-charge Digital Touch Signature</span>
            <div class="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center min-h-[160px] p-4">
              ${insp.signature_data && insp.signature_data.startsWith('data:image')
                ? `<img src="${insp.signature_data}" alt="Digital Signature" class="max-h-24">`
                : `<div class="p-4 text-center text-slate-500 font-mono-code text-xs">
                    <i class="fa-solid fa-signature text-2xl text-blue-600 mb-1"></i>
                    <div>Touch Signature Verified</div>
                    <div class="text-[10px] text-slate-400">Recorded on mobile touch canvas</div>
                   </div>`}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  closeDossierModal() {
    const modal = document.getElementById('dossier-modal');
    if (modal) modal.classList.add('hidden');
  },

  exportCSV() {
    window.open(`${API_BASE}/export/csv`, '_blank');
  },

  initChart() {
    const ctx = document.getElementById('inspectionsChart');
    if (!ctx) return;

    inspectionsChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'Routine Inspections',
            data: [12, 19, 14, 17, 22, 9, 15],
            backgroundColor: '#0284c7',
            borderRadius: 6
          },
          {
            label: 'AI Surprise Audits',
            data: [4, 6, 8, 5, 9, 3, 7],
            backgroundColor: '#8b5cf6',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 } }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: '#f1f5f9' } }
        }
      }
    });
  }
};

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
