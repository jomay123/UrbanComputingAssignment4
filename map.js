// --------------------------------------------
// 1. Init map
// --------------------------------------------
const map = L.map("map").setView([53.4, -7.8], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// Will store polygons keyed by cell_id
const gridLayers = {};

// Colour scale
function tempToColor(temp) {
    if (temp === null || temp === undefined) return "#00000000";
    const ratio = Math.min(Math.max(temp / 20, 0), 1);
    const r = Math.floor(255 * ratio);
    const b = Math.floor(255 * (1 - ratio));
    return `rgb(${r},0,${b})`;
}

// --------------------------------------------
// 2. Load grid.geojson
// --------------------------------------------
fetch("grids.geojson")
    .then(res => res.json())
    .then(geojson => {

        // Create polygons
        L.geoJSON(geojson, {
            style: {
                weight: 1,
                color: "#555",
                fillOpacity: 0.7
            },
            onEachFeature: function (feature, layer) {
                const id = feature.properties.cell_id;
                gridLayers[id] = layer; // store layer

                layer.bindTooltip(`Cell ${id}<br>No data`);
            }
        }).addTo(map);

        // When grid loaded, start listening for Firebase data
        startFirebaseListener();
    });

// --------------------------------------------
// 3. Listen for Firebase changes
// --------------------------------------------
function startFirebaseListener() {

    dbRef.on("value", snapshot => {
        const fusedData = snapshot.val();  // list of entries

        if (!fusedData) return;

        fusedData.forEach((entry, cell_id) => {
            if (!entry || entry.avg_temp === null) return;

            const layer = gridLayers[cell_id];
            if (!layer) return;

            // Update polygon color
            const color = tempToColor(entry.avg_temp);
            layer.setStyle({ fillColor: color });

            // Update tooltip
            layer.bindTooltip(
                `<b>Average Temp:</b> ${entry.avg_temp.toFixed(2)}°C<br>` +
                `<b>Count:</b> ${entry.count}<br>` +
                `<b>Time:</b> ${entry.timestamp}`
            );
        });

        console.log("UI updated with latest fused data.");
    });
}
