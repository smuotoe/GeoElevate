const fs = require('fs');
const path = 'C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/GamePlay.jsx';
let content = fs.readFileSync(path, 'utf8');

// Edit 1: Add gameStats state after selectedRegion
content = content.replace(
  "const [selectedRegion, setSelectedRegion] = useState('')\n\n    const timerRef",
  "const [selectedRegion, setSelectedRegion] = useState('')\n    const [gameStats, setGameStats] = useState({ xpEarned: 0, avgTimeMs: 0 })\n\n    const timerRef"
);

// Edit 2: Add setGameStats call in moveToNext before the try block
content = content.replace(
  'const xpEarned = Math.round(scoreToUse * 0.1)\n\n                try {',
  'const xpEarned = Math.round(scoreToUse * 0.1)\n\n                setGameStats({ xpEarned, avgTimeMs })\n\n                try {'
);

// Edit 3: Update the finished state UI
const oldFinishedUI = `if (gameState === 'finished') {
        const correctCount = answers.filter(a => a.isCorrect).length
        const accuracy = Math.round((correctCount / answers.length) * 100)

        return (
            <div className="page">
                <div className="page-header">
                    <Breadcrumb items={breadcrumbItems} />
                    <h1 className="page-title">Game Complete!</h1>
                </div>
                <div className={styles.resultsCard}>
                    <div className={styles.scoreDisplay}>
                        <span className={styles.scoreValue}>{score}</span>
                        <span className={styles.scoreLabel}>Points</span>
                    </div>
                    <div className={styles.statsGrid}>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>{correctCount}/{answers.length}</span>
                            <span className={styles.statLabel}>Correct</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>{accuracy}%</span>
                            <span className={styles.statLabel}>Accuracy</span>
                        </div>
                    </div>
                    <div className={styles.buttonGroup}>
                        <button className="btn btn-secondary" onClick={() => navigate('/games')}>
                            Back to Games
                        </button>
                        <button className="btn btn-primary" onClick={handleRestart}>
                            Play Again
                        </button>
                    </div>
                </div>
            </div>
        )
    }`;

const newFinishedUI = `if (gameState === 'finished') {
        const correctCount = answers.filter(a => a.isCorrect).length
        const accuracy = Math.round((correctCount / answers.length) * 100)
        const avgTimeSec = (gameStats.avgTimeMs / 1000).toFixed(1)

        return (
            <div className="page">
                <div className="page-header">
                    <Breadcrumb items={breadcrumbItems} />
                    <h1 className="page-title">Game Complete!</h1>
                </div>
                <div className={styles.resultsCard}>
                    <div className={styles.scoreDisplay}>
                        <span className={styles.scoreValue}>{score}</span>
                        <span className={styles.scoreLabel}>Points</span>
                    </div>
                    <div className={styles.statsGrid}>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>+{gameStats.xpEarned}</span>
                            <span className={styles.statLabel}>XP Earned</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>{correctCount}/{answers.length}</span>
                            <span className={styles.statLabel}>Correct</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>{accuracy}%</span>
                            <span className={styles.statLabel}>Accuracy</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>{avgTimeSec}s</span>
                            <span className={styles.statLabel}>Avg Time</span>
                        </div>
                    </div>
                    <div className={styles.buttonGroup}>
                        <button className="btn btn-secondary" onClick={() => navigate('/games')}>
                            Back to Games
                        </button>
                        <button className="btn btn-primary" onClick={handleRestart}>
                            Play Again
                        </button>
                    </div>
                </div>
            </div>
        )
    }`;

content = content.replace(oldFinishedUI, newFinishedUI);

fs.writeFileSync(path, content);
console.log('File updated successfully');
