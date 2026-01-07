import { useNavigate } from 'react-router-dom'

/**
 * Friends page component.
 *
 * @returns {React.ReactElement} Friends page
 */
function Friends() {
    const navigate = useNavigate()

    return (
        <div className="page">
            <div className="page-header">
                <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                    Back
                </button>
                <h1 className="page-title">Friends</h1>
                <button className="btn btn-primary">
                    Add
                </button>
            </div>

            <div className="card">
                <p className="text-secondary">
                    No friends yet. Add friends to challenge them to multiplayer matches!
                </p>
            </div>
        </div>
    )
}

export default Friends
