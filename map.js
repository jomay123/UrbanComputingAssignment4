console.log("map.js loaded");

// ---------------------------------------------
// LEAFLET MAP
// ---------------------------------------------
const map = L.map('map').setView([53.5, -8.0], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
}).addTo(map);

let gridLayer = null;
let fusedCache = null;  // store last fused data until grid loads


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
        fillOpacity: 0.3
      },
      onEachFeature: attachPopup
    }).addTo(map);

    // If Firebase sent fused data before the grid loaded → apply it now
    if (fusedCache) {
      console.log("Applying cached fused data...");
      applyFusedDataToGrid(fusedCache);
    }

    startFirebaseListener();
  })
  .catch(err => console.error("Failed to load grids:", err));


// ---------------------------------------------
// Safe popup attachment
// ---------------------------------------------
function attachPopup(feature, layer) {
  const props = feature.properties;

  const temp = (typeof props.avg_temp === "number")
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

    // If grid not yet loaded, store until ready
    if (!gridLayer) {
      fusedCache = fused;
      return;
    }

    applyFusedDataToGrid(fused);
  });
}


// ---------------------------------------------
// Apply fused temperatures to the grid
// ---------------------------------------------
function applyFusedDataToGrid(fused) {
  console.log("Applying fused data to grid…");

  gridLayer.eachLayer(layer => {
    const cellId = layer.feature.properties.cell_id;
    const info = fused["cell_" + cellId];


    if (!info || typeof info.avg_temp !== "number" || isNaN(info.avg_temp)) {
      // No data present
      layer.setStyle({ fillColor: "#00000000", fillOpacity: 0 });
      layer.feature.properties.avg_temp = null;
      layer.feature.properties.count = 0;
      layer.bindPopup(
        `<b>Cell ID:</b> ${cellId}<br>
         <b>Avg Temp:</b> No data<br>
         <b>Readings:</b> 0`
      );
      return;
    }

    const temp = info.avg_temp;
    const count = info.count ?? 0;

    // Update properties so popup shows correct values
    layer.feature.properties.avg_temp = temp;
    layer.feature.properties.count = count;

    const color = tempToColor(temp);

    layer.setStyle({
      fillColor: color,
      fillOpacity: 0.8
    });

    layer.bindPopup(
      `<b>Cell ID:</b> ${cellId}<br>
       <b>Avg Temp:</b> ${temp.toFixed(2)} °C<br>
       <b>Readings:</b> ${count}`
    );
  });
}


// ---------------------------------------------
// Temperature → colour
// ---------------------------------------------
function tempToColor(t) {
  if (typeof t !== "number" || isNaN(t)) {
    return "#00000000";
  }

  const ratio = Math.min(Math.max((t - 0) / 20, 0), 1);
  const r = Math.floor(255 * ratio);
  const b = Math.floor(255 * (1 - ratio));
  return `rgb(${r},0,${b})`;
}
