const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const soundCache = new Map();

/**
 * Decodes and caches audio data from a URL.
 * @param {string} url - The URL of the sound file.
 * @returns {Promise<AudioBuffer|null>}
 */
async function loadSound(url) {
    if (soundCache.has(url)) {
        return soundCache.get(url);
    }
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        soundCache.set(url, audioBuffer);
        return audioBuffer;
    } catch (error) {
        console.error(`Error loading sound: ${url}`, error);
        return null;
    }
}

/**
 * Plays a sound from a given URL.
 * It handles the AudioContext state and caches the sound buffer.
 * @param {string} url - The URL of the sound file to play.
 */
export async function playSound(url) {
    // User interaction (like a click) is required to start the AudioContext
    // in many browsers. We attempt to resume it here just in case it's suspended.
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    
    const buffer = await loadSound(url);
    if (buffer) {
        try {
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start(0);
        } catch (error) {
            console.error(`Error playing sound: ${url}`, error);
        }
    }
}