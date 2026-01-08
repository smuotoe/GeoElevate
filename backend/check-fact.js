import Database from 'better-sqlite3';

const db = new Database('./data/geoelevate.db');
const userId = 30; // srtest

const progress = db.prepare(`
    SELECT ufp.*, c.name as country_name
    FROM user_fact_progress ufp
    LEFT JOIN countries c ON c.id = ufp.fact_id AND ufp.fact_type IN ('flags', 'capitals', 'maps')
    WHERE ufp.user_id = ?
    ORDER BY ufp.times_wrong DESC, ufp.last_seen_at DESC
`).all(userId);

console.log('User ID:', userId);
console.log('Total facts tracked:', progress.length);
console.log('\nFact progress:');
progress.forEach(p => {
    console.log(`  ${p.country_name || 'ID:' + p.fact_id} (${p.fact_type}): seen=${p.times_seen}, correct=${p.times_correct}, wrong=${p.times_wrong}`);
});

db.close();
