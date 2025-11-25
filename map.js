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
  .then(r => r.json())
  .then(geojson => {
    console.log("Grids loaded:", geojson);

    gridLayer = L.geoJSON(geojson, {
      style: {
        color: "#555",
        weight: 1,
        fillOpacity: 0.6
      }
    }).addTo(map);

    startFirebaseListener();
  })
  .catch(err => console.error("Failed to load grids:", err));


// ---------------------------------------------
// Firebase listener for fused data
// ---------------------------------------------
function startFirebaseListener() {
  const ref = firebase.database().ref("FusedData/BMP180");

  ref.on("value", snapshot => {
    const data = snapshot.val();
    console.log("Firebase fused data:", data);

    if (!data) return;

    applyFusedDataToGrid(data);
  });
}


// ---------------------------------------------
// Apply fused temperatures to the grid
// ---------------------------------------------
function applyFusedDataToGrid(fused) {
  gridLayer.eachLayer(layer => {
    const cellId = layer.feature.properties.cell_id;
    const info = fused[cellId];

    if (!info || info.avg_temp == null) {
      layer.setStyle({ fillColor: "#00000000", fillOpacity: 0 });
      return;
    }

    const temp = info.avg_temp;

    const color = tempToColor(temp);

    layer.setStyle({
      fillColor: color,
      fillOpacity: 0.7
    });

    layer.bindPopup(
      `<b>Cell ID:</b> ${cellId}<br>
       <b>Avg Temp:</b> ${temp.toFixed(2)} °C<br>
       <b>Readings:</b> ${info.count}`
    );
  });
}


// ---------------------------------------------
// Temperature → colour
// ---------------------------------------------
function tempToColor(t) {
  let ratio = Math.min(Math.max((t - 0) / 20, 0), 1);
  let r = Math.floor(255 * ratio);
  let b = Math.floor(255 * (1 - ratio));
  return `rgb(${r},0,${b})`;
}
