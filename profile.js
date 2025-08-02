// --- DOM Elements ---
const statusCard = document.getElementById('status-card');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const alertsContainer = document.getElementById('alerts-container');
const alertsLoadingEl = document.getElementById('alerts-loading');


/**
 * Updates the security profile display based on active alerts.
 * @param {Array<Object> | null} alerts - Array of alert objects from NOAA. Null if error.
 * @param {boolean} isError - Flag to indicate an error state.
 */
export function updateSecurityProfile(alerts, isError = false) {
    if (isError || alerts === null) {
        setStatus('calculating', 'Estado Desconocido');
        return;
    }

    if (alerts.length === 0) {
        setStatus('safe', 'Seguro');
        return;
    }

    // Determine the highest severity level from all active alerts.
    const severity = alerts.reduce((maxSeverity, alert) => {
        const currentSeverity = alert.properties.severity.toLowerCase();
        if (currentSeverity === 'extreme' || currentSeverity === 'severe') {
            return 'danger';
        }
        if (currentSeverity === 'moderate' && maxSeverity !== 'danger') {
            return 'warning';
        }
        return maxSeverity; // Keep current max if new one is lower
    }, 'safe'); // Default to safe and upgrade if severe alerts are found

    if (severity === 'danger') {
        setStatus('danger', 'Peligro Inminente');
    } else if (severity === 'warning') {
        setStatus('warning', 'Alerta Activa');
    } else {
        // Covers 'minor' or other severities
        setStatus('warning', 'Precaución');
    }
}

/**
 * Updates the UI for the environmental alerts section.
 * @param {object} options - Options for updating the UI.
 * @param {boolean} [options.loading] - Show loading state.
 * @param {Array<object>} [options.alerts] - Display these alerts.
 * @param {string} [options.error] - Display an error message.
 */
export function updateAlertsUI({ loading = false, alerts = null, error = null }) {
    if (loading) {
        alertsLoadingEl.style.display = 'block';
        alertsLoadingEl.textContent = 'Buscando alertas...';
        alertsContainer.innerHTML = '';
        alertsContainer.appendChild(alertsLoadingEl);
        return;
    }

    alertsLoadingEl.style.display = 'none';
    alertsContainer.innerHTML = ''; // Clear previous alerts

    if (error) {
        alertsContainer.innerHTML = `<p class="text-secondary">${error}</p>`;
        return;
    }

    if (alerts && alerts.length > 0) {
        const list = document.createElement('ul');
        list.className = 'list-unstyled';
        alerts.forEach(alert => {
            const item = document.createElement('li');
            item.className = `mb-2 p-2 rounded small ${getAlertColorClass(alert.properties.severity)}`;
            item.textContent = alert.properties.event;
            list.appendChild(item);
        });
        alertsContainer.appendChild(list);
    } else {
        alertsContainer.innerHTML = '<p class="text-secondary">No hay alertas activas en su zona.</p>';
    }
}


/**
 * Helper to set the visual status on the profile card.
 * @param {string} type - 'safe', 'warning', 'danger', or 'calculating'
 * @param {string} text - The text to display.
 */
function setStatus(type, text) {
    statusIndicator.className = `status-indicator status-${type}`;
    statusCard.className = `card mb-4 shadow status-card-${type}`;
    statusText.textContent = text;
}

/**
 * Maps NOAA alert severity to a Bootstrap background color class.
 * @param {string} severity - The severity from the NOAA alert.
 * @returns {string} A CSS class name.
 */
function getAlertColorClass(severity) {
    switch (severity.toLowerCase()) {
        case 'extreme':
        case 'severe':
            return 'bg-danger bg-opacity-25';
        case 'moderate':
            return 'bg-warning bg-opacity-25';
        case 'minor':
            return 'bg-info bg-opacity-25';
        default:
            return 'bg-secondary bg-opacity-25';
    }
}

