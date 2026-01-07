import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { initDatabase } from './models/database.js';
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

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Initialize database
initDatabase();

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

// Error handling middleware
app.use((err, req, res, _next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: {
            message: process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : err.message,
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

// Initialize WebSocket server for multiplayer
initWebSocket(WS_PORT);

// Start server
server.listen(PORT, () => {
    console.log(`
========================================
  GeoElevate Backend Server Started
========================================
  HTTP API:    http://localhost:${PORT}
  WebSocket:   ws://localhost:${WS_PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
========================================
    `);
});

export default app;
