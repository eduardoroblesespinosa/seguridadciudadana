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
 * Creates the user marker and adds it to the map.
 * @param {L.Map} map - The Leaflet map instance.
 * @param {number} lat - The initial latitude.
 * @param {number} lon - The initial longitude.
 * @returns {L.Marker} - The created user marker.
 */
export function createUserMarker(map, lat, lon) {
    const marker = L.marker([lat, lon], { icon: userIcon });
    marker.bindPopup("<b>Tu Ubicación</b><br>Posición actual.").addTo(map);
    return marker;
}


/**
 * Updates the user's position on the map.
 * Smoothly pans the map to the new location.
 * @param {L.Map} map - The Leaflet map instance.
 * @param {L.Marker} marker - The user's marker.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 */
export function updateUserPosition(map, marker, lat, lon) {
    const newLatLng = new L.LatLng(lat, lon);
    marker.setLatLng(newLatLng);

    // Smoothly pan to the new location
    map.panTo(newLatLng);
}