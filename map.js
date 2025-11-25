console.log("map.js loaded");

// --------------------------------------------------
// 1. Create Map
// --------------------------------------------------
const map = L.map("map").setView([53.5, -8.0], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18
}).addTo(map);

// --------------------------------------------------
// 2. Load grids.geojson
// --------------------------------------------------
fetch("grids.geojson")
    .then(res => {
        if (!res.ok) throw new Error("Failed to load grids.geojson");
        return res.json();
    })
    .then(gridData => {
        console.log("Grids loaded:", gridData);

        // --------------------------------------------------
        // 3. Load fused data from Firebase
        // --------------------------------------------------
        firebase.database()
            .ref("FusedData/BMP180")
            .once("value")
            .then(snapshot => {
                const fused = snapshot.val() || {};
                console.log("Fused data:", fused);

                // Colour scale
                function tempToColor(temp) {
                    if (temp === null || temp === undefined) return "#00000000";
                    const ratio = Math.max(0, Math.min(temp / 20, 1));
                    const r = Math.floor(255 * ratio);
                    const b = Math.floor(255 * (1 - ratio));
                    return `rgb(${r},0,${b})`;
                }

                // Grid Layer
                L.geoJSON(gridData, {
                    style: feature => {
                        const id = feature.properties.cell_id;
                        const entry = fused[id];

                        const temp = entry ? entry.avg_temp : null;
                        const color = tempToColor(temp);

                        return {
                            color: "#444",
                            weight: 1,
                            fillColor: color,
                            fillOpacity: temp ? 0.7 : 0
                        };
                    },
                    onEachFeature: (feature, layer) => {
                        const id = feature.properties.cell_id;
                        const entry = fused[id];

                        if (entry) {
                            layer.bindPopup(`
                                <b>Grid ID:</b> ${id}<br>
                                <b>Avg Temp:</b> ${entry.avg_temp.toFixed(2)} °C<br>
                                <b>Readings:</b> ${entry.count}<br>
                                <b>Updated:</b> ${entry.timestamp}
                            `);
                        } else {
                            layer.bindPopup(`<b>Grid ID:</b> ${id}<br>No data`);
                        }
                    }
                }).addTo(map);

            });
    })
    .catch(err => console.error("Error:", err));
