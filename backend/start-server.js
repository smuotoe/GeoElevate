// start-server.js - Load .env and start the server
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('JWT_SECRET loaded:', process.env.JWT_SECRET ? 'Yes' : 'No');

// Import and start the main server
import('./src/index.js');
