/**
 * Custom icon for the user's marker on the map.
 */
const userIcon = L.icon({
    iconUrl: 'user_marker.png',
    iconSize:     [38, 38], // size of the icon
    iconAnchor:   [19, 38], // point of the icon which will correspond to marker's location
    popupAnchor:  [0, -40]  // point from which the popup should open relative to the iconAnchor
});


/**
 * Initializes the Leaflet map.
 * @returns {L.Map} The initialized map instance.
 */
export function initMap() {
    const map = L.map('map', {
        center: [25, 0], // Centered globally initially
        zoom: 2,
        zoomControl: false // Disable default zoom control
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // Add a scale control
    L.control.scale({ imperial: false }).addTo(map);
    // Add zoom control to the bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);


    return map;
}

/**
 * Creates the user marker but doesn't add it to the map yet.
 * @param {L.Map} map - The Leaflet map instance.
 * @returns {Promise<L.Marker>} - A promise that resolves with the user marker.
 */
export function createUserMarker(map) {
    return new Promise((resolve) => {
        const marker = L.marker([0, 0], { icon: userIcon });
        marker.bindPopup("<b>Tu Ubicación</b><br>Posición actual.").addTo(map);
        resolve(marker);
    });
}


/**
 * Updates the user's position on the map.
 * Centers the map on the user on the first update.
 * @param {L.Map} map - The Leaflet map instance.
 * @param {L.Marker} marker - The user's marker.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 */
export function updateUserPosition(map, marker, lat, lon) {
    const newLatLng = new L.LatLng(lat, lon);
    marker.setLatLng(newLatLng);

    // If map is still at default view, zoom to user
    if (map.getZoom() < 13) {
        map.setView(newLatLng, 15);
    } else {
        // Smoothly pan to the new location if it's already zoomed in
        map.panTo(newLatLng);
    }
}

