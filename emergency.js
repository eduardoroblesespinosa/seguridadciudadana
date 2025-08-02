/**
 * A database of emergency numbers by ISO 3166-1 alpha-2 country code.
 * This is not exhaustive and focuses on the primary all-services number where available.
 * Data sourced from Wikipedia and other public resources.
 */
const emergencyNumbersDB = {
    // North America
    'US': { name: 'Estados Unidos', numbers: { all: '911' } },
    'CA': { name: 'Canadá', numbers: { all: '911' } },
    'MX': { name: 'México', numbers: { all: '911' } },
    // South America
    'AR': { name: 'Argentina', numbers: { all: '911' } }, // 911 in many areas
    'BO': { name: 'Bolivia', numbers: { all: '110' } },
    'BR': { name: 'Brasil', numbers: { all: '190' } },
    'CL': { name: 'Chile', numbers: { all: '133' } },
    'CO': { name: 'Colombia', numbers: { all: '123' } },
    'EC': { name: 'Ecuador', numbers: { all: '911' } },
    'PY': { name: 'Paraguay', numbers: { all: '911' } },
    'PE': { name: 'Perú', numbers: { all: '105' } },
    'UY': { name: 'Uruguay', numbers: { all: '911' } },
    'VE': { name: 'Venezuela', numbers: { all: '911' } },
    // Europe (112 is standard)
    'ES': { name: 'España', numbers: { all: '112' } },
    'FR': { name: 'Francia', numbers: { all: '112' } },
    'DE': { name: 'Alemania', numbers: { all: '112' } },
    'IT': { name: 'Italia', numbers: { all: '112' } },
    'GB': { name: 'Reino Unido', numbers: { all: '999' } }, // or 112
    'PT': { name: 'Portugal', numbers: { all: '112' } },
    // Asia
    'JP': { name: 'Japón', numbers: { all: '110' } },
    'CN': { name: 'China', numbers: { all: '110' } },
    'IN': { name: 'India', numbers: { all: '112' } },
    // Oceania
    'AU': { name: 'Australia', numbers: { all: '000' } },
    'NZ': { name: 'Nueva Zelanda', numbers: { all: '111' } },
};

const geoCache = new Map();

/**
 * Fetches emergency service information for a given location.
 * Uses reverse geocoding to find the country, then looks up in the local DB.
 * @param {number} lat Latitude
 * @param {number} lon Longitude
 * @returns {Promise<{countryName: string, numbers: {all: string}}|null>}
 */
export async function getEmergencyInfo(lat, lon) {
    const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
    if (geoCache.has(cacheKey)) {
        return geoCache.get(cacheKey);
    }

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=es`);
        if (!response.ok) {
            throw new Error(`Nominatim API failed with status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data && data.address && data.address.country_code) {
            const countryCode = data.address.country_code.toUpperCase();
            const emergencyData = emergencyNumbersDB[countryCode];
            
            if (emergencyData) {
                const result = {
                    countryName: emergencyData.name,
                    numbers: emergencyData.numbers
                };
                geoCache.set(cacheKey, result);
                 // Expire cache entry after 1 hour
                setTimeout(() => geoCache.delete(cacheKey), 60 * 60 * 1000);
                return result;
            }
        }
        return null;
    } catch (error) {
        console.error("Error fetching or processing reverse geocoding data:", error);
        return null;
    }
}