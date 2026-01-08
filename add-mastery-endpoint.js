// This code should be added to backend/src/routes/users.js after the achievements endpoint

/*
 * Get user fact mastery data.
 * GET /api/users/:id/mastery
 */
router.get('/:id/mastery', authenticate, (req, res, next) => {
    try {
        const { id } = req.params;
        const { fact_type } = req.query;
        const db = getDb();

        // Get mastery data for all facts or filtered by type
        let query = `
            SELECT ufp.fact_type, ufp.fact_id, ufp.times_seen, ufp.times_correct,
                   ufp.times_wrong, ufp.mastery_level, ufp.last_seen_at,
                   c.name as country_name, c.code as country_code
            FROM user_fact_progress ufp
            LEFT JOIN countries c ON c.id = ufp.fact_id
            WHERE ufp.user_id = ?
        `;
        const params = [id];

        if (fact_type) {
            query += ' AND ufp.fact_type = ?';
            params.push(fact_type);
        }

        query += ' ORDER BY ufp.mastery_level DESC, ufp.times_seen DESC';

        const mastery = db.prepare(query).all(...params);

        // Get summary stats
        const summary = db.prepare(`
            SELECT fact_type,
                   COUNT(*) as total_facts,
                   SUM(CASE WHEN mastery_level >= 4 THEN 1 ELSE 0 END) as mastered,
                   AVG(mastery_level) as avg_mastery
            FROM user_fact_progress
            WHERE user_id = ?
            GROUP BY fact_type
        `).all(id);

        res.json({ mastery, summary });
    } catch (err) {
        next(err);
    }
});
