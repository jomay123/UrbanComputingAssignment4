console.log("map.js loaded");

// ------------------------------------------------------
// CREATE TWO SEPARATE MAPS
// ------------------------------------------------------
const mapTemp = L.map("map-temp").setView([53.5, -8.0], 7);
const mapPressure = L.map("map-pressure").setView([53.5, -8.0], 7);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18
}).addTo(mapTemp);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18
}).addTo(mapPressure);

let gridTempLayer = null;
let gridPressureLayer = null;

let fusedCache = null;


// ------------------------------------------------------
// LOAD GRID GEOJSON ONCE — CLONE IT FOR BOTH MAPS
// ------------------------------------------------------
fetch("grids.geojson")
  .then(r => r.json())
  .then(geojson => {
    // Temperature map layer
    gridTempLayer = L.geoJSON(JSON.parse(JSON.stringify(geojson)), {
      style: tempStyleEmpty,
      onEachFeature: attachPopupTemp
    }).addTo(mapTemp);

    // Pressure map layer
    gridPressureLayer = L.geoJSON(JSON.parse(JSON.stringify(geojson)), {
      style: pressureStyleEmpty,
      onEachFeature: attachPopupPressure
    }).addTo(mapPressure);

    if (fusedCache) {
      applyFusedToTemp(fusedCache);
      applyFusedToPressure(fusedCache);
    }

    startFirebaseListener();
  });


// ------------------------------------------------------
// EMPTY MAP STYLES
// ------------------------------------------------------
function tempStyleEmpty() {
  return { fillColor: "#00000000", fillOpacity: 0.0, color: "#333", weight: 1 };
}

function pressureStyleEmpty() {
  return { fillColor: "#00000000", fillOpacity: 0.0, color: "#333", weight: 1 };
}


// ------------------------------------------------------
// POPUPS
// ------------------------------------------------------
function attachPopupTemp(feature, layer) {
  const p = feature.properties;

  layer.bindPopup(`
    <b>Cell:</b> ${p.cell_id}<br>
    <b>Temp:</b> ${p.avg_temp ?? "No data"} °C<br>
    <b>Count:</b> ${p.count_temp ?? 0}
  `);
}

function attachPopupPressure(feature, layer) {
  const p = feature.properties;

  layer.bindPopup(`
    <b>Cell:</b> ${p.cell_id}<br>
    <b>Pressure:</b> ${p.avg_pressure ?? "No data"} hPa<br>
    <b>Count:</b> ${p.count_pressure ?? 0}
  `);
}


// ------------------------------------------------------
// FIREBASE LISTENER
// ------------------------------------------------------
function startFirebaseListener() {
  firebase.database().ref("FusedData/BMP180").on("value", snap => {
    const fused = snap.val();
    if (!fused) return;

    fusedCache = fused;

    applyFusedToTemp(fused);
    applyFusedToPressure(fused);
  });
}


// ------------------------------------------------------
// APPLY TO TEMPERATURE MAP
// ------------------------------------------------------
function applyFusedToTemp(fused) {
  if (!gridTempLayer) return;

  gridTempLayer.eachLayer(layer => {
    const cid = layer.feature.properties.cell_id;
    const info = fused["cell_" + cid];
    if (!info) {
      layer.setStyle(tempStyleEmpty());
      return;
    }

    const temp = info.avg_temp;

    layer.feature.properties.avg_temp = info.avg_temp;
    layer.feature.properties.count_temp = info.count_temp;

    const c = tempToColor(temp);

    layer.setStyle({
      fillColor: c,
      fillOpacity: temp != null ? 0.4 : 0
    });

    attachPopupTemp(layer.feature, layer);
  });
}


// ------------------------------------------------------
// APPLY TO PRESSURE MAP
// ------------------------------------------------------
function applyFusedToPressure(fused) {
  if (!gridPressureLayer) return;

  gridPressureLayer.eachLayer(layer => {
    const cid = layer.feature.properties.cell_id;
    const info = fused["cell_" + cid];
    if (!info) {
      layer.setStyle(pressureStyleEmpty());
      return;
    }

    const pressure = info.avg_pressure;

    layer.feature.properties.avg_pressure = info.avg_pressure;
    layer.feature.properties.count_pressure = info.count_pressure;

    const c = pressureToColor(pressure);

    layer.setStyle({
      fillColor: c,
      fillOpacity: pressure != null ? 0.4 : 0
    });

    attachPopupPressure(layer.feature, layer);
  });
}


// ------------------------------------------------------
// COLOUR FUNCTIONS
// ------------------------------------------------------
function tempToColor(t) {
  if (typeof t !== "number") return "#00000000";
  const ratio = Math.min(Math.max((t - 0) / 20, 0), 1);
  const r = Math.floor(255 * ratio);
  const b = Math.floor(255 * (1 - ratio));
  return `rgb(${r},0,${b})`;
}

function pressureToColor(p) {
  if (typeof p !== "number") return "#00000000";
  const minP = 950;
  const maxP = 1050;
  const ratio = Math.min(Math.max((p - minP) / (maxP - minP), 0), 1);
  const g = Math.floor(255 * ratio);
  const b = Math.floor(255 * (1 - ratio));
  return `rgb(0,${g},${b})`;
}
