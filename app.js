import { generateCSC } from 'csc';
import { initMap, updateUserPosition, createUserMarker } from 'map';
import { getActiveAlertsForLocation } from 'noaa';
import { updateSecurityProfile, updateAlertsUI } from 'profile';
import { analyzeMovement, setManualSOS } from 'security';
import { playSound } from 'audio';

// --- DOM Elements ---
const cscCodeEl = document.getElementById('csc-code');
const coordinatesEl = document.getElementById('coordinates');
const mapLoader = document.getElementById('map-loader');
const sosButton = document.getElementById('sos-button');

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
    // Marker will be created on the first successful geolocation update.

    // 3. Set up S.O.S button
    sosButton.addEventListener('click', () => {
        setManualSOS(true);
        // We can immediately update the profile to reflect the S.O.S.
        // The next position update will solidify this state.
        updateSecurityProfile({
            movement: { status: 'danger', reason: 'Se activó la señal de S.O.S.' },
            alerts: [] // Assume no new alerts until next update
        });
    });

    // 4. Request geolocation and start tracking
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

    // Hide loader and play sound on first successful location
    if (mapLoader.style.display !== 'none') {
        playSound('gps_lock.mp3');
        mapLoader.style.display = 'none';
    }

    // A. Update UI with coordinates
    coordinatesEl.textContent = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

    // B. Update map: create marker on first run, then just update its position
    if (!userMarker) {
        userMarker = createUserMarker(map, latitude, longitude);
        map.setView([latitude, longitude], 15);
    } else {
        updateUserPosition(map, userMarker, latitude, longitude);
    }

    // C. Analyze movement patterns
    const movementStatus = analyzeMovement(position);

    // D. Fetch environmental data from NOAA
    try {
        updateAlertsUI({ loading: true });
        const alerts = await getActiveAlertsForLocation(latitude, longitude);
        
        // E. Update security profile based on combined data
        updateAlertsUI({ alerts });
        updateSecurityProfile({ movement: movementStatus, alerts });

    } catch (error) {
        console.error("Error fetching NOAA alerts:", error);
        const errorMessage = error.isCoverageError ? error.message : "No se pudieron obtener las alertas.";
        updateAlertsUI({ error: errorMessage });
        // If alerts fail, we can still update the profile with movement data
        updateSecurityProfile({ movement: movementStatus, alerts: null, isError: true });
    }
}

/**
 * Handles geolocation errors.
 * @param {GeolocationPositionError} error
 */
function handleGeolocationError(error) {
    let userMessage = error.message;
    // Provide more helpful messages for common errors
    if (error.code) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                userMessage = "Se denegó el permiso de ubicación. Por favor, habilítelo en la configuración de su navegador y dispositivo para continuar.";
                break;
            case error.POSITION_UNAVAILABLE:
                userMessage = "La información de ubicación no está disponible. Asegúrese de que el GPS de su dispositivo esté activado.";
                break;
            case error.TIMEOUT:
                userMessage = "La solicitud de ubicación tardó demasiado. Intente moverse a un área con mejor señal de GPS.";
                break;
        }
    }

    mapLoader.innerHTML = `<div class="text-center text-danger p-3">
        <h5 class="mb-2">Error de Geolocalización</h5>
        <p class="small">${userMessage}</p>
    </div>`;
    console.error("Geolocation Error:", error);
    updateAlertsUI({ error: "Se requiere ubicación para buscar alertas." });
    // Set to unknown/error state, movement is also unknown
    updateSecurityProfile({
        movement: { status: 'calculating', reason: 'Error de geolocalización.' },
        alerts: null,
        isError: true
    });
}

// --- Start the application ---
document.addEventListener('DOMContentLoaded', main);