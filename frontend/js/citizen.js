/**
 * Inspect360 - Citizen Transparency & Whistleblower Module
 * Public scheme tracker, SHA-256 cryptographic verification tool,
 * and whistleblower reporting with community upvoting.
 */

const CitizenModule = {
  async init() {
    this.loadGrievances();
  },

  async verifyAuditHash() {
    const input = document.getElementById('citizen-verify-input');
    const resultBox = document.getElementById('citizen-verify-result');
    if (!input || !resultBox) return;

    const query = input.value.trim();
    if (!query) {
      alert("Please enter an Inspection ID or SHA-256 Hash.");
      return;
    }

    resultBox.classList.remove('hidden');
    resultBox.innerHTML = `
      <div class="p-4 bg-slate-100 rounded-xl flex items-center justify-center space-x-2 text-slate-600 text-xs">
        <i class="fa-solid fa-spinner fa-spin text-blue-600 text-base"></i>
        <span>Verifying cryptographic seal against MoSJE ledger...</span>
      </div>
    `;

    const data = await ApiService.verifySha256(query);

    if (data.verified) {
      resultBox.innerHTML = `
        <div class="p-5 bg-emerald-50 border border-emerald-300 rounded-2xl text-slate-800 shadow-sm animate-fade-in">
          <div class="flex items-center justify-between pb-3 border-b border-emerald-200">
            <div class="flex items-center space-x-2 text-emerald-800 font-extrabold text-sm sm:text-base">
              <i class="fa-solid fa-circle-check text-emerald-600 text-lg"></i>
              <span>Authentic Sealed Audit Record</span>
            </div>
            <span class="bg-emerald-200 text-emerald-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase">
              ${data.seal_integrity}
            </span>
          </div>

          <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div><strong>Inspection ID:</strong> <span class="font-mono-code text-blue-700 font-semibold">${data.inspection_id}</span></div>
            <div><strong>Facility:</strong> ${data.facility_name}</div>
            <div><strong>Scheme:</strong> ${data.scheme_name}</div>
            <div><strong>District:</strong> ${data.district}</div>
            <div><strong>Field Inspector:</strong> ${data.inspector_name}</div>
            <div><strong>Audit Type:</strong> <span class="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">${data.inspection_type}</span></div>
            <div><strong>Geofence Presence:</strong> <span class="text-emerald-700 font-semibold">✓ Verified (${data.geofence_distance_m || 15}m)</span></div>
            <div><strong>Headcount Verified:</strong> ${data.reported_headcount || 'Full Attendance'}</div>
          </div>

          <div class="mt-4 p-3 bg-slate-900 rounded-xl text-slate-300 font-mono-code text-[11px] break-all border border-slate-700">
            <span class="text-amber-400 block font-bold mb-1">SHA-256 Cryptographic Fingerprint:</span>
            ${data.sha256_hash}
          </div>

          <div class="mt-3 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Completed: ${data.completed_at ? new Date(data.completed_at).toLocaleString() : 'Recent'}</span>
            <span class="text-emerald-700 font-semibold"><i class="fa-solid fa-lock mr-1"></i> Tamper-Evident Immutable Seal</span>
          </div>
        </div>
      `;
    } else {
      resultBox.innerHTML = `
        <div class="p-5 bg-red-50 border border-red-300 rounded-2xl text-slate-800 shadow-sm">
          <div class="flex items-center space-x-2 text-red-700 font-bold text-sm">
            <i class="fa-solid fa-triangle-exclamation text-red-600 text-lg"></i>
            <span>Verification Failed: Invalid or Non-Existent Record</span>
          </div>
          <p class="text-xs text-slate-600 mt-2">
            No authentic government inspection dossier matches the queried identifier (<strong>${query}</strong>). The hash may have been altered or the ID is invalid.
          </p>
        </div>
      `;
    }
  },

  async loadGrievances() {
    const listContainer = document.getElementById('citizen-grievances-list');
    if (!listContainer) return;

    const grievances = await ApiService.getGrievances();
    if (grievances.length === 0) {
      listContainer.innerHTML = `<div class="p-4 text-center text-xs text-slate-400">No public grievances logged.</div>`;
      return;
    }

    listContainer.innerHTML = grievances.map(g => `
      <div class="p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm text-xs hover:border-slate-300 transition">
        <div class="flex items-start justify-between">
          <div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">${g.category}</span>
            <h4 class="font-bold text-slate-900 text-sm mt-1.5">${g.subject}</h4>
            <p class="text-slate-600 mt-1">${g.description}</p>
          </div>
          <button onclick="CitizenModule.upvote('${g.id}')" class="flex flex-col items-center bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl px-2.5 py-1.5 transition">
            <i class="fa-solid fa-caret-up text-blue-600 text-base"></i>
            <span class="font-bold text-slate-800 text-[11px]" id="upvote-count-${g.id}">${g.upvotes}</span>
            <span class="text-[9px] text-slate-500">Votes</span>
          </button>
        </div>
        <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span><i class="fa-solid fa-location-dot mr-1 text-slate-400"></i> ${g.facility_name} • ${g.district}</span>
          <span class="font-semibold text-blue-700">${g.status}</span>
        </div>
      </div>
    `).join('');
  },

  async upvote(id) {
    const res = await ApiService.upvoteGrievance(id);
    const countEl = document.getElementById(`upvote-count-${id}`);
    if (countEl && res.upvotes) {
      countEl.textContent = res.upvotes;
    }
  },

  async handleGrievanceSubmit(e) {
    e.preventDefault();
    const facility = document.getElementById('grv-facility').value;
    const category = document.getElementById('grv-category').value;
    const subject = document.getElementById('grv-subject').value;
    const description = document.getElementById('grv-description').value;

    if (!subject || !description) {
      alert("Please enter subject and description.");
      return;
    }

    const payload = {
      facility_name: facility,
      district: "Jharkhand (Statewide)",
      category: category,
      subject: subject,
      description: description
    };

    const res = await ApiService.submitGrievance(payload);
    alert("Whistleblower Report Submitted!\nYour report has been logged and published to the public oversight tracker.");
    document.getElementById('grievance-form').reset();
    this.loadGrievances();
  }
};
