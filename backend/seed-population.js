/**
 * Seed script to add population data to countries for difficulty scaling.
 * Population is used as a proxy for country familiarity/obscurity.
 * Larger population = more well-known = easier difficulty.
 */
import { initDatabase, getDb, saveDatabase } from './src/models/database.js';

// Population data for countries (in millions, approximate 2024 data)
// This allows difficulty scaling by country familiarity
const populationData = {
    // North America
    'United States': 335000000,
    'Canada': 40000000,
    'Mexico': 130000000,

    // South America
    'Brazil': 216000000,
    'Argentina': 46000000,
    'Colombia': 52000000,
    'Peru': 34000000,
    'Chile': 20000000,
    'Venezuela': 29000000,
    'Ecuador': 18000000,

    // Europe - Major
    'United Kingdom': 68000000,
    'France': 68000000,
    'Germany': 84000000,
    'Italy': 59000000,
    'Spain': 48000000,
    'Poland': 38000000,
    'Netherlands': 18000000,
    'Belgium': 12000000,
    'Sweden': 10500000,
    'Portugal': 10400000,
    'Austria': 9200000,
    'Switzerland': 8800000,
    'Norway': 5500000,
    'Denmark': 5900000,
    'Finland': 5600000,
    'Ireland': 5100000,
    'Greece': 10400000,

    // Europe - Medium
    'Czech Republic': 10500000,
    'Hungary': 9600000,
    'Romania': 19000000,
    'Ukraine': 37000000,
    'Bulgaria': 6900000,
    'Croatia': 3900000,
    'Slovakia': 5500000,
    'Slovenia': 2100000,
    'Serbia': 6700000,
    'Bosnia and Herzegovina': 3200000,

    // Europe - Small
    'Luxembourg': 660000,
    'Malta': 520000,
    'Iceland': 380000,
    'Cyprus': 1300000,
    'Estonia': 1400000,
    'Latvia': 1850000,
    'Lithuania': 2800000,
    'Montenegro': 620000,
    'North Macedonia': 1850000,
    'Albania': 2800000,
    'Moldova': 2600000,
    'Belarus': 9200000,

    // Asia - Major
    'China': 1410000000,
    'India': 1430000000,
    'Japan': 124000000,
    'Indonesia': 277000000,
    'Pakistan': 240000000,
    'Bangladesh': 173000000,
    'Philippines': 117000000,
    'Vietnam': 100000000,
    'Thailand': 72000000,
    'South Korea': 52000000,
    'Malaysia': 34000000,
    'Taiwan': 24000000,
    'Singapore': 5900000,

    // Asia - Medium
    'Saudi Arabia': 36000000,
    'Iran': 89000000,
    'Turkey': 85000000,
    'Iraq': 45000000,
    'Afghanistan': 42000000,
    'Myanmar': 55000000,
    'Nepal': 30000000,
    'Sri Lanka': 22000000,
    'Kazakhstan': 20000000,
    'Uzbekistan': 35000000,

    // Asia - Small
    'Mongolia': 3400000,
    'Cambodia': 17000000,
    'Laos': 7500000,
    'Bhutan': 780000,
    'Brunei': 450000,
    'Maldives': 520000,
    'Timor-Leste': 1400000,

    // Middle East
    'Israel': 9800000,
    'United Arab Emirates': 10000000,
    'Jordan': 11500000,
    'Lebanon': 5500000,
    'Kuwait': 4300000,
    'Oman': 5300000,
    'Qatar': 2700000,
    'Bahrain': 1500000,
    'Syria': 23000000,
    'Yemen': 34000000,

    // Africa - Major
    'Nigeria': 230000000,
    'Ethiopia': 126000000,
    'Egypt': 112000000,
    'South Africa': 60000000,
    'Kenya': 55000000,
    'Tanzania': 67000000,
    'Algeria': 45000000,
    'Morocco': 37000000,
    'Sudan': 48000000,
    'Uganda': 48000000,
    'Ghana': 34000000,

    // Africa - Medium
    'Cameroon': 28000000,
    'Ivory Coast': 28000000,
    'Angola': 36000000,
    'Mozambique': 33000000,
    'Madagascar': 30000000,
    'Senegal': 18000000,
    'Mali': 23000000,
    'Zimbabwe': 16000000,
    'Zambia': 20000000,
    'Rwanda': 14000000,
    'Tunisia': 12000000,

    // Africa - Small
    'Botswana': 2600000,
    'Namibia': 2600000,
    'Mauritius': 1300000,
    'Eswatini': 1200000,
    'Lesotho': 2300000,
    'Gambia': 2700000,
    'Guinea-Bissau': 2100000,
    'Djibouti': 1100000,
    'Comoros': 900000,
    'Cape Verde': 600000,
    'Sao Tome and Principe': 230000,
    'Seychelles': 100000,

    // Oceania
    'Australia': 26000000,
    'New Zealand': 5200000,
    'Papua New Guinea': 10000000,
    'Fiji': 930000,
    'Solomon Islands': 720000,
    'Vanuatu': 320000,
    'Samoa': 220000,
    'Tonga': 100000,
    'Kiribati': 130000,
    'Micronesia': 115000,
    'Palau': 18000,
    'Marshall Islands': 42000,
    'Tuvalu': 11000,
    'Nauru': 10000,

    // Caribbean
    'Cuba': 11000000,
    'Dominican Republic': 11400000,
    'Haiti': 11700000,
    'Jamaica': 2800000,
    'Trinidad and Tobago': 1500000,
    'Bahamas': 410000,
    'Barbados': 280000,
    'Saint Lucia': 180000,
    'Grenada': 125000,
    'Saint Vincent and the Grenadines': 110000,
    'Antigua and Barbuda': 100000,
    'Dominica': 72000,
    'Saint Kitts and Nevis': 54000,

    // Central America
    'Guatemala': 18000000,
    'Honduras': 10500000,
    'El Salvador': 6300000,
    'Nicaragua': 7000000,
    'Costa Rica': 5200000,
    'Panama': 4400000,
    'Belize': 410000,

    // Europe - Micro
    'Andorra': 80000,
    'Monaco': 40000,
    'San Marino': 34000,
    'Liechtenstein': 39000,
    'Vatican City': 800
};

async function seedPopulation() {
    await initDatabase();
    const db = getDb();

    console.log('Updating country population data...\n');

    let updated = 0;
    let notFound = 0;

    for (const [countryName, population] of Object.entries(populationData)) {
        const result = db.prepare(
            'UPDATE countries SET population = ? WHERE name = ?'
        ).run(population, countryName);

        if (result.changes > 0) {
            updated++;
            console.log(`Updated: ${countryName} -> ${population.toLocaleString()}`);
        } else {
            notFound++;
            console.log(`Not found in DB: ${countryName}`);
        }
    }

    saveDatabase();

    console.log(`\n--- Summary ---`);
    console.log(`Updated: ${updated} countries`);
    console.log(`Not found: ${notFound} countries`);

    // Verify
    const stats = db.prepare(`
        SELECT
            COUNT(*) as total,
            COUNT(population) as with_pop,
            MIN(population) as min_pop,
            MAX(population) as max_pop
        FROM countries
    `).get();

    console.log(`\nDatabase stats:`);
    console.log(`Total countries: ${stats.total}`);
    console.log(`With population: ${stats.with_pop}`);
    console.log(`Min population: ${stats.min_pop?.toLocaleString() || 'N/A'}`);
    console.log(`Max population: ${stats.max_pop?.toLocaleString() || 'N/A'}`);
}

seedPopulation().catch(console.error);
