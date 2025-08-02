import { generateCSC } from 'csc';
import { initMap, updateUserPosition, createUserMarker } from 'map';
import { getActiveAlertsForLocation } from 'noaa';
import { updateSecurityProfile, updateAlertsUI } from 'profile';

// --- DOM Elements ---
const cscCodeEl = document.getElementById('csc-code');
const coordinatesEl = document.getElementById('coordinates');
const mapLoader = document.getElementById('map-loader');

// --- State ---
let userMarker = null;
let map = null;

/**
 * Main application initializer
 */
function main() {
    // 1. Generate and display the Citizen Security Code
    const csc = generateCSC();
    cscCodeEl.textContent = csc;

    // 2. Initialize the map
    map = initMap();
    createUserMarker(map).then(marker => {
        userMarker = marker;
    });


    // 3. Request geolocation and start tracking
    if ('geolocation' in navigator) {
        navigator.geolocation.watchPosition(
            handlePositionUpdate,
            handleGeolocationError,
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        handleGeolocationError({ message: "Geolocalización no es compatible con este navegador." });
    }
}

/**
 * Handles successful geolocation updates.
 * This is the core loop of the application.
 * @param {GeolocationPosition} position
 */
async function handlePositionUpdate(position) {
    const { latitude, longitude } = position.coords;

    // Hide loader on first successful location
    if (mapLoader.style.display !== 'none') {
        mapLoader.style.display = 'none';
    }

    // A. Update UI with coordinates
    coordinatesEl.textContent = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

    // B. Update map
    if (map && userMarker) {
        updateUserPosition(map, userMarker, latitude, longitude);
    }

    // C. Fetch environmental data from NOAA
    try {
        updateAlertsUI({ loading: true });
        const alerts = await getActiveAlertsForLocation(latitude, longitude);
        
        // D. Update security profile based on data
        updateAlertsUI({ alerts });
        updateSecurityProfile(alerts);

    } catch (error) {
        console.error("Error fetching NOAA alerts:", error);
        updateAlertsUI({ error: "No se pudieron obtener las alertas." });
        // Even if alerts fail, set profile to safe as we have no warning data
        updateSecurityProfile([]); 
    }
}


/**
 * Handles geolocation errors.
 * @param {GeolocationPositionError} error
 */
function handleGeolocationError(error) {
    mapLoader.innerHTML = `<div class="text-center text-danger">Error de Geolocalización: <br> ${error.message}</div>`;
    console.error("Geolocation Error:", error.message);
    updateAlertsUI({ error: "Se requiere ubicación para buscar alertas." });
    updateSecurityProfile(null, true); // Set to unknown/error state
}

// --- Start the application ---
document.addEventListener('DOMContentLoaded', main);

