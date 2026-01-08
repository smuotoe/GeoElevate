import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const AudioContext = createContext(null)

/**
 * Generate a simple beep/tone using Web Audio API.
 *
 * @param {AudioContext} audioCtx - The audio context
 * @param {number} frequency - Frequency in Hz
 * @param {number} duration - Duration in seconds
 * @param {string} type - Oscillator type (sine, square, triangle, sawtooth)
 * @param {number} gain - Volume (0-1)
 */
function playTone(audioCtx, frequency, duration, type = 'sine', gain = 0.3) {
    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)

    oscillator.frequency.value = frequency
    oscillator.type = type

    gainNode.gain.setValueAtTime(gain, audioCtx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration)

    oscillator.start(audioCtx.currentTime)
    oscillator.stop(audioCtx.currentTime + duration)
}

/**
 * Play a success sound (ascending tone).
 *
 * @param {AudioContext} audioCtx - The audio context
 */
function playSuccessSound(audioCtx) {
    playTone(audioCtx, 523.25, 0.1, 'sine', 0.3) // C5
    setTimeout(() => playTone(audioCtx, 659.25, 0.1, 'sine', 0.3), 100) // E5
    setTimeout(() => playTone(audioCtx, 783.99, 0.15, 'sine', 0.3), 200) // G5
}

/**
 * Play an error sound (descending tone).
 *
 * @param {AudioContext} audioCtx - The audio context
 */
function playErrorSound(audioCtx) {
    playTone(audioCtx, 311.13, 0.15, 'sawtooth', 0.2) // Eb4
    setTimeout(() => playTone(audioCtx, 261.63, 0.2, 'sawtooth', 0.2), 150) // C4
}

/**
 * Play a click sound.
 *
 * @param {AudioContext} audioCtx - The audio context
 */
function playClickSound(audioCtx) {
    playTone(audioCtx, 800, 0.05, 'square', 0.1)
}

/**
 * Play a timer warning sound.
 *
 * @param {AudioContext} audioCtx - The audio context
 */
function playTimerWarningSound(audioCtx) {
    playTone(audioCtx, 440, 0.1, 'sine', 0.2) // A4
}

/**
 * Play achievement unlock sound.
 *
 * @param {AudioContext} audioCtx - The audio context
 */
function playAchievementSound(audioCtx) {
    const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
    notes.forEach((freq, i) => {
        setTimeout(() => playTone(audioCtx, freq, 0.2, 'sine', 0.25), i * 100)
    })
}

/**
 * Audio provider component.
 *
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement} Audio provider
 */
export function AudioProvider({ children }) {
    const [soundEnabled, setSoundEnabled] = useState(() => {
        const stored = localStorage.getItem('soundEnabled')
        return stored !== null ? stored === 'true' : true
    })
    const [musicEnabled, setMusicEnabled] = useState(() => {
        const stored = localStorage.getItem('musicEnabled')
        return stored !== null ? stored === 'true' : true
    })
    const [musicPlaying, setMusicPlaying] = useState(false)
    const audioCtxRef = useRef(null)
    const musicNodesRef = useRef(null)
    const musicIntervalRef = useRef(null)

    // Initialize audio context on first user interaction
    const initAudioContext = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
        }
        // Resume if suspended (browsers require user interaction)
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume()
        }
        return audioCtxRef.current
    }, [])

    /**
     * Start ambient background music.
     * Creates a soft, looping ambient pad sound.
     */
    const startMusic = useCallback(() => {
        if (musicNodesRef.current || !musicEnabled) return

        try {
            const ctx = initAudioContext()
            if (!ctx) return

            // Create ambient pad with multiple oscillators for rich sound
            const masterGain = ctx.createGain()
            masterGain.gain.value = 0.08 // Very low volume for background

            const oscillators = []
            const notes = [130.81, 164.81, 196.00, 261.63] // C3, E3, G3, C4 - C major chord

            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator()
                const oscGain = ctx.createGain()

                osc.type = 'sine'
                osc.frequency.value = freq
                osc.detune.value = (i - 1.5) * 5 // Slight detune for warmth

                oscGain.gain.value = 0.25
                osc.connect(oscGain)
                oscGain.connect(masterGain)
                osc.start()

                oscillators.push({ osc, gain: oscGain })
            })

            masterGain.connect(ctx.destination)

            // Slowly modulate the gain for a breathing effect
            let phase = 0
            musicIntervalRef.current = setInterval(() => {
                phase += 0.05
                const modulation = 0.06 + Math.sin(phase) * 0.02
                masterGain.gain.setTargetAtTime(modulation, ctx.currentTime, 0.5)
            }, 100)

            musicNodesRef.current = { oscillators, masterGain }
            setMusicPlaying(true)
        } catch (err) {
            console.error('Failed to start music:', err)
        }
    }, [musicEnabled, initAudioContext])

    /**
     * Stop the background music.
     */
    const stopMusic = useCallback(() => {
        if (!musicNodesRef.current) return

        try {
            const { oscillators, masterGain } = musicNodesRef.current
            const ctx = audioCtxRef.current

            if (ctx) {
                // Fade out smoothly
                masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.5)

                // Stop oscillators after fade
                setTimeout(() => {
                    oscillators.forEach(({ osc }) => {
                        try {
                            osc.stop()
                        } catch {
                            // Oscillator may already be stopped
                        }
                    })
                }, 1000)
            }

            if (musicIntervalRef.current) {
                clearInterval(musicIntervalRef.current)
                musicIntervalRef.current = null
            }

            musicNodesRef.current = null
            setMusicPlaying(false)
        } catch (err) {
            console.error('Failed to stop music:', err)
        }
    }, [])

    // Handle music enabled/disabled state changes
    useEffect(() => {
        if (musicEnabled && !musicPlaying) {
            // Music was just enabled - don't auto-start, wait for user interaction
        } else if (!musicEnabled && musicPlaying) {
            stopMusic()
        }
    }, [musicEnabled, musicPlaying, stopMusic])

    // Persist settings to localStorage
    useEffect(() => {
        localStorage.setItem('soundEnabled', String(soundEnabled))
    }, [soundEnabled])

    useEffect(() => {
        localStorage.setItem('musicEnabled', String(musicEnabled))
    }, [musicEnabled])

    /**
     * Toggle sound effects on/off.
     */
    const toggleSound = useCallback(() => {
        setSoundEnabled(prev => !prev)
    }, [])

    /**
     * Toggle music on/off.
     */
    const toggleMusic = useCallback(() => {
        setMusicEnabled(prev => !prev)
    }, [])

    /**
     * Play a sound effect by name.
     *
     * @param {string} soundName - Name of the sound to play
     */
    const playSound = useCallback((soundName) => {
        if (!soundEnabled) return

        try {
            const ctx = initAudioContext()
            if (!ctx) return

            switch (soundName) {
                case 'correct':
                    playSuccessSound(ctx)
                    break
                case 'incorrect':
                    playErrorSound(ctx)
                    break
                case 'click':
                    playClickSound(ctx)
                    break
                case 'timer':
                    playTimerWarningSound(ctx)
                    break
                case 'achievement':
                    playAchievementSound(ctx)
                    break
                default:
                    console.warn(`Unknown sound: ${soundName}`)
            }
        } catch (err) {
            console.error('Failed to play sound:', err)
        }
    }, [soundEnabled, initAudioContext])

    const value = {
        soundEnabled,
        musicEnabled,
        musicPlaying,
        toggleSound,
        toggleMusic,
        playSound,
        startMusic,
        stopMusic,
        initAudioContext
    }

    return (
        <AudioContext.Provider value={value}>
            {children}
        </AudioContext.Provider>
    )
}

/**
 * Hook to access audio context.
 *
 * @returns {object} Audio context value
 */
export function useAudio() {
    const context = useContext(AudioContext)
    if (!context) {
        throw new Error('useAudio must be used within an AudioProvider')
    }
    return context
}

export default AudioContext
