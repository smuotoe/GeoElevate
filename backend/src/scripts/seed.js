import 'dotenv/config';
import { initDatabase, getDb, closeDatabase } from '../models/database.js';

const REST_COUNTRIES_URLS = [
    'https://restcountries.com/v3.1/all',
    'https://restcountries.com/v3/all',
    'https://raw.githubusercontent.com/mledoze/countries/master/countries.json'
];
const TRIVIA_API_URL = 'https://the-trivia-api.com/v2/questions';
const OPENTDB_URL = 'https://opentdb.com/api.php';

/**
 * Fetch data from a URL with retry logic.
 *
 * @param {string} url - URL to fetch
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<object>} JSON response
 */
async function fetchWithRetry(url, retries = 3) {
    const headers = {
        'User-Agent': 'GeoElevate/1.0 (https://github.com/smuotoe/GeoElevate)',
        'Accept': 'application/json'
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, { headers });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${text.slice(0, 100)}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Attempt ${attempt} failed for ${url}: ${error.message}`);
            if (attempt === retries) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

/**
 * Decode HTML entities in text.
 *
 * @param {string} text - Text with HTML entities
 * @returns {string} Decoded text
 */
function decodeHtmlEntities(text) {
    const entities = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#039;': "'",
        '&apos;': "'",
        '&ntilde;': 'n',
        '&eacute;': 'e',
        '&oacute;': 'o',
        '&uuml;': 'u'
    };
    return text.replace(/&[^;]+;/g, entity => entities[entity] || entity);
}

/**
 * Map continent names from REST Countries API to simplified names.
 *
 * @param {string[]} continents - Array of continent names
 * @returns {string} Primary continent
 */
function mapContinent(continents) {
    if (!continents || continents.length === 0) {
        return 'Unknown';
    }
    const continent = continents[0];
    const mapping = {
        'North America': 'North America',
        'South America': 'South America',
        'Europe': 'Europe',
        'Africa': 'Africa',
        'Asia': 'Asia',
        'Oceania': 'Oceania',
        'Antarctica': 'Antarctica'
    };
    return mapping[continent] || continent;
}

/**
 * Fetch country data from multiple sources with fallback.
 *
 * @returns {Promise<object[]>} Array of country data
 */
async function fetchCountryData() {
    for (const url of REST_COUNTRIES_URLS) {
        try {
            console.log(`Trying ${url}...`);
            const data = await fetchWithRetry(url, 2);

            // Handle mledoze/countries format (GitHub raw)
            if (url.includes('mledoze')) {
                return data.map(c => ({
                    name: { common: c.name?.common || c.name },
                    cca2: c.cca2,
                    continents: c.region ? [c.region] : [],
                    subregion: c.subregion,
                    region: c.region,
                    population: c.population || 0,
                    capital: c.capital,
                    flags: {
                        png: `https://flagcdn.com/w320/${(c.cca2 || '').toLowerCase()}.png`,
                        svg: `https://flagcdn.com/${(c.cca2 || '').toLowerCase()}.svg`
                    },
                    languages: c.languages || {}
                }));
            }

            return data;
        } catch (error) {
            console.error(`Failed to fetch from ${url}: ${error.message}`);
        }
    }
    throw new Error('All country data sources failed');
}

/**
 * Seed countries, capitals, flags, languages, and country_languages tables.
 *
 * @param {object} db - Database wrapper
 * @returns {Promise<{countryCount: number, languageCount: number}>}
 */
async function seedCountryData(db) {
    console.log('Fetching country data...');
    const countries = await fetchCountryData();
    console.log(`Fetched ${countries.length} countries`);

    const languageMap = new Map();
    let countryCount = 0;
    let skippedCount = 0;

    for (const country of countries) {
        try {
            const name = country.name?.common;
            const code = country.cca2;
            const continent = mapContinent(country.continents);
            const region = country.subregion || country.region || null;
            const population = country.population || 0;
            const capitalName = country.capital?.[0] || null;
            const flagUrl = country.flags?.png || country.flags?.svg || null;
            const languages = country.languages || {};

            if (!name || !code) {
                skippedCount++;
                continue;
            }

            // Insert country
            const existingCountry = await db.prepare(
                'SELECT id FROM countries WHERE code = ?'
            ).get(code);

            let countryId;
            if (existingCountry) {
                await db.prepare(`
                    UPDATE countries
                    SET name = ?, continent = ?, region = ?, population = ?
                    WHERE code = ?
                `).run(name, continent, region, population, code);
                countryId = existingCountry.id;
            } else {
                const result = await db.prepare(`
                    INSERT INTO countries (name, code, continent, region, population)
                    VALUES (?, ?, ?, ?, ?)
                `).run(name, code, continent, region, population);
                countryId = result.lastInsertRowid;
            }

            // Insert capital
            if (capitalName) {
                const existingCapital = await db.prepare(
                    'SELECT id FROM capitals WHERE country_id = ?'
                ).get(countryId);

                let capitalId;
                if (existingCapital) {
                    await db.prepare(
                        'UPDATE capitals SET name = ? WHERE id = ?'
                    ).run(capitalName, existingCapital.id);
                    capitalId = existingCapital.id;
                } else {
                    const capitalResult = await db.prepare(
                        'INSERT INTO capitals (name, country_id) VALUES (?, ?)'
                    ).run(capitalName, countryId);
                    capitalId = capitalResult.lastInsertRowid;
                }

                // Update country with capital_id
                await db.prepare(
                    'UPDATE countries SET capital_id = ? WHERE id = ?'
                ).run(capitalId, countryId);
            }

            // Insert flag
            if (flagUrl) {
                const existingFlag = await db.prepare(
                    'SELECT id FROM flags WHERE country_id = ?'
                ).get(countryId);

                if (existingFlag) {
                    await db.prepare(
                        'UPDATE flags SET image_url = ? WHERE id = ?'
                    ).run(flagUrl, existingFlag.id);
                } else {
                    await db.prepare(
                        'INSERT INTO flags (country_id, image_url) VALUES (?, ?)'
                    ).run(countryId, flagUrl);
                }
            }

            // Insert languages and country_languages
            for (const [langCode, langName] of Object.entries(languages)) {
                let languageId = languageMap.get(langName);

                if (!languageId) {
                    const existingLang = await db.prepare(
                        'SELECT id FROM languages WHERE name = ?'
                    ).get(langName);

                    if (existingLang) {
                        languageId = existingLang.id;
                    } else {
                        const langResult = await db.prepare(
                            'INSERT INTO languages (name) VALUES (?)'
                        ).run(langName);
                        languageId = langResult.lastInsertRowid;
                    }
                    languageMap.set(langName, languageId);
                }

                // Insert country_language relationship
                const existingRel = await db.prepare(
                    'SELECT 1 FROM country_languages WHERE country_id = ? AND language_id = ?'
                ).get(countryId, languageId);

                if (!existingRel) {
                    await db.prepare(
                        'INSERT INTO country_languages (country_id, language_id, is_official) VALUES (?, ?, ?)'
                    ).run(countryId, languageId, true);
                }
            }

            countryCount++;
            if (countryCount % 50 === 0) {
                console.log(`Processed ${countryCount} countries...`);
            }
        } catch (error) {
            console.error(`Error processing country ${country.name?.common}: ${error.message}`);
        }
    }

    console.log(`Seeded ${countryCount} countries, skipped ${skippedCount}`);
    console.log(`Seeded ${languageMap.size} unique languages`);

    return { countryCount, languageCount: languageMap.size };
}

/**
 * Fetch trivia questions from The Trivia API.
 *
 * @returns {Promise<object[]>} Array of trivia questions
 */
async function fetchTriviaApiQuestions() {
    const questions = [];
    const difficulties = ['easy', 'medium', 'hard'];

    for (const difficulty of difficulties) {
        try {
            const url = `${TRIVIA_API_URL}?categories=geography&limit=50&difficulty=${difficulty}`;
            const data = await fetchWithRetry(url);

            for (const q of data) {
                questions.push({
                    category: 'geography',
                    question: q.question?.text || q.question,
                    answer: q.correctAnswer,
                    incorrectAnswers: q.incorrectAnswers || [],
                    difficulty,
                    region: null
                });
            }
            console.log(`Fetched ${data.length} ${difficulty} questions from The Trivia API`);

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error(`Error fetching ${difficulty} trivia: ${error.message}`);
        }
    }

    return questions;
}

/**
 * Fetch trivia questions from Open Trivia Database as fallback.
 *
 * @returns {Promise<object[]>} Array of trivia questions
 */
async function fetchOpenTdbQuestions() {
    const questions = [];
    const difficulties = ['easy', 'medium', 'hard'];

    for (const difficulty of difficulties) {
        try {
            // Category 22 = Geography
            const url = `${OPENTDB_URL}?amount=50&category=22&difficulty=${difficulty}&type=multiple`;
            const data = await fetchWithRetry(url);

            if (data.response_code === 0 && data.results) {
                for (const q of data.results) {
                    questions.push({
                        category: 'geography',
                        question: decodeHtmlEntities(q.question),
                        answer: decodeHtmlEntities(q.correct_answer),
                        incorrectAnswers: q.incorrect_answers.map(decodeHtmlEntities),
                        difficulty,
                        region: null
                    });
                }
                console.log(`Fetched ${data.results.length} ${difficulty} questions from OpenTDB`);
            }

            // OpenTDB rate limit: 1 request per 5 seconds
            await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
            console.error(`Error fetching ${difficulty} OpenTDB trivia: ${error.message}`);
        }
    }

    return questions;
}

/**
 * Seed trivia_facts table with geography questions.
 *
 * @param {object} db - Database wrapper
 * @returns {Promise<number>} Number of trivia facts seeded
 */
async function seedTriviaData(db) {
    console.log('Fetching trivia questions...');

    let questions = await fetchTriviaApiQuestions();

    // If we didn't get enough, try OpenTDB as fallback
    if (questions.length < 50) {
        console.log('Fetching additional questions from OpenTDB...');
        const openTdbQuestions = await fetchOpenTdbQuestions();
        questions = [...questions, ...openTdbQuestions];
    }

    console.log(`Total trivia questions fetched: ${questions.length}`);

    let insertedCount = 0;
    const seenQuestions = new Set();

    for (const q of questions) {
        try {
            // Skip duplicates
            const questionKey = q.question.toLowerCase().trim();
            if (seenQuestions.has(questionKey)) {
                continue;
            }
            seenQuestions.add(questionKey);

            // Check if question already exists
            const existing = await db.prepare(
                'SELECT id FROM trivia_facts WHERE question = ?'
            ).get(q.question);

            if (!existing) {
                await db.prepare(`
                    INSERT INTO trivia_facts (category, question, answer, difficulty, region)
                    VALUES (?, ?, ?, ?, ?)
                `).run(q.category, q.question, q.answer, q.difficulty, q.region);
                insertedCount++;
            }
        } catch (error) {
            console.error(`Error inserting trivia: ${error.message}`);
        }
    }

    console.log(`Seeded ${insertedCount} trivia facts`);
    return insertedCount;
}

/**
 * Add custom geography trivia facts for better game coverage.
 *
 * @param {object} db - Database wrapper
 * @returns {Promise<number>} Number of custom facts added
 */
async function seedCustomTrivia(db) {
    const customTrivia = [
        { category: 'geography', question: 'What is the largest country in the world by area?', answer: 'Russia', difficulty: 'easy', region: 'Europe' },
        { category: 'geography', question: 'What is the smallest country in the world?', answer: 'Vatican City', difficulty: 'easy', region: 'Europe' },
        { category: 'geography', question: 'Which river is the longest in the world?', answer: 'Nile', difficulty: 'medium', region: 'Africa' },
        { category: 'geography', question: 'What is the largest desert in the world?', answer: 'Sahara', difficulty: 'easy', region: 'Africa' },
        { category: 'geography', question: 'Which mountain is the tallest in the world?', answer: 'Mount Everest', difficulty: 'easy', region: 'Asia' },
        { category: 'geography', question: 'What is the capital of Australia?', answer: 'Canberra', difficulty: 'medium', region: 'Oceania' },
        { category: 'geography', question: 'Which country has the most islands?', answer: 'Sweden', difficulty: 'hard', region: 'Europe' },
        { category: 'geography', question: 'What is the deepest lake in the world?', answer: 'Lake Baikal', difficulty: 'hard', region: 'Asia' },
        { category: 'geography', question: 'Which African country was never colonized?', answer: 'Ethiopia', difficulty: 'hard', region: 'Africa' },
        { category: 'geography', question: 'What is the only country that borders both the Atlantic and Indian Oceans?', answer: 'South Africa', difficulty: 'hard', region: 'Africa' },
        { category: 'geography', question: 'Which European country has the most World Heritage Sites?', answer: 'Italy', difficulty: 'medium', region: 'Europe' },
        { category: 'geography', question: 'What is the largest island in the world?', answer: 'Greenland', difficulty: 'medium', region: 'North America' },
        { category: 'geography', question: 'Which country spans the most time zones?', answer: 'France', difficulty: 'hard', region: 'Europe' },
        { category: 'geography', question: 'What is the most visited country in the world?', answer: 'France', difficulty: 'medium', region: 'Europe' },
        { category: 'geography', question: 'Which country has the longest coastline?', answer: 'Canada', difficulty: 'medium', region: 'North America' },
        { category: 'geography', question: 'What is the driest place on Earth?', answer: 'Atacama Desert', difficulty: 'hard', region: 'South America' },
        { category: 'geography', question: 'Which sea is the saltiest in the world?', answer: 'Dead Sea', difficulty: 'medium', region: 'Asia' },
        { category: 'geography', question: 'What is the largest landlocked country?', answer: 'Kazakhstan', difficulty: 'hard', region: 'Asia' },
        { category: 'geography', question: 'Which country has the most volcanoes?', answer: 'Indonesia', difficulty: 'medium', region: 'Asia' },
        { category: 'geography', question: 'What is the only continent without a desert?', answer: 'Europe', difficulty: 'hard', region: null }
    ];

    let insertedCount = 0;

    for (const trivia of customTrivia) {
        try {
            const existing = await db.prepare(
                'SELECT id FROM trivia_facts WHERE question = ?'
            ).get(trivia.question);

            if (!existing) {
                await db.prepare(`
                    INSERT INTO trivia_facts (category, question, answer, difficulty, region)
                    VALUES (?, ?, ?, ?, ?)
                `).run(trivia.category, trivia.question, trivia.answer, trivia.difficulty, trivia.region);
                insertedCount++;
            }
        } catch (error) {
            console.error(`Error inserting custom trivia: ${error.message}`);
        }
    }

    console.log(`Added ${insertedCount} custom trivia facts`);
    return insertedCount;
}

/**
 * Seed achievements table with game achievements.
 *
 * @param {object} db - Database wrapper
 * @returns {Promise<number>} Number of achievements seeded
 */
async function seedAchievements(db) {
    const achievements = [
        // Flags achievements
        { name: 'Flag Novice', description: 'Answer 10 flag questions correctly', icon: 'flag', image_url: '/badges/flag-novice.jpg', category: 'flags', requirement_type: 'correct_count', requirement_value: 10, xp_reward: 50 },
        { name: 'Flag Explorer', description: 'Answer 50 flag questions correctly', icon: 'flag', image_url: '/badges/flag-explorer.jpg', category: 'flags', requirement_type: 'correct_count', requirement_value: 50, xp_reward: 100 },
        { name: 'Flag Expert', description: 'Answer 100 flag questions correctly', icon: 'flag', image_url: '/badges/flag-expert.jpg', category: 'flags', requirement_type: 'correct_count', requirement_value: 100, xp_reward: 200 },
        { name: 'Flag Master', description: 'Answer 500 flag questions correctly', icon: 'flag', image_url: '/badges/flag-master.jpg', category: 'flags', requirement_type: 'correct_count', requirement_value: 500, xp_reward: 500 },
        { name: 'Vexillologist', description: 'Answer 1000 flag questions correctly', icon: 'flag', image_url: '/badges/vexillologist.jpg', category: 'flags', requirement_type: 'correct_count', requirement_value: 1000, xp_reward: 1000 },

        // Capitals achievements
        { name: 'Capital Beginner', description: 'Answer 10 capital questions correctly', icon: 'building', image_url: '/badges/capital-beginner.jpg', category: 'capitals', requirement_type: 'correct_count', requirement_value: 10, xp_reward: 50 },
        { name: 'Capital Explorer', description: 'Answer 50 capital questions correctly', icon: 'building', image_url: '/badges/capital-explorer.jpg', category: 'capitals', requirement_type: 'correct_count', requirement_value: 50, xp_reward: 100 },
        { name: 'Capital Expert', description: 'Answer 100 capital questions correctly', icon: 'building', image_url: '/badges/capital-expert.jpg', category: 'capitals', requirement_type: 'correct_count', requirement_value: 100, xp_reward: 200 },
        { name: 'Capital Master', description: 'Answer 500 capital questions correctly', icon: 'building', image_url: '/badges/capital-master.jpg', category: 'capitals', requirement_type: 'correct_count', requirement_value: 500, xp_reward: 500 },
        { name: 'World Traveler', description: 'Answer 1000 capital questions correctly', icon: 'building', image_url: '/badges/world-traveler.jpg', category: 'capitals', requirement_type: 'correct_count', requirement_value: 1000, xp_reward: 1000 },

        // Maps achievements
        { name: 'Map Reader', description: 'Play 5 map games', icon: 'map', image_url: '/badges/map-reader.jpg', category: 'maps', requirement_type: 'games_played', requirement_value: 5, xp_reward: 50 },
        { name: 'Cartographer', description: 'Play 25 map games', icon: 'map', image_url: '/badges/cartographer.jpg', category: 'maps', requirement_type: 'games_played', requirement_value: 25, xp_reward: 100 },
        { name: 'Geography Buff', description: 'Play 50 map games', icon: 'map', image_url: '/badges/geography-buff.jpg', category: 'maps', requirement_type: 'games_played', requirement_value: 50, xp_reward: 200 },
        { name: 'Map Master', description: 'Play 100 map games', icon: 'map', image_url: '/badges/map-master.jpg', category: 'maps', requirement_type: 'games_played', requirement_value: 100, xp_reward: 500 },

        // Languages achievements
        { name: 'Linguist Beginner', description: 'Answer 10 language questions correctly', icon: 'languages', image_url: '/badges/linguist-beginner.jpg', category: 'languages', requirement_type: 'correct_count', requirement_value: 10, xp_reward: 50 },
        { name: 'Polyglot Explorer', description: 'Answer 50 language questions correctly', icon: 'languages', image_url: '/badges/polyglot-explorer.jpg', category: 'languages', requirement_type: 'correct_count', requirement_value: 50, xp_reward: 100 },
        { name: 'Language Expert', description: 'Answer 100 language questions correctly', icon: 'languages', image_url: '/badges/language-expert.jpg', category: 'languages', requirement_type: 'correct_count', requirement_value: 100, xp_reward: 200 },
        { name: 'Language Master', description: 'Answer 500 language questions correctly', icon: 'languages', image_url: '/badges/language-master.jpg', category: 'languages', requirement_type: 'correct_count', requirement_value: 500, xp_reward: 500 },

        // Trivia achievements
        { name: 'Trivia Rookie', description: 'Answer 10 trivia questions correctly', icon: 'lightbulb', image_url: '/badges/trivia-rookie.jpg', category: 'trivia', requirement_type: 'correct_count', requirement_value: 10, xp_reward: 50 },
        { name: 'Trivia Enthusiast', description: 'Answer 50 trivia questions correctly', icon: 'lightbulb', image_url: '/badges/trivia-enthusiast.jpg', category: 'trivia', requirement_type: 'correct_count', requirement_value: 50, xp_reward: 100 },
        { name: 'Trivia Expert', description: 'Answer 100 trivia questions correctly', icon: 'lightbulb', image_url: '/badges/trivia-expert.jpg', category: 'trivia', requirement_type: 'correct_count', requirement_value: 100, xp_reward: 200 },
        { name: 'Trivia Master', description: 'Answer 500 trivia questions correctly', icon: 'lightbulb', image_url: '/badges/trivia-master.jpg', category: 'trivia', requirement_type: 'correct_count', requirement_value: 500, xp_reward: 500 },

        // General achievements
        { name: 'First Steps', description: 'Complete your first game', icon: 'star', image_url: '/badges/first-steps.jpg', category: 'general', requirement_type: 'games_played', requirement_value: 1, xp_reward: 25 },
        { name: 'Getting Started', description: 'Complete 10 games', icon: 'star', image_url: '/badges/getting-started.jpg', category: 'general', requirement_type: 'games_played', requirement_value: 10, xp_reward: 100 },
        { name: 'Dedicated Learner', description: 'Complete 50 games', icon: 'star', image_url: '/badges/dedicated-learner.jpg', category: 'general', requirement_type: 'games_played', requirement_value: 50, xp_reward: 250 },
        { name: 'Geography Champion', description: 'Complete 100 games', icon: 'trophy', image_url: '/badges/geography-champion.jpg', category: 'general', requirement_type: 'games_played', requirement_value: 100, xp_reward: 500 },
        { name: 'Perfect Score', description: 'Get 10/10 in any game', icon: 'crown', image_url: '/badges/perfect-score.jpg', category: 'general', requirement_type: 'perfect_game', requirement_value: 1, xp_reward: 100 },
        { name: 'Perfectionist', description: 'Get 10 perfect scores', icon: 'crown', image_url: '/badges/perfectionist.jpg', category: 'general', requirement_type: 'perfect_game', requirement_value: 10, xp_reward: 500 }
    ];

    let insertedCount = 0;

    for (const achievement of achievements) {
        try {
            const existing = await db.prepare(
                'SELECT id FROM achievements WHERE name = ?'
            ).get(achievement.name);

            if (!existing) {
                await db.prepare(`
                    INSERT INTO achievements (name, description, icon, image_url, category, requirement_type, requirement_value, xp_reward)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    achievement.name,
                    achievement.description,
                    achievement.icon,
                    achievement.image_url,
                    achievement.category,
                    achievement.requirement_type,
                    achievement.requirement_value,
                    achievement.xp_reward
                );
                insertedCount++;
            }
        } catch (error) {
            console.error(`Error inserting achievement ${achievement.name}: ${error.message}`);
        }
    }

    console.log(`Seeded ${insertedCount} achievements`);
    return insertedCount;
}

/**
 * Main seeding function.
 */
async function main() {
    console.log('========================================');
    console.log('GeoElevate Database Seeder');
    console.log('========================================\n');

    try {
        console.log('Initializing database connection...');
        await initDatabase();
        const db = getDb();

        console.log('\n--- Seeding Country Data ---');
        const { countryCount, languageCount } = await seedCountryData(db);

        console.log('\n--- Seeding Trivia Data ---');
        const triviaCount = await seedTriviaData(db);
        const customTriviaCount = await seedCustomTrivia(db);

        console.log('\n--- Seeding Achievements ---');
        const achievementCount = await seedAchievements(db);

        console.log('\n========================================');
        console.log('Seeding Complete!');
        console.log('========================================');
        console.log(`Countries: ${countryCount}`);
        console.log(`Languages: ${languageCount}`);
        console.log(`Trivia Facts: ${triviaCount + customTriviaCount}`);
        console.log(`Achievements: ${achievementCount}`);
        console.log('========================================\n');

    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    } finally {
        await closeDatabase();
    }
}

main();
