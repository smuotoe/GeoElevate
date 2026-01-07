import { useNavigate } from 'react-router-dom'

const FAQ_ITEMS = [
    {
        question: 'How do I earn XP?',
        answer: 'You earn XP by playing games, completing daily challenges, maintaining streaks, and unlocking achievements. The more questions you answer correctly and the faster you answer, the more XP you earn.'
    },
    {
        question: 'What are streaks?',
        answer: 'Streaks track your consecutive days of activity. Play at least one game each day to maintain your streak. Longer streaks unlock bonus XP and special achievements.'
    },
    {
        question: 'How do achievements work?',
        answer: 'Achievements are badges you earn by reaching milestones like playing a certain number of games, achieving high accuracy, or completing challenges. Each achievement awards bonus XP.'
    },
    {
        question: 'Can I play without an account?',
        answer: 'Yes! You can play all solo games as a guest. However, to save your progress, compete on leaderboards, add friends, and access multiplayer features, you need to create an account.'
    },
    {
        question: 'How do I add friends?',
        answer: 'Navigate to your profile and tap "Friends". You can search for other users by username and send friend requests. Once accepted, you can see their stats and challenge them to games.'
    },
    {
        question: 'What game types are available?',
        answer: 'GeoElevate offers five game types: Flags (identify countries by their flags), Capitals (match countries with capitals), Maps (find countries on the map), Languages (learn which languages are spoken where), and Trivia (geography facts and knowledge).'
    },
    {
        question: 'How is my score calculated?',
        answer: 'Your score is based on correct answers (100 points base), speed bonus (up to 150 points for fast answers), and streak multipliers. Wrong answers or timeouts reset your streak bonus.'
    },
    {
        question: 'Can I change my username?',
        answer: 'Currently, usernames cannot be changed after registration. Please choose your username carefully when creating your account.'
    },
    {
        question: 'How do I delete my account?',
        answer: 'Go to Settings > Privacy & Data > Delete Account. You will need to enter your password to confirm. Note: This action is permanent and cannot be undone.'
    },
    {
        question: 'Is my data secure?',
        answer: 'Yes! We use secure authentication and encrypt sensitive data. We never share your personal information with third parties.'
    }
]

/**
 * Help/FAQ page component.
 *
 * @returns {React.ReactElement} Help page
 */
function Help() {
    const navigate = useNavigate()

    return (
        <div className="page">
            <div className="page-header">
                <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                    Back
                </button>
                <h1 className="page-title">Help & FAQ</h1>
                <div style={{ width: 60 }} />
            </div>

            <section className="card mb-md">
                <h3 className="mb-md">Frequently Asked Questions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {FAQ_ITEMS.map((item, index) => (
                        <details
                            key={index}
                            style={{
                                backgroundColor: 'var(--surface)',
                                borderRadius: '8px',
                                padding: '12px 16px'
                            }}
                        >
                            <summary
                                style={{
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    color: 'var(--text-primary)',
                                    listStyle: 'none',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                {item.question}
                                <span style={{ color: 'var(--primary)' }}>+</span>
                            </summary>
                            <p
                                style={{
                                    marginTop: '12px',
                                    color: 'var(--text-secondary)',
                                    lineHeight: '1.5'
                                }}
                            >
                                {item.answer}
                            </p>
                        </details>
                    ))}
                </div>
            </section>

            <section className="card mb-md">
                <h3 className="mb-md">Contact Support</h3>
                <p className="text-secondary mb-md">
                    Need more help? Our support team is here for you.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <a
                        href="mailto:support@geoelevate.com"
                        className="btn btn-secondary"
                        style={{ textDecoration: 'none', textAlign: 'center' }}
                    >
                        Email Support
                    </a>
                </div>
            </section>

            <section className="card">
                <h3 className="mb-md">About GeoElevate</h3>
                <p className="text-secondary">
                    GeoElevate is a geography learning app designed to help you explore
                    the world through interactive games and challenges. Learn about
                    countries, capitals, flags, languages, and more while having fun!
                </p>
                <p className="text-secondary mt-md" style={{ fontSize: '14px' }}>
                    Version 1.0.0
                </p>
            </section>
        </div>
    )
}

export default Help
