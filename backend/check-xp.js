import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'data/geoelevate.db'));
const users = db.prepare('SELECT id, username, overall_xp, overall_level FROM users ORDER BY overall_xp DESC LIMIT 5').all();
console.log('Users sorted by XP:');
users.forEach((u, i) => console.log(`${i+1}. ${u.username}: ${u.overall_xp} XP (Level ${u.overall_level})`));
db.close();
