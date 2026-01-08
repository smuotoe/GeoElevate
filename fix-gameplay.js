const fs = require('fs');
const path = 'C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/GamePlay.jsx';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: Add checkAuth to useAuth destructuring
content = content.replace(
    'const { user } = useAuth()',
    'const { user, checkAuth } = useAuth()'
);

// Fix 2: Call checkAuth after saving the session
content = content.replace(
    `await api.patch(\`/games/sessions/\${sessionId}\`, {
                        score,
                        xpEarned,
                        correctCount,
                        averageTimeMs: avgTimeMs,
                        answers: [...answers, {
                            question: currentQuestion,
                            userAnswer: selectedAnswer,
                            correctAnswer: currentQuestion?.correctAnswer,
                            isCorrect: selectedAnswer === currentQuestion?.correctAnswer,
                            timeMs: (QUESTION_TIME - timeLeft) * 1000
                        }]
                    })
                } catch (saveErr) {`,
    `await api.patch(\`/games/sessions/\${sessionId}\`, {
                        score,
                        xpEarned,
                        correctCount,
                        averageTimeMs: avgTimeMs,
                        answers: [...answers, {
                            question: currentQuestion,
                            userAnswer: selectedAnswer,
                            correctAnswer: currentQuestion?.correctAnswer,
                            isCorrect: selectedAnswer === currentQuestion?.correctAnswer,
                            timeMs: (QUESTION_TIME - timeLeft) * 1000
                        }]
                    })
                    // Refresh user data to update streak and XP in context
                    await checkAuth()
                } catch (saveErr) {`
);

fs.writeFileSync(path, content);
console.log('File updated successfully');
