// --- DOM Elements ---
const statusCard = document.getElementById('status-card');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const statusReason = document.getElementById('status-reason');
const alertsContainer = document.getElementById('alerts-container');
const alertsLoadingEl = document.getElementById('alerts-loading');

const SEVERITY_LEVEL = {
    danger: 3,
    warning: 2,
    safe: 1,
    calculating: 0
};

/**
 * Determines the highest severity status from multiple sources.
 * @param {object} movementStatus - The status from movement analysis.
 * @param {Array<object>|null} alerts - Array of alert objects from NOAA.
 * @param {boolean} [isError=false] - Flag to indicate an error in fetching data.
 * @returns {{finalStatus: string, finalReason: string}}
 */
export function getFinalSecurityStatus({ movement, alerts, isError = false }) {
     // 1. Analyze Environmental Alerts
    let envStatus = { level: 'safe', reason: 'No hay alertas meteorológicas.' };
    if (isError || alerts === null) {
        envStatus = { level: 'calculating', reason: 'No se pudo verificar el estado de las alertas.' };
    } else if (alerts.length > 0) {
        const highestSeverity = alerts.reduce((max, alert) => {
            const current = alert.properties.severity.toLowerCase();
            if (current === 'extreme' || current === 'severe') return 'danger';
            if (current === 'moderate' && max !== 'danger') return 'warning';
            return max;
        }, 'safe');

        if (highestSeverity === 'danger') {
            envStatus = { level: 'danger', reason: 'Alerta ambiental de severidad Extrema/Severa.' };
        } else if (highestSeverity === 'warning') {
            envStatus = { level: 'warning', reason: 'Alerta ambiental de severidad Moderada.' };
        } else {
            envStatus = { level: 'warning', reason: 'Alerta ambiental de severidad Menor detectada.' };
        }
    }

    // 2. Get Movement Status
    const movStatus = { level: movement.status, reason: movement.reason };

    // 3. Determine Final Status (highest severity wins)
    let finalStatus, finalReason;
    if (SEVERITY_LEVEL[movStatus.level] > SEVERITY_LEVEL[envStatus.level]) {
        finalStatus = movStatus.level;
        finalReason = movStatus.reason;
    } else {
        finalStatus = envStatus.level;
        finalReason = envStatus.reason;
    }

    return { finalStatus, finalReason };
}

/**
 * Updates the security profile display based on multiple factors.
 * @param {object} data - The data for calculating security status.
 * @param {object} data.movement - The result from movement analysis.
 * @param {Array<object>|null} data.alerts - Array of alert objects from NOAA.
 * @param {boolean} [data.isError=false] - Flag to indicate an error state.
 */
export function updateSecurityProfile({ movement, alerts, isError = false }) {
    const { finalStatus, finalReason } = getFinalSecurityStatus({ movement, alerts, isError });
    setStatus(finalStatus, finalReason);
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
 * @param {string} reason - The text explaining the status.
 */
function setStatus(type, reason) {
    let text;
    switch (type) {
        case 'danger': text = 'Peligro Inminente'; break;
        case 'warning': text = 'Alerta Activa'; break;
        case 'safe': text = 'Seguro'; break;
        default: text = 'Calculando...'; break;
    }

    statusIndicator.className = `status-indicator status-${type}`;
    statusCard.className = `card mb-4 shadow status-card-${type}`;
    statusText.textContent = text;
    statusReason.textContent = reason;
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