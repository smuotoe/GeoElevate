// Script to update frontend to handle XP cap
import fs from 'fs';

const filePath = './frontend/src/pages/GamePlay.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Check if already updated
if (content.includes('xpCapInfo')) {
    console.log('Frontend already updated for XP cap');
    process.exit(0);
}

// 1. Update state to include xpCapInfo
content = content.replace(
    "const [gameStats, setGameStats] = useState({ xpEarned: 0, avgTimeMs: 0 })",
    "const [gameStats, setGameStats] = useState({ xpEarned: 0, avgTimeMs: 0, xpCapInfo: null })"
);

// 2. Update the session save to use response xpEarned and store xpCapInfo
const oldSave = `                try {
                    await api.patch(\`/games/sessions/\${sessionId}\`, {
                        score: scoreToUse,
                        xpEarned,
                        correctCount,
                        averageTimeMs: avgTimeMs,
                        answers: answersToUse
                    })
                    // Refresh user data to update streak and XP in context
                    await checkAuth()
                } catch (saveErr) {
                    console.error('Failed to save session:', saveErr)
                }`;

const newSave = `                try {
                    const response = await api.patch(\`/games/sessions/\${sessionId}\`, {
                        score: scoreToUse,
                        xpEarned,
                        correctCount,
                        averageTimeMs: avgTimeMs,
                        answers: answersToUse
                    })
                    // Use actual XP earned from server (may be capped)
                    if (response.xpEarned !== undefined) {
                        setGameStats(prev => ({
                            ...prev,
                            xpEarned: response.xpEarned,
                            xpCapInfo: response.xpCapInfo || null
                        }))
                    }
                    // Refresh user data to update streak and XP in context
                    await checkAuth()
                } catch (saveErr) {
                    console.error('Failed to save session:', saveErr)
                }`;

content = content.replace(oldSave, newSave);

// 3. Find the finished screen and add XP cap message display
// Look for the XP earned display section
const oldXpDisplay = `                            <span className={styles.statValue}>+{gameStats.xpEarned}</span>`;
const newXpDisplay = `                            <span className={styles.statValue}>+{gameStats.xpEarned}</span>
                            {gameStats.xpCapInfo && (
                                <span className={styles.xpCapWarning}>
                                    {gameStats.xpCapInfo.message}
                                </span>
                            )}`;

content = content.replace(oldXpDisplay, newXpDisplay);

fs.writeFileSync(filePath, content);
console.log('Frontend updated for XP cap successfully');
