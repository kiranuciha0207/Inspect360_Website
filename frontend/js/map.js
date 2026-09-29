/**
 * Inspect360 - GIS Spatial Command Map
 * Interactive Leaflet engine with dual tiles, 150m cadastral geofences, and live telemetry.
 */

let leafletMap = null;
let geofenceLayers = L.layerGroup();
let inspectorLayers = L.layerGroup();
let facilityLayers = L.layerGroup();

const GisModule = {
  initMap(containerId = 'gis-map-canvas') {
    if (leafletMap) return;

    // Centered around Jharkhand state (Ranchi PMU Hub)
    leafletMap = L.map(containerId, {
      center: [23.6102, 85.2799],
      zoom: 8,
      zoomControl: true
    });

    // High performance CartoDB Voyager tiles
    const cartoVoyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(leafletMap);

    // Standard OpenStreetMap layer option
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    });

    L.control.layers({
      "CartoDB Clean": cartoVoyager,
      "OpenStreetMap Standard": osmLayer
    }, {
      "150m Cadastral Geofences": geofenceLayers,
      "Live Field Inspectors": inspectorLayers,
      "Institutions & Centers": facilityLayers
    }, { position: 'topright' }).addTo(leafletMap);

    geofenceLayers.addTo(leafletMap);
    inspectorLayers.addTo(leafletMap);
    facilityLayers.addTo(leafletMap);

    this.loadMapData();
  },

  async loadMapData() {
    facilityLayers.clearLayers();
    geofenceLayers.clearLayers();
    inspectorLayers.clearLayers();

    // 1. Fetch & Plot Facilities
    const facilities = await ApiService.getFacilities();
    facilities.forEach(fac => {
      const isHighRisk = fac.risk_score >= 3.5;
      const markerColor = isHighRisk ? '#ef4444' : (fac.risk_score >= 2.0 ? '#f59e0b' : '#10b981');

      // Facility Marker
      const facMarker = L.circleMarker([fac.latitude, fac.longitude], {
        radius: 8,
        fillColor: markerColor,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
      });

      const popupContent = `
        <div class="p-2 text-xs">
          <div class="font-bold text-sm text-slate-900">${fac.name}</div>
          <div class="text-blue-600 font-semibold mt-0.5">${fac.scheme_name}</div>
          <div class="mt-2 text-slate-600">
            <div><strong>District:</strong> ${fac.district}</div>
            <div><strong>Capacity:</strong> ${fac.current_enrollment} / ${fac.approved_capacity}</div>
            <div><strong>Risk Score:</strong> <span class="font-bold ${isHighRisk ? 'text-red-600' : 'text-slate-800'}">${fac.risk_score} / 5.0</span></div>
            <div><strong>Cadastral Geofence:</strong> ${fac.geofence_radius_meters || 150}m</div>
          </div>
          <button onclick="GisModule.focusOnFacility('${fac.id}', ${fac.latitude}, ${fac.longitude})" class="mt-2.5 w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-1 px-2 rounded text-[11px]">
            Inspect Facility
          </button>
        </div>
      `;
      facMarker.bindPopup(popupContent);
      facilityLayers.addLayer(facMarker);

      // Cadastral Geofence Ring (150m radius)
      const geofenceCircle = L.circle([fac.latitude, fac.longitude], {
        radius: fac.geofence_radius_meters || 150,
        color: isHighRisk ? '#ef4444' : '#0284c7',
        weight: 1.5,
        dashArray: '4, 4',
        fillColor: isHighRisk ? '#fee2e2' : '#e0f2fe',
        fillOpacity: 0.25
      });
      geofenceLayers.addLayer(geofenceCircle);
    });

    // 2. Fetch & Plot Live Inspectors
    const inspectors = await ApiService.getInspectors();
    inspectors.forEach(insp => {
      const statusColor = insp.status === 'On-Site' ? '#10b981' : (insp.status === 'On-Duty' ? '#3b82f6' : '#f59e0b');

      const inspIcon = L.divIcon({
        className: 'custom-insp-icon',
        html: `
          <div style="background-color: ${statusColor};" class="w-7 h-7 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold radar-pulse">
            <i class="fa-solid fa-person-walking"></i>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const inspMarker = L.marker([insp.current_lat, insp.current_lng], { icon: inspIcon });
      const inspPopup = `
        <div class="p-2 text-xs">
          <div class="font-bold text-sm text-slate-900">${insp.name}</div>
          <div class="text-slate-500">${insp.role}</div>
          <div class="mt-2 text-slate-700">
            <div><strong>Status:</strong> <span class="font-semibold text-emerald-600">${insp.status}</span></div>
            <div><strong>Phone:</strong> ${insp.phone}</div>
            <div><strong>Audits Completed:</strong> ${insp.inspections_completed}</div>
          </div>
        </div>
      `;
      inspMarker.bindPopup(inspPopup);
      inspectorLayers.addLayer(inspMarker);
    });
  },

  recenterHub() {
    if (leafletMap) {
      leafletMap.setView([23.3441, 85.3096], 12);
    }
  },

  toggleGeofences() {
    if (leafletMap.hasLayer(geofenceLayers)) {
      leafletMap.removeLayer(geofenceLayers);
    } else {
      leafletMap.addLayer(geofenceLayers);
    }
  },

  focusOnFacility(facId, lat, lng) {
    if (leafletMap) {
      leafletMap.setView([lat, lng], 16, { animate: true });
    }
  }
};
