import { useState } from 'react'

/**
 * Leaderboards page component.
 *
 * @returns {React.ReactElement} Leaderboards page
 */
function Leaderboards() {
    const [activeTab, setActiveTab] = useState('global')

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Leaderboards</h1>
            </div>

            <div className="tabs mb-md" style={{ display: 'flex', gap: '8px' }}>
                {['global', 'weekly', 'friends'].map(tab => (
                    <button
                        key={tab}
                        className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setActiveTab(tab)}
                        style={{ textTransform: 'capitalize' }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="card">
                <p className="text-secondary">
                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} leaderboard will be displayed here.
                </p>
            </div>
        </div>
    )
}

export default Leaderboards
