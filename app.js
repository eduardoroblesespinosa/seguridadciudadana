import { generateCSC } from 'csc';
import { initMap, updateUserPosition, createUserMarker } from 'map';
import { getActiveAlertsForLocation } from 'noaa';
import { updateSecurityProfile, getFinalSecurityStatus, updateAlertsUI } from 'profile';
import { analyzeMovement, toggleManualSOS, isManualSOSActive } from 'security';
import { playSound, stopSound } from 'audio';
import { getEmergencyInfo } from 'emergency';

// --- DOM Elements ---
const cscCodeEl = document.getElementById('csc-code');
const coordinatesEl = document.getElementById('coordinates');
const mapLoader = document.getElementById('map-loader');
const sosButton = document.getElementById('sos-button');

// --- Emergency Modal Elements ---
const emergencyModalEl = document.getElementById('emergency-modal');
const emergencyReasonEl = document.getElementById('emergency-reason');
const emergencyCountryEl = document.getElementById('emergency-country');
const emergencyNumberEl = document.getElementById('emergency-number');
const emergencyCallLink = document.getElementById('emergency-call-link');
const cancelEmergencyButton = document.getElementById('cancel-emergency-button');

// --- State ---
let userMarker = null;
let map = null;
let emergencyModal = null;
let emergencyState = {
    isTriggered: false,
    reason: '',
};

/**
 * Main application initializer
 */
function main() {
    // 1. Generate and display the Citizen Security Code
    const csc = generateCSC();
    cscCodeEl.textContent = csc;

    // 2. Initialize the map
    map = initMap();
    emergencyModal = new bootstrap.Modal(emergencyModalEl);

    // 3. Set up S.O.S button
    sosButton.addEventListener('click', handleSOSClick);
    cancelEmergencyButton.addEventListener('click', dismissEmergency);

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
 * Checks the overall security status and triggers or dismisses the emergency modal.
 * @param {object} statusData - The combined data for status calculation.
 * @param {GeolocationPosition|null} position - The current position, if available.
 */
async function checkEmergencyState(statusData, position) {
    const { finalStatus, finalReason } = getFinalSecurityStatus(statusData);

    if (finalStatus === 'danger' && !emergencyState.isTriggered) {
        // --- TRIGGER EMERGENCY ---
        emergencyState.isTriggered = true;
        emergencyState.reason = finalReason;
        playSound('alarm.mp3', true); // Play alarm on loop

        // Update modal UI and show it
        emergencyReasonEl.textContent = finalReason;
        emergencyModal.show();

        // If we have a location, try to find the local emergency number
        if (position) {
            try {
                const info = await getEmergencyInfo(position.coords.latitude, position.coords.longitude);
                if (info && info.numbers.all) {
                    emergencyCountryEl.textContent = info.countryName;
                    emergencyNumberEl.textContent = info.numbers.all;
                    emergencyCallLink.href = `tel:${info.numbers.all}`;
                } else {
                    throw new Error("No se encontró el número de emergencia local.");
                }
            } catch (err) {
                console.warn("Could not get local emergency number:", err);
                // Fallback to defaults
                emergencyCountryEl.textContent = 'su ubicación';
                emergencyNumberEl.textContent = '911';
                emergencyCallLink.href = 'tel:911';
            }
        }
    } else if (finalStatus !== 'danger' && emergencyState.isTriggered) {
        // --- DISMISS EMERGENCY ---
        // This case handles when the condition resolves itself (e.g., user starts moving again)
        dismissEmergency();
    }
}

/**
 * Handles clicks on the main S.O.S. button.
 */
function handleSOSClick() {
    const isActive = toggleManualSOS();
    sosButton.classList.toggle('active', isActive);
    sosButton.setAttribute('aria-label', isActive ? 'Cancelar S.O.S.' : 'Activar S.O.S.');

    if (!isActive && emergencyState.isTriggered) {
        // If the user manually cancels an active SOS, dismiss the emergency
        dismissEmergency();
    }
    
    // Manually trigger a position update to re-evaluate the security status immediately
    // This will either trigger or dismiss the emergency modal via checkEmergencyState
    forceUpdate();
}

/**
 * Dismisses the emergency modal and resets the state.
 */
function dismissEmergency() {
    emergencyState.isTriggered = false;
    emergencyState.reason = '';
    stopSound('alarm.mp3');
    emergencyModal.hide();

    // If the emergency was triggered by manual SOS, we should turn it off.
    if (isManualSOSActive()) {
        toggleManualSOS(); // this returns the new state, which is false
        sosButton.classList.remove('active');
        sosButton.setAttribute('aria-label', 'Activar S.O.S.');
    }
}

/**
 * Forces a re-evaluation of the user's position and security status.
 */
function forceUpdate() {
    navigator.geolocation.getCurrentPosition(
        handlePositionUpdate,
        handleGeolocationError,
        { enableHighAccuracy: true, timeout: 5000 }
    );
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
    let alerts = [];
    let isError = false;
    try {
        updateAlertsUI({ loading: true });
        alerts = await getActiveAlertsForLocation(latitude, longitude);
        updateAlertsUI({ alerts });
    } catch (error) {
        console.error("Error fetching NOAA alerts:", error);
        isError = true;
        const errorMessage = error.isCoverageError ? error.message : "No se pudieron obtener las alertas.";
        updateAlertsUI({ error: errorMessage });
    }

    // E. Update security profile and check for emergency conditions
    const statusData = { movement: movementStatus, alerts, isError };
    updateSecurityProfile(statusData);
    checkEmergencyState(statusData, position);
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
    const statusData = {
        movement: { status: 'calculating', reason: 'Error de geolocalización.' },
        alerts: null,
        isError: true
    };
    updateSecurityProfile(statusData);
    checkEmergencyState(statusData, null);
}

// --- Start the application ---
document.addEventListener('DOMContentLoaded', main);