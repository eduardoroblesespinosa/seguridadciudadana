// A simple in-memory cache to avoid spamming the API for the same gridpoint
const gridpointCache = new Map();

/**
 * Fetches the specific API endpoint for alerts for a given lat/lon.
 * The NWS API requires this two-step process.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<string>} The URL for the active alert zone.
 */
async function getAlertsEndpoint(lat, lon) {
    const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    if (gridpointCache.has(cacheKey)) {
        return gridpointCache.get(cacheKey);
    }

    const response = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
    if (!response.ok) {
        if (response.status === 404) {
            // Create a custom error to be caught specifically in the app logic
            const err = new Error("El servicio de alertas meteorológicas solo está disponible en EE. UU. y sus territorios.");
            err.isCoverageError = true;
            throw err;
        }
        throw new Error(`La API de puntos de NWS falló con el estado: ${response.status}`);
    }
    const data = await response.json();
    const alertsUrl = data.properties.forecastZone;

    if (!alertsUrl) {
         throw new Error("No se pudo determinar la zona de pronóstico para las alertas.");
    }

    gridpointCache.set(cacheKey, alertsUrl);
    // Expire cache entry after 10 minutes to allow for grid updates
    setTimeout(() => gridpointCache.delete(cacheKey), 10 * 60 * 1000);

    return alertsUrl;
}

/**
 * Fetches active weather alerts for a given location from the NWS (NOAA) API.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of active alerts.
 */
export async function getActiveAlertsForLocation(lat, lon) {
    const alertZoneUrl = await getAlertsEndpoint(lat, lon);
    const alertResponse = await fetch(`${alertZoneUrl}/alerts`);

    if (!alertResponse.ok) {
        throw new Error(`La API de alertas de NWS falló con el estado: ${alertResponse.status}`);
    }

    const alertData = await alertResponse.json();
    return alertData.features || [];
}