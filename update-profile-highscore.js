const fs = require('fs');
const path = './frontend/src/pages/Profile.jsx';
let content = fs.readFileSync(path, 'utf8');

const oldStr = `                    <span>{stat.games_played || 0} games</span>
                    <span>{stat.total_correct || 0}/{stat.total_questions || 0} correct</span>`;

const newStr = `                    <span>{stat.games_played || 0} games</span>
                    <span>
                        {stat.high_score > 0 && (
                            <span style={{ color: 'var(--accent)', marginRight: '8px' }}>
                                High: {stat.high_score}
                            </span>
                        )}
                        {stat.total_correct || 0}/{stat.total_questions || 0} correct
                    </span>`;

content = content.replace(oldStr, newStr);
fs.writeFileSync(path, content);
console.log('Profile.jsx updated with high score display');
