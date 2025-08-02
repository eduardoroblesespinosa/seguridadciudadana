const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const soundCache = new Map();
const activeSounds = new Map(); // To keep track of playing sound sources

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
 * @param {boolean} [loop=false] - Whether the sound should loop.
 */
export async function playSound(url, loop = false) {
    // User interaction (like a click) is required to start the AudioContext
    // in many browsers. We attempt to resume it here just in case it's suspended.
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    
    // Stop any existing sound playing from the same URL before starting a new one
    if (activeSounds.has(url)) {
        stopSound(url);
    }

    const buffer = await loadSound(url);
    if (buffer) {
        try {
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.loop = loop;
            source.connect(audioContext.destination);
            source.start(0);
            activeSounds.set(url, source); // Store the source to be able to stop it later
        } catch (error) {
            console.error(`Error playing sound: ${url}`, error);
        }
    }
}

/**
 * Stops a sound that is currently playing.
 * @param {string} url - The URL of the sound file to stop.
 */
export function stopSound(url) {
    if (activeSounds.has(url)) {
        const source = activeSounds.get(url);
        source.stop();
        source.disconnect();
        activeSounds.delete(url);
    }
}