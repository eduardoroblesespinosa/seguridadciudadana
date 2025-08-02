/**
 * Generates a unique Citizen Security Code (CSC).
 * For this demo, it's a combination of a prefix and a random alphanumeric string.
 * @returns {string} The generated CSC.
 */
export function generateCSC() {
    const prefix = "CSC";
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${randomPart}`;
}

