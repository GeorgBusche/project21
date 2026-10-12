import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../../css/radar.css';

const TARGET = [52.4832492, 8.8754388];
const HOME_ZOOM = 17;

let map;
let rangeRing;

function metersBetween(a, b) {
  return map.distance(a, b);
}

function formatDistance(meters) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function dms(value, positive, negative) {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const min = ((abs - deg) * 60).toFixed(2).padStart(5, '0');
  return `${deg}°${min}' ${value >= 0 ? positive : negative}`;
}

function updateScale() {
  const zoom = map.getZoom();
  const el = map.getContainer();
  el.style.setProperty('--radar-scale', Math.min(2.2, Math.max(0.3, 2 ** ((zoom - 17) * 0.7))).toFixed(3));
  el.style.setProperty('--radar-sweep-scale', Math.min(1.6, Math.max(0.15, 2 ** (zoom - 17))).toFixed(3));
}

function updateReadout() {
  updateScale();
  const center = map.getCenter();
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  set('radarCoords', `${dms(center.lat, 'N', 'S')}  ${dms(center.lng, 'E', 'W')}`);
  set('radarZoom', `ZOOM ${map.getZoom()}`);
  const distance = metersBetween([center.lat, center.lng], TARGET);
  const status = document.getElementById('radarDistance');
  if (status && !status.dataset.locked) {
    status.textContent = distance < 8 ? 'ZIEL ERFASST' : `ZIEL: ${formatDistance(distance)}`;
  }
  document.getElementById('radarRecenter')?.classList.toggle('radar-recenter--hot', distance >= 8);
}

function targetIcon() {
  const speaker = `<svg class="radar-box__svg" viewBox="0 0 48 60" aria-hidden="true">
    <rect x="3" y="3" width="42" height="54" rx="6" fill="#1a0b24" stroke="#f0abfc" stroke-width="2.5"/>
    <rect x="8" y="8" width="32" height="4" rx="2" fill="#e879f9"/>
    <circle class="radar-box__tweeter" cx="24" cy="20" r="6" fill="#3b0a4a" stroke="#f0abfc" stroke-width="2"/>
    <circle class="radar-box__tweeter" cx="24" cy="20" r="2" fill="#fdf4ff"/>
    <circle class="radar-box__woofer" cx="24" cy="41" r="11" fill="#3b0a4a" stroke="#f0abfc" stroke-width="2.5"/>
    <circle class="radar-box__woofer" cx="24" cy="41" r="6" fill="#701a75" stroke="#fdf4ff" stroke-width="1.5"/>
    <circle class="radar-box__woofer" cx="24" cy="41" r="2" fill="#fdf4ff"/>
  </svg>`;
  return L.divIcon({
    className: 'radar-target',
    iconSize: [80, 80],
    iconAnchor: [40, 40],
    html: `<div class="radar-scale"><span class="radar-target__ping"></span><span class="radar-target__ping radar-target__ping--b"></span><span class="radar-box">${speaker}<i class="radar-box__note radar-box__note--1">♪</i><i class="radar-box__note radar-box__note--2">♫</i><i class="radar-box__note radar-box__note--3">♪</i></span><span class="radar-target__label">PARTYRAUM</span></div>`
  });
}

function sweepIcon() {
  return L.divIcon({
    className: 'radar-sweep-marker',
    iconSize: [900, 900],
    iconAnchor: [450, 450],
    html: '<div class="radar-scale radar-scale--sweep"><div class="radar-sweep-marker__beam"></div></div>'
  });
}

function userIcon() {
  return L.divIcon({
    className: 'radar-user',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: '<span class="radar-user__ping"></span><span class="radar-user__dot"></span>'
  });
}

let userMarker;
let routeLayer;
let locating = false;

function setStatus(text, hot = false) {
  const el = document.getElementById('radarDistance');
  if (!el) return;
  el.textContent = text;
  el.dataset.locked = '1';
  el.classList.toggle('text-emerald-300', hot);
}

function formatDuration(seconds) {
  const min = Math.max(1, Math.round(seconds / 60));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
}

function drawRoute(coords) {
  routeLayer?.remove();
  routeLayer = L.layerGroup([
    L.polyline(coords, { color: '#facc15', weight: 12, opacity: 0.25, lineCap: 'round' }),
    L.polyline(coords, { color: '#fde047', weight: 4, opacity: 1, lineCap: 'round', className: 'radar-route' })
  ]).addTo(map);
}

async function fetchRoute(from) {
  const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${TARGET[1]},${TARGET[0]}?overview=full&geometries=geojson`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('route');
  const data = await response.json();
  const route = data.routes?.[0];
  if (!route) throw new Error('route');
  return {
    coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distance: route.distance,
    duration: route.duration
  };
}

function locate() {
  const button = document.getElementById('radarLocate');
  if (!navigator.geolocation) {
    setStatus('GPS NICHT VERFÜGBAR');
    return;
  }
  if (locating) return;
  locating = true;
  button?.classList.add('radar-btn--busy');
  setStatus('ORTE POSITION…');
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      const from = [coords.latitude, coords.longitude];
      userMarker?.remove();
      userMarker = L.marker(from, { icon: userIcon(), interactive: false, keyboard: false }).addTo(map);
      try {
        const route = await fetchRoute(from);
        drawRoute(route.coords);
        setStatus(`${formatDistance(route.distance)} · ${formatDuration(route.duration)}`, true);
        map.flyToBounds(L.latLngBounds(route.coords), { padding: [40, 40], duration: 1 });
      } catch {
        drawRoute([from, TARGET]);
        setStatus(`LUFTLINIE ${formatDistance(metersBetween(from, TARGET))}`, true);
        map.flyToBounds(L.latLngBounds([from, TARGET]), { padding: [40, 40], duration: 1 });
      }
      locating = false;
      button?.classList.remove('radar-btn--busy');
    },
    (error) => {
      locating = false;
      button?.classList.remove('radar-btn--busy');
      setStatus(error.code === 1 ? 'STANDORT ABGELEHNT' : 'KEIN GPS-SIGNAL');
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
  );
}

function recenter() {
  const status = document.getElementById('radarDistance');
  if (status) delete status.dataset.locked;
  map.flyTo(TARGET, HOME_ZOOM, { duration: 0.9 });
}

function createMap() {
  map = L.map('radarMap', {
    center: TARGET,
    zoom: HOME_ZOOM,
    minZoom: 5,
    maxZoom: 19,
    zoomControl: false,
    attributionControl: false,
    zoomSnap: 0.5,
    fadeAnimation: false,
    zoomDelta: 1,
    bounceAtZoomLimits: false,
    tap: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    className: 'radar-tiles'
  }).addTo(map);

  L.marker(TARGET, { icon: sweepIcon(), interactive: false, keyboard: false, zIndexOffset: -500 }).addTo(map);
  L.marker(TARGET, { icon: targetIcon(), interactive: false, keyboard: false, zIndexOffset: 500 }).addTo(map);
  rangeRing = L.circle(TARGET, {
    radius: 150,
    color: '#22d3ee',
    weight: 1,
    opacity: 0.7,
    dashArray: '4 6',
    fillColor: '#22d3ee',
    fillOpacity: 0.06,
    interactive: false
  }).addTo(map);

  map.on('move zoom', updateReadout);
  document.getElementById('radarZoomIn')?.addEventListener('click', () => map.zoomIn());
  document.getElementById('radarZoomOut')?.addEventListener('click', () => map.zoomOut());
  document.getElementById('radarRecenter')?.addEventListener('click', recenter);
  document.getElementById('radarLocate')?.addEventListener('click', locate);
  updateReadout();
}

export function showRadarMap() {
  if (!map) createMap();
  // Modal war bis eben hidden -> Größe neu berechnen
  map.invalidateSize();
  map.setView(TARGET, HOME_ZOOM, { animate: false });
  updateReadout();
}
