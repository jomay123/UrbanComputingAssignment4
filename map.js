console.log("map.js loaded");

// ------------------------------------------------------
// GLOBAL STATE
// ------------------------------------------------------

let currentSource = "current";
let currentMetric = "temp";
let currentForecastHour = 0;

let gridLayer = null;
let grid = null;
let fusedCurrent = null;
let fusedForecast = {};


// ------------------------------------------------------
// DOM READY INITIALIZATION
// ------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("sourceSelect").addEventListener("change", onSourceChange);
  document.getElementById("metricSelect").addEventListener("change", onMetricChange);
  document.getElementById("forecastSlider").addEventListener("input", onForecastChange);
});


// ------------------------------------------------------
// LEAFLET MAP
// ------------------------------------------------------

const map = L.map("map").setView([53.5, -8.0], 7);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);


// ------------------------------------------------------
// LEGENDS (continuous)
// ------------------------------------------------------

function makeLegendBar(gradientCSS) {
  return `
    <div class="legend-bar" style="background:${gradientCSS};"></div>
  `;
}

const tempLegend = L.control({ position: "bottomright" });
tempLegend.onAdd = function () {
  const div = L.DomUtil.create("div", "legend");
  div.style.background = "white";
  div.style.padding = "8px";
  div.style.borderRadius = "6px";
  div.innerHTML = `
    <b>Temperature (°C)</b><br>
    ${makeLegendBar("linear-gradient(to right, blue, red)")}
    <span>0°C</span> → <span>20°C+</span>
  `;
  return div;
};

const pressureLegend = L.control({ position: "bottomright" });
pressureLegend.onAdd = function () {
  const div = L.DomUtil.create("div", "legend");
  div.style.background = "white";
  div.style.padding = "8px";
  div.style.borderRadius = "6px";
  div.innerHTML = `
    <b>Pressure (hPa)</b><br>
    ${makeLegendBar("linear-gradient(to right, blue, green)")}
    <span>Low (960hPa)</span> → <span>High (1020hPa)</span>
  `;
  return div;
};


// ------------------------------------------------------
// LOAD GRID
// ------------------------------------------------------

fetch("grids.geojson")
  .then(r => r.json())
  .then(geojson => {
    grid = geojson;

    gridLayer = L.geoJSON(geojson, {
      style: baseEmptyStyle,
      onEachFeature: attachPopup
    }).addTo(map);

    startCurrentListener();
    startForecastListener();
    startSensorStatusListener();
  });


// ------------------------------------------------------
// FIREBASE LISTENERS
// ------------------------------------------------------

function startCurrentListener() {
  firebase.database().ref("FusedData/BMP180")
    .on("value", snap => {
      fusedCurrent = snap.val();
      if (currentSource === "current") refreshMap();
    });
}

function startForecastListener() {
  firebase.database().ref("FusedForecast")
    .on("value", snap => {
      fusedForecast = snap.val() || {};
      if (currentSource === "forecast") refreshMap();
    });
}

function startSensorStatusListener() {
  firebase.database().ref("SensorStatus")
    .on("value", snap => {
      const data = snap.val() || {};

      let active = 0, slow = 0, inactive = 0;
      let readings = 0;

      Object.values(data).forEach(dev => {
        if (dev.status === "active") active++;
        else if (dev.status === "slow") slow++;
        else inactive++;

        readings += dev.readings_last_window ?? 0;
      });

      document.getElementById("statusActive").innerText = `Active: ${active}`;
      document.getElementById("statusInactive").innerText = `Inactive: ${inactive}`;
      document.getElementById("statusTotalReadings").innerText = `Readings (last hour): ${readings}`;
    });
}


// ------------------------------------------------------
// UI HANDLERS
// ------------------------------------------------------

function onSourceChange() {
  currentSource = document.getElementById("sourceSelect").value;

  document.getElementById("forecastBlock").style.display =
    currentSource === "forecast" ? "block" : "none";

  refreshMap();
}

function onMetricChange() {
  currentMetric = document.getElementById("metricSelect").value;
  refreshMap();
}

function onForecastChange() {
  const slider = document.getElementById("forecastSlider");
  currentForecastHour = Number(slider.value);
  document.getElementById("forecastLabel").innerText = `Forecast +${currentForecastHour}h`;
  refreshMap();
}


// ------------------------------------------------------
// MAP REFRESH
// ------------------------------------------------------

function refreshMap() {
  if (!gridLayer) return;

  gridLayer.eachLayer(layer => {
    const id = layer.feature.properties.cell_id;

    let info = null;

    if (currentSource === "current") {
      info = fusedCurrent?.[`cell_${id}`];
    } else {
      info = fusedForecast[currentForecastHour]?.[`cell_${id}`];
    }

    const val = extractValue(info);
    const color = val != null ? metricToColor(val, currentMetric) : "#00000000";

    layer.setStyle({
      fillColor: color,
      fillOpacity: val != null ? 0.8 : 0,
      color: "#444",
      weight: 1,
      opacity: 0.2
    });

    updatePopup(layer, info);
  });

  updateLegend();
}


// ------------------------------------------------------
// POPUPS
// ------------------------------------------------------

function attachPopup(feature, layer) {
  layer.bindPopup("Loading...");
}

function updatePopup(layer, info) {
  const f = layer.feature.properties;

  if (!info) {
    layer.bindPopup(`
      <b>Cell:</b> ${f.cell_id}<br>
      <b>No data</b>
    `);
    return;
  }

  const temp = info.avg_temp ?? info.avg_temp_forecast;
  const pres = info.avg_pressure ?? info.avg_pressure_forecast;

  layer.bindPopup(`
    <b>Cell:</b> ${f.cell_id}<br>
    <b>Temperature:</b> ${temp != null ? temp + " °C" : "No data"}<br>
    <b>Pressure:</b> ${pres != null ? pres + " hPa" : "No data"}
  `);
}


// ------------------------------------------------------
// COLOR SCALES
// ------------------------------------------------------

function metricToColor(v, metric) {
  return metric === "temp" ? tempToColor(v) : pressureToColor(v);
}

function tempToColor(t) {
  if (typeof t !== "number") return "#00000000";
  const ratio = Math.min(Math.max((t - 0) / 20, 0), 1);
  return `rgb(${Math.floor(255 * ratio)},0,${Math.floor(255 * (1 - ratio))})`;
}

function pressureToColor(p) {
  if (typeof p !== "number") return "#00000000";
  const minP = 960, maxP = 1020;
  const ratio = Math.min(Math.max((p - minP) / (maxP - minP), 0), 1);
  return `rgb(0,${Math.floor(255 * ratio)},${Math.floor(255 * (1 - ratio))})`;
}


// ------------------------------------------------------
// LEGEND SWITCHING
// ------------------------------------------------------

function updateLegend() {
  map.removeControl(tempLegend);
  map.removeControl(pressureLegend);

  if (currentMetric === "temp") map.addControl(tempLegend);
  else map.addControl(pressureLegend);
}


// ------------------------------------------------------
// HELPERS
// ------------------------------------------------------

function extractValue(info) {
  if (!info) return null;
  if (currentMetric === "temp") return info.avg_temp ?? info.avg_temp_forecast;
  return info.avg_pressure ?? info.avg_pressure_forecast;
}

function baseEmptyStyle() {
  return { fillColor: "#00000000", fillOpacity: 0, color: "#333", weight: 1.5 };
}
