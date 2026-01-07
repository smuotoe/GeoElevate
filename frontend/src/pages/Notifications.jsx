/**
 * Notifications page component.
 *
 * @returns {React.ReactElement} Notifications page
 */
function Notifications() {
    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Notifications</h1>
            </div>

            <div className="card">
                <p className="text-secondary">
                    No notifications yet. Your friend requests, match invites, and
                    achievement unlocks will appear here.
                </p>
            </div>
        </div>
    )
}

export default Notifications
