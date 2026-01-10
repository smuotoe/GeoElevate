import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { initDatabase } from './models/database.js';
import { initWebSocket } from './services/websocket.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import gameRoutes from './routes/games.js';
import friendRoutes from './routes/friends.js';
import leaderboardRoutes from './routes/leaderboards.js';
import achievementRoutes from './routes/achievements.js';
import dailyRoutes from './routes/daily.js';
import notificationRoutes from './routes/notifications.js';
import settingsRoutes from './routes/settings.js';
import multiplayerRoutes from './routes/multiplayer.js';
import syncRoutes from './routes/sync.js';
import assessmentRoutes from './routes/assessment.js';
import tutorialRoutes from './routes/tutorial.js';

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'capacitor://localhost',
    'http://localhost'
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        // or from allowed origins
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(null, true); // Allow all origins for mobile app compatibility
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/leaderboards', leaderboardRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/daily', dailyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/multiplayer', multiplayerRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/tutorial', tutorialRoutes);

// Error handling middleware
app.use((err, req, res, _next) => {
    console.error('Error:', err.message || err);
    console.error('Stack:', err.stack);
    const errorMessage = err.message || String(err) || 'Unknown error';
    res.status(err.status || 500).json({
        error: {
            message: process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : errorMessage,
            ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: { message: 'Not found' } });
});

// Create HTTP server
const server = createServer(app);

/**
 * Start the server after initializing the database.
 */
async function startServer() {
    try {
        // Initialize database
        await initDatabase();

        // Initialize WebSocket server on the same HTTP server
        initWebSocket(server);

        // Start listening
        server.listen(PORT, () => {
            console.log(`
========================================
  GeoElevate Backend Server Started
========================================
  HTTP API:    http://localhost:${PORT}
  WebSocket:   ws://localhost:${PORT}/ws
  Environment: ${process.env.NODE_ENV || 'development'}
========================================
            `);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

startServer();

export default app;
