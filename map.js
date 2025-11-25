console.log("map.js loaded");

// ---------------------------------------------
// LEAFLET MAP
// ---------------------------------------------
const map = L.map('map').setView([53.5, -8.0], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
}).addTo(map);

let gridLayer = null;


// ---------------------------------------------
// Load grids.geojson
// ---------------------------------------------
fetch("grids.geojson")
  .then(resp => resp.json())
  .then(geojson => {
    console.log("Grids loaded:", geojson);

    gridLayer = L.geoJSON(geojson, {
      style: {
        color: "#555",
        weight: 1,
        fillOpacity: 0.4
      },
      onEachFeature: onEachFeature  // safe popup
    }).addTo(map);

    startFirebaseListener();
  })
  .catch(err => console.error("Failed to load grids:", err));


// ---------------------------------------------
// Safe popup function
// ---------------------------------------------
function onEachFeature(feature, layer) {
  const props = feature.properties;

  const temp = (typeof props.avg_temp === "number" && !isNaN(props.avg_temp))
      ? props.avg_temp.toFixed(2)
      : "No data";

  const count = (typeof props.count === "number")
      ? props.count
      : 0;

  layer.bindPopup(
    `<b>Cell ID:</b> ${props.cell_id}<br>
     <b>Avg Temp:</b> ${temp}<br>
     <b>Readings:</b> ${count}`
  );
}


// ---------------------------------------------
// Firebase listener for fused data
// ---------------------------------------------
function startFirebaseListener() {
  console.log("Firebase listener started");

  const ref = firebase.database().ref("FusedData/BMP180");

  ref.on("value", snapshot => {
    const fused = snapshot.val();
    console.log("Fused data:", fused);

    if (!fused) return;

    applyFusedDataToGrid(fused);
  });
}


// ---------------------------------------------
// Apply fused temperatures to the grid
// ---------------------------------------------
function applyFusedDataToGrid(fused) {
  console.log("Applying fused data to grid...");

  gridLayer.eachLayer(layer => {
    const cellId = layer.feature.properties.cell_id;
    const info = fused[cellId];

    // No data?
    if (!info || typeof info.avg_temp !== "number" || isNaN(info.avg_temp)) {
      layer.setStyle({ fillColor: "#00000000", fillOpacity: 0 });
      layer.feature.properties.avg_temp = null;
      layer.feature.properties.count = 0;
      return;
    }

    // Valid temp
    const temp = info.avg_temp;
    const count = info.count ?? 0;

    // Save into feature properties for popup
    layer.feature.properties.avg_temp = temp;
    layer.feature.properties.count = count;

    const color = tempToColor(temp);

    layer.setStyle({
      fillColor: color,
      fillOpacity: 0.7
    });
  });
}


// ---------------------------------------------
// Temperature → colour
// ---------------------------------------------
function tempToColor(t) {
  if (typeof t !== "number" || isNaN(t)) {
    return "#00000000"; // transparent
  }

  const ratio = Math.min(Math.max((t - 0) / 20, 0), 1);
  const r = Math.floor(255 * ratio);
  const b = Math.floor(255 * (1 - ratio));
  return `rgb(${r},0,${b})`;
}
