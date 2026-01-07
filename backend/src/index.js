import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables from backend directory (Session 7 port 5002)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { initDatabase, reloadDatabase } from './models/database.js';
import { initWebSocket } from './services/websocket.js';

// Routes
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
const WS_PORT = process.env.WS_PORT || 3007;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Reload database endpoint (development only)
app.post('/api/dev/reload-db', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: { message: 'Not allowed in production' } });
    }
    try {
        await reloadDatabase();
        res.json({ status: 'ok', message: 'Database reloaded' });
    } catch (err) {
        res.status(500).json({ error: { message: err.message } });
    }
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
 * Tries multiple ports if the default is in use.
 */
async function startServer() {
    try {
        // Initialize database (async for sql.js)
        await initDatabase();

        // Initialize WebSocket server for multiplayer
        initWebSocket(WS_PORT);

        // Try ports starting from PORT, incrementing if in use
        const basePorts = [5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009, 5010, 5011, 5012, 5013, 5014, 5015];
        let serverStarted = false;

        for (const port of basePorts) {
            try {
                await new Promise((resolve, reject) => {
                    server.once('error', (err) => {
                        if (err.code === 'EADDRINUSE') {
                            console.log(`Port ${port} in use, trying next...`);
                            resolve(false);
                        } else {
                            reject(err);
                        }
                    });
                    server.listen(port, () => {
                        console.log(`
========================================
  GeoElevate Backend Server Started
========================================
  HTTP API:    http://localhost:${port}
  WebSocket:   ws://localhost:${WS_PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
========================================
                        `);
                        serverStarted = true;
                        resolve(true);
                    });
                });
                if (serverStarted) break;
            } catch (err) {
                if (err.code !== 'EADDRINUSE') throw err;
            }
        }

        if (!serverStarted) {
            throw new Error('Could not find an available port');
        }
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

startServer();

export default app;
