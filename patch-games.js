const fs = require('fs');
const path = require('path');

const gamesPath = path.join(__dirname, 'backend/src/routes/games.js');
let content = fs.readFileSync(gamesPath, 'utf-8');

const oldCode = `            const unlocked = newProgress >= achievement.requirement_value;

            if (existing) {
                db.prepare(\`
                    UPDATE user_achievements
                    SET progress = ?,
                        unlocked_at = CASE
                            WHEN ? AND unlocked_at IS NULL THEN CURRENT_TIMESTAMP
                            ELSE unlocked_at
                        END
                    WHERE user_id = ? AND achievement_id = ?
                \`).run(newProgress, unlocked ? 1 : 0, userId, achievement.id);
            } else {
                db.prepare(\`
                    INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
                    VALUES (?, ?, ?, ?)
                \`).run(
                    userId,
                    achievement.id,
                    newProgress,
                    unlocked ? new Date().toISOString() : null
                );
            }
        }
    }
}

/**
 * Update daily challenge progress after game completion.`;

const newCode = `            const unlocked = newProgress >= achievement.requirement_value;
            const wasAlreadyUnlocked = existing && existing.unlocked_at !== null;
            const justUnlocked = unlocked && !wasAlreadyUnlocked;

            if (existing) {
                db.prepare(\`
                    UPDATE user_achievements
                    SET progress = ?,
                        unlocked_at = CASE
                            WHEN ? AND unlocked_at IS NULL THEN CURRENT_TIMESTAMP
                            ELSE unlocked_at
                        END
                    WHERE user_id = ? AND achievement_id = ?
                \`).run(newProgress, unlocked ? 1 : 0, userId, achievement.id);
            } else {
                db.prepare(\`
                    INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
                    VALUES (?, ?, ?, ?)
                \`).run(
                    userId,
                    achievement.id,
                    newProgress,
                    unlocked ? new Date().toISOString() : null
                );
            }

            // Create notification for newly unlocked achievement
            if (justUnlocked) {
                db.prepare(\`
                    INSERT INTO notifications (user_id, type, title, body, data_json)
                    VALUES (?, 'achievement_unlock', ?, ?, ?)
                \`).run(
                    userId,
                    'Achievement Unlocked!',
                    \`You earned "\${achievement.name}" - \${achievement.description}\`,
                    JSON.stringify({ achievementId: achievement.id, xpReward: achievement.xp_reward })
                );
                console.log('Achievement unlocked notification created:', achievement.name);
            }
        }
    }
}

/**
 * Update daily challenge progress after game completion.`;

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(gamesPath, content);
    console.log('Successfully patched games.js with achievement unlock notifications');
} else {
    console.log('Could not find the target code block. File may already be patched or different.');
}
