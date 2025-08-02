// --- State ---
let lastPosition = null;
let manualSOS = false;

// --- Constants ---
const HIGH_SPEED_THRESHOLD_KMH = 80; // Speed considered "high"
const SUDDEN_STOP_SPEED_KMH = 10;   // Speed considered "stopped"

/**
 * Analyzes user movement to detect potentially dangerous patterns.
 * @param {GeolocationPosition} position - The latest position object from the browser.
 * @returns {{status: string, reason: string}} An object with the security status and a reason.
 */
export function analyzeMovement(position) {
    if (manualSOS) {
        return { status: 'danger', reason: 'Señal de S.O.S. manual activada por el usuario.' };
    }

    if (!position.coords || typeof position.coords.speed !== 'number' || position.coords.speed === null) {
        return { status: 'calculating', reason: 'Datos de velocidad no disponibles.' };
    }

    const currentSpeedKmh = position.coords.speed * 3.6;

    let movementStatus = { status: 'safe', reason: 'Movimiento normal detectado.' };

    // --- Warning Condition: Sustained high speed ---
    if (currentSpeedKmh > HIGH_SPEED_THRESHOLD_KMH) {
        movementStatus = { status: 'warning', reason: `Movimiento a ${currentSpeedKmh.toFixed(0)} km/h detectado.` };
    }

    if (!lastPosition) {
        // First data point, establish a baseline but don't check for stops yet.
        lastPosition = position;
        return movementStatus; // Return current status (safe or warning)
    }

    const lastSpeedKmh = lastPosition.coords.speed * 3.6;

    // --- Danger Condition: Sudden stop from high speed ---
    if (lastSpeedKmh > HIGH_SPEED_THRESHOLD_KMH && currentSpeedKmh < SUDDEN_STOP_SPEED_KMH) {
        movementStatus = { status: 'danger', reason: 'Parada brusca detectada desde alta velocidad.' };
    }
    
    // Update state for the next analysis
    lastPosition = position;
    
    return movementStatus;
}


/**
 * Allows external modules to trigger a manual S.O.S. state.
 * @param {boolean} isActive 
 */
export function setManualSOS(isActive) {
    manualSOS = isActive;
}