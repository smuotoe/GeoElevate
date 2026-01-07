/**
 * Dialog component for unsaved changes warning.
 *
 * @param {object} props - Component props
 * @param {boolean} props.isOpen - Whether dialog is open
 * @param {function} props.onConfirm - Handler for confirm (leave page)
 * @param {function} props.onCancel - Handler for cancel (stay on page)
 * @param {string} props.message - Warning message to display
 * @returns {React.ReactElement|null} Dialog component or null
 */
function UnsavedChangesDialog({ isOpen, onConfirm, onCancel, message }) {
    if (!isOpen) return null

    return (
        <div
            className="modal-overlay"
            onClick={onCancel}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}
        >
            <div
                className="modal"
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--surface)',
                    borderRadius: '12px',
                    padding: '24px',
                    maxWidth: '400px',
                    width: '90%'
                }}
            >
                <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
                    Unsaved Changes
                </h2>
                <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>
                    {message || 'You have unsaved changes. Are you sure you want to leave?'}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={onCancel}
                    >
                        Stay
                    </button>
                    <button
                        className="btn"
                        onClick={onConfirm}
                        style={{ background: 'var(--error)', color: 'white' }}
                    >
                        Leave
                    </button>
                </div>
            </div>
        </div>
    )
}

export default UnsavedChangesDialog
