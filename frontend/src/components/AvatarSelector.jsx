import { useState } from 'react'
import Modal from './Modal'

/**
 * Preset avatar options for user selection.
 * Uses emoji-based avatars for simplicity.
 */
const PRESET_AVATARS = [
    { id: 'globe', emoji: '\uD83C\uDF0D', label: 'Globe' },
    { id: 'earth-americas', emoji: '\uD83C\uDF0E', label: 'Americas' },
    { id: 'earth-asia', emoji: '\uD83C\uDF0F', label: 'Asia' },
    { id: 'compass', emoji: '\uD83E\uDDED', label: 'Compass' },
    { id: 'map', emoji: '\uD83D\uDDFA', label: 'Map' },
    { id: 'mountain', emoji: '\uD83C\uDFD4', label: 'Mountain' },
    { id: 'island', emoji: '\uD83C\uDFDD', label: 'Island' },
    { id: 'castle', emoji: '\uD83C\uDFF0', label: 'Castle' },
    { id: 'rocket', emoji: '\uD83D\uDE80', label: 'Rocket' },
    { id: 'star', emoji: '\u2B50', label: 'Star' },
    { id: 'fire', emoji: '\uD83D\uDD25', label: 'Fire' },
    { id: 'trophy', emoji: '\uD83C\uDFC6', label: 'Trophy' },
    { id: 'medal', emoji: '\uD83C\uDFC5', label: 'Medal' },
    { id: 'crown', emoji: '\uD83D\uDC51', label: 'Crown' },
    { id: 'gem', emoji: '\uD83D\uDC8E', label: 'Gem' },
    { id: 'lightning', emoji: '\u26A1', label: 'Lightning' },
]

/**
 * Background color options for avatars.
 */
const AVATAR_COLORS = [
    '#00D9FF', // Primary cyan
    '#4ECDC4', // Secondary teal
    '#FF6B6B', // Coral
    '#FFE66D', // Gold
    '#A855F7', // Purple
    '#22C55E', // Green
    '#F97316', // Orange
    '#EC4899', // Pink
]

/**
 * Avatar selector component with preset options.
 *
 * @param {object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {function} props.onClose - Close modal callback
 * @param {function} props.onSelect - Avatar selection callback (receives avatar object)
 * @param {string} props.currentAvatar - Current avatar identifier
 * @returns {React.ReactElement} Avatar selector modal
 */
function AvatarSelector({ isOpen, onClose, onSelect, currentAvatar }) {
    const [selectedEmoji, setSelectedEmoji] = useState(
        PRESET_AVATARS.find(a => a.id === currentAvatar)?.id || 'globe'
    )
    const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0])

    /**
     * Handle save button click.
     */
    function handleSave() {
        const avatar = PRESET_AVATARS.find(a => a.id === selectedEmoji)
        if (avatar) {
            onSelect({
                id: avatar.id,
                emoji: avatar.emoji,
                color: selectedColor,
            })
        }
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Choose Avatar">
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <div style={{ marginBottom: '20px' }}>
                    <h4 style={{
                        marginBottom: '12px',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}>
                        Select Icon
                    </h4>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '8px'
                    }}>
                        {PRESET_AVATARS.map((avatar) => (
                            <button
                                key={avatar.id}
                                onClick={() => setSelectedEmoji(avatar.id)}
                                aria-label={avatar.label}
                                style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '12px',
                                    border: selectedEmoji === avatar.id
                                        ? '3px solid var(--primary)'
                                        : '2px solid var(--border)',
                                    backgroundColor: 'var(--surface)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '28px',
                                    transition: 'transform 0.1s, border-color 0.2s',
                                }}
                            >
                                {avatar.emoji}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <h4 style={{
                        marginBottom: '12px',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}>
                        Select Color
                    </h4>
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px'
                    }}>
                        {AVATAR_COLORS.map((color) => (
                            <button
                                key={color}
                                onClick={() => setSelectedColor(color)}
                                aria-label={`Color ${color}`}
                                style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '50%',
                                    border: selectedColor === color
                                        ? '3px solid var(--text-primary)'
                                        : '2px solid transparent',
                                    backgroundColor: color,
                                    cursor: 'pointer',
                                    transition: 'transform 0.1s',
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <h4 style={{
                        marginBottom: '12px',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}>
                        Preview
                    </h4>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            backgroundColor: selectedColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '40px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                        }}>
                            {PRESET_AVATARS.find(a => a.id === selectedEmoji)?.emoji}
                        </div>
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                    >
                        Save Avatar
                    </button>
                </div>
            </div>
        </Modal>
    )
}

export default AvatarSelector
