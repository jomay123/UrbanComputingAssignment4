console.log("map.js loaded");

let currentMetric = "temp"; // "temp" or "pressure"

const map = L.map("map").setView([53.5, -8.0], 7);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
}).addTo(map);

let gridLayer = null;
let fusedCache = null;

// ---------------------------------------------
// Load grid
// ---------------------------------------------
fetch("grids.geojson")
  .then(r => r.json())
  .then(geojson => {
    gridLayer = L.geoJSON(geojson, {
      style: {
        color: "#555",
        weight: 1,
        fillOpacity: 0.3
      },
      onEachFeature: attachPopup
    }).addTo(map);

    if (fusedCache) {
      applyFusedToGrid(fusedCache);
    }

    startFirebaseListener();
  });

// ---------------------------------------------
// Popups
// ---------------------------------------------
function attachPopup(feature, layer) {
  const c = feature.properties;

  layer.bindPopup(`
    <b>Cell ID:</b> ${c.cell_id}<br>
    <b>Avg Temp:</b> ${c.avg_temp ?? "No data"}<br>
    <b>Avg Pressure:</b> ${c.avg_pressure ?? "No data"}<br>
    <b>Temp Count:</b> ${c.count_temp ?? 0}<br>
    <b>Pressure Count:</b> ${c.count_pressure ?? 0}
  `);
}

// ---------------------------------------------
// Firebase Listener
// ---------------------------------------------
function startFirebaseListener() {
  const ref = firebase.database().ref("FusedData/BMP180");

  ref.on("value", snap => {
    const fused = snap.val();
    if (!fused) return;

    if (!gridLayer) {
      fusedCache = fused;
      return;
    }

    applyFusedToGrid(fused);
  });
}

// ---------------------------------------------
// Apply fused data
// ---------------------------------------------
function applyFusedToGrid(fused) {
  gridLayer.eachLayer(layer => {
    const cellId = layer.feature.properties.cell_id;
    const info = fused["cell_" + cellId];

    if (!info) {
      layer.setStyle({ fillColor: "#00000000", fillOpacity: 0 });
      return;
    }

    layer.feature.properties.avg_temp = info.avg_temp;
    layer.feature.properties.avg_pressure = info.avg_pressure;
    layer.feature.properties.count_temp = info.count_temp;
    layer.feature.properties.count_pressure = info.count_pressure;

    const val = currentMetric === "temp" ? info.avg_temp : info.avg_pressure;
    const color = valueToColor(val, currentMetric);

    layer.setStyle({
      fillColor: color,
      fillOpacity: val ? 0.8 : 0
    });

    layer.bindPopup(`
      <b>Cell ID:</b> ${cellId}<br>
      <b>Avg Temp:</b> ${info.avg_temp ?? "No data"}<br>
      <b>Avg Pressure:</b> ${info.avg_pressure ?? "No data"}<br>
      <b>Temp Count:</b> ${info.count_temp}<br>
      <b>Pressure Count:</b> ${info.count_pressure}
    `);
  });
}

// ---------------------------------------------
// Metric toggle
// ---------------------------------------------
function setMetric(metric) {
  currentMetric = metric;
  if (fusedCache) applyFusedToGrid(fusedCache);
}

// ---------------------------------------------
// Coloring
// ---------------------------------------------
function valueToColor(v, metric) {
  if (typeof v !== "number" || isNaN(v)) return "#00000000";

  if (metric === "temp") {
    // 0°C → blue, 20°C → red
    const ratio = Math.min(Math.max((v - 0) / 20, 0), 1);
    const r = Math.floor(255 * ratio);
    const b = Math.floor(255 * (1 - ratio));
    return `rgb(${r},0,${b})`;
  }

  if (metric === "pressure") {
    // Normal pressure range 950–1050 hPa
    const minP = 950;
    const maxP = 1050;
    const ratio = Math.min(Math.max((v - minP) / (maxP - minP), 0), 1);

    const g = Math.floor(255 * ratio);
    const b = Math.floor(255 * (1 - ratio));
    return `rgb(0,${g},${b})`;
  }

  return "#00000000";
}
