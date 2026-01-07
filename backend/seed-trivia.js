import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedTrivia() {
    const dbPath = path.join(__dirname, 'data/geoelevate.db');

    if (!fs.existsSync(dbPath)) {
        console.error('Database not found at:', dbPath);
        process.exit(1);
    }

    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);

    const triviaFacts = [
        // Population questions
        { category: 'population', question: 'Which country has the largest population?', answer: 'China', difficulty: 'easy', region: 'Asia' },
        { category: 'population', question: 'Which country is the second most populous in the world?', answer: 'India', difficulty: 'easy', region: 'Asia' },
        { category: 'population', question: 'Which European country has the largest population?', answer: 'Germany', difficulty: 'medium', region: 'Europe' },
        { category: 'population', question: 'Which African country has the largest population?', answer: 'Nigeria', difficulty: 'medium', region: 'Africa' },
        { category: 'population', question: 'Which South American country has the largest population?', answer: 'Brazil', difficulty: 'easy', region: 'South America' },

        // Landmarks questions
        { category: 'landmarks', question: 'In which country is the Eiffel Tower located?', answer: 'France', difficulty: 'easy', region: 'Europe' },
        { category: 'landmarks', question: 'In which country is the Great Wall located?', answer: 'China', difficulty: 'easy', region: 'Asia' },
        { category: 'landmarks', question: 'In which country is Machu Picchu located?', answer: 'Peru', difficulty: 'medium', region: 'South America' },
        { category: 'landmarks', question: 'In which country are the Pyramids of Giza located?', answer: 'Egypt', difficulty: 'easy', region: 'Africa' },
        { category: 'landmarks', question: 'In which country is the Colosseum located?', answer: 'Italy', difficulty: 'easy', region: 'Europe' },
        { category: 'landmarks', question: 'In which country is the Taj Mahal located?', answer: 'India', difficulty: 'easy', region: 'Asia' },
        { category: 'landmarks', question: 'In which country is Mount Fuji located?', answer: 'Japan', difficulty: 'easy', region: 'Asia' },
        { category: 'landmarks', question: 'In which country is the Sydney Opera House located?', answer: 'Australia', difficulty: 'easy', region: 'Oceania' },
        { category: 'landmarks', question: 'In which country is the Statue of Liberty located?', answer: 'United States', difficulty: 'easy', region: 'North America' },
        { category: 'landmarks', question: 'In which country is Big Ben located?', answer: 'United Kingdom', difficulty: 'easy', region: 'Europe' },

        // Currency questions
        { category: 'currency', question: 'What is the official currency of Japan?', answer: 'Yen', difficulty: 'easy', region: 'Asia' },
        { category: 'currency', question: 'What is the official currency of the United Kingdom?', answer: 'Pound Sterling', difficulty: 'easy', region: 'Europe' },
        { category: 'currency', question: 'What is the official currency of Switzerland?', answer: 'Swiss Franc', difficulty: 'medium', region: 'Europe' },
        { category: 'currency', question: 'What is the official currency of India?', answer: 'Rupee', difficulty: 'easy', region: 'Asia' },
        { category: 'currency', question: 'What is the official currency of Brazil?', answer: 'Real', difficulty: 'medium', region: 'South America' },
        { category: 'currency', question: 'What is the official currency of South Korea?', answer: 'Won', difficulty: 'medium', region: 'Asia' },
        { category: 'currency', question: 'What is the official currency of Mexico?', answer: 'Peso', difficulty: 'easy', region: 'North America' },
        { category: 'currency', question: 'What is the official currency of Russia?', answer: 'Ruble', difficulty: 'medium', region: 'Europe' },

        // Geography facts
        { category: 'geography', question: 'Which is the largest country by area?', answer: 'Russia', difficulty: 'easy', region: null },
        { category: 'geography', question: 'Which is the smallest country by area?', answer: 'Vatican City', difficulty: 'medium', region: 'Europe' },
        { category: 'geography', question: 'Which river is the longest in the world?', answer: 'Nile', difficulty: 'medium', region: 'Africa' },
        { category: 'geography', question: 'Which mountain is the highest in the world?', answer: 'Mount Everest', difficulty: 'easy', region: 'Asia' },
        { category: 'geography', question: 'Which desert is the largest in the world?', answer: 'Sahara', difficulty: 'easy', region: 'Africa' },
        { category: 'geography', question: 'Which ocean is the largest?', answer: 'Pacific Ocean', difficulty: 'easy', region: null },
        { category: 'geography', question: 'Which lake is the largest freshwater lake by surface area?', answer: 'Lake Superior', difficulty: 'hard', region: 'North America' },
        { category: 'geography', question: 'Which country has the longest coastline?', answer: 'Canada', difficulty: 'medium', region: 'North America' },

        // Borders and neighbors
        { category: 'borders', question: 'How many countries share a border with Germany?', answer: '9', difficulty: 'hard', region: 'Europe' },
        { category: 'borders', question: 'Which two countries share the longest international border?', answer: 'United States and Canada', difficulty: 'medium', region: 'North America' },
        { category: 'borders', question: 'Which country is bordered by the most countries?', answer: 'China', difficulty: 'hard', region: 'Asia' },

        // Continents
        { category: 'continents', question: 'How many continents are there?', answer: '7', difficulty: 'easy', region: null },
        { category: 'continents', question: 'Which is the largest continent by area?', answer: 'Asia', difficulty: 'easy', region: null },
        { category: 'continents', question: 'Which is the smallest continent by area?', answer: 'Australia', difficulty: 'easy', region: null },
        { category: 'continents', question: 'Which continent has the most countries?', answer: 'Africa', difficulty: 'medium', region: null },

        // Islands
        { category: 'islands', question: 'Which is the largest island in the world?', answer: 'Greenland', difficulty: 'medium', region: 'North America' },
        { category: 'islands', question: 'In which country is the island of Bali located?', answer: 'Indonesia', difficulty: 'medium', region: 'Asia' },
        { category: 'islands', question: 'Which country consists of 7,641 islands?', answer: 'Philippines', difficulty: 'hard', region: 'Asia' },

        // Climate and nature
        { category: 'climate', question: 'Which country is known as the Land of the Midnight Sun?', answer: 'Norway', difficulty: 'medium', region: 'Europe' },
        { category: 'climate', question: 'In which country is the Amazon Rainforest primarily located?', answer: 'Brazil', difficulty: 'easy', region: 'South America' },
        { category: 'climate', question: 'Which is the driest desert in the world?', answer: 'Atacama', difficulty: 'hard', region: 'South America' },

        // History and culture
        { category: 'history', question: 'Which country was formerly known as Persia?', answer: 'Iran', difficulty: 'medium', region: 'Asia' },
        { category: 'history', question: 'Which country was formerly known as Siam?', answer: 'Thailand', difficulty: 'medium', region: 'Asia' },
        { category: 'history', question: 'Which country colonized Brazil?', answer: 'Portugal', difficulty: 'medium', region: 'South America' },
        { category: 'history', question: 'Which European country colonized India?', answer: 'United Kingdom', difficulty: 'easy', region: 'Asia' }
    ];

    // Clear existing trivia data
    db.run('DELETE FROM trivia_facts');

    // Insert trivia facts
    const insertStmt = db.prepare(
        'INSERT INTO trivia_facts (category, question, answer, difficulty, region) VALUES (?, ?, ?, ?, ?)'
    );

    for (const fact of triviaFacts) {
        insertStmt.run([fact.category, fact.question, fact.answer, fact.difficulty, fact.region]);
    }

    insertStmt.free();

    // Save database
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);

    console.log(`Seeded ${triviaFacts.length} trivia facts!`);
    db.close();
}

seedTrivia().catch(console.error);
