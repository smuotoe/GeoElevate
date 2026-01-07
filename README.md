# GeoElevate

A geography learning app inspired by Elevate's polished UX, featuring gamified quizzes about flags, capitals, maps, languages, and trivia. The app uses spaced repetition and smart question selection for optimal learning, with speed-based scoring and streak bonuses.

## Features

- **5 Game Types**: Flags, Capitals, Maps, Languages, and Trivia
- **Multiple Game Modes**: Multiple choice and typing with fuzzy matching
- **Smart Learning**: Spaced repetition algorithm for optimal retention
- **Multiplayer**: Challenge friends to real-time matches via WebSocket
- **Progression System**: XP, levels, achievements, and streaks
- **Leaderboards**: Global, weekly, and friends-only rankings
- **Daily Challenges**: Personalized challenges based on weak areas
- **Offline Mode**: Play solo games offline with automatic sync
- **Dark/Light Themes**: Beautiful UI with smooth animations

## Tech Stack

### Frontend
- React 18 with Vite
- React Router for navigation
- CSS Modules with CSS Variables for theming
- React Context + useReducer for state management
- WebSocket client for multiplayer

### Backend
- Node.js with Express
- SQLite with better-sqlite3
- JWT authentication with secure httpOnly cookies
- WebSocket server (ws library) for multiplayer
- RESTful API design

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- Modern browser with WebSocket support

### Quick Start

```bash
# Make the setup script executable (Unix/Mac)
chmod +x init.sh

# Run the setup script
./init.sh
```

The script will:
1. Check Node.js version
2. Install backend dependencies
3. Install frontend dependencies
4. Create environment files
5. Start both development servers

### Manual Setup

If you prefer to set up manually:

```bash
# Backend setup
cd backend
npm install
cp .env.example .env
npm run dev

# Frontend setup (in another terminal)
cd frontend
npm install
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **WebSocket**: ws://localhost:3002

## Project Structure

```
geo-elevate/
+-- backend/
|   +-- src/
|   |   +-- index.js           # Express server entry point
|   |   +-- routes/            # API route handlers
|   |   +-- middleware/        # Auth and other middleware
|   |   +-- models/            # Database models and schema
|   |   +-- services/          # Business logic and WebSocket
|   |   +-- utils/             # Helper functions
|   +-- data/                  # SQLite database files
|   +-- package.json
+-- frontend/
|   +-- src/
|   |   +-- components/        # Reusable UI components
|   |   +-- pages/             # Page components
|   |   +-- context/           # React Context providers
|   |   +-- hooks/             # Custom React hooks
|   |   +-- styles/            # CSS files
|   |   +-- utils/             # Helper functions
|   |   +-- App.jsx
|   |   +-- main.jsx
|   +-- index.html
|   +-- package.json
|   +-- vite.config.js
+-- init.sh                    # Setup script
+-- README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Games
- `GET /api/games/types` - Get available game types
- `GET /api/games/questions` - Get questions for a game
- `POST /api/games/sessions` - Start a game session
- `PATCH /api/games/sessions/:id` - Submit answers/complete game
- `GET /api/games/sessions/:id` - Get session details

### Multiplayer
- `POST /api/multiplayer/challenge` - Send challenge to friend
- `GET /api/multiplayer/invites` - Get pending invites
- `POST /api/multiplayer/invites/:id/accept` - Accept invite
- `POST /api/multiplayer/invites/:id/decline` - Decline invite
- WebSocket `/ws/match/:id` - Real-time game sync

### Friends
- `GET /api/friends` - Get friends list
- `POST /api/friends/request` - Send friend request
- `POST /api/friends/request/:id/accept` - Accept friend request
- `DELETE /api/friends/:id` - Remove friend

### Leaderboards
- `GET /api/leaderboards/global` - Global leaderboard
- `GET /api/leaderboards/game/:gameType` - Per-game leaderboard
- `GET /api/leaderboards/weekly` - Weekly leaderboard
- `GET /api/leaderboards/friends` - Friends-only leaderboard

## Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
DATABASE_PATH=./data/geoelevate.db
FRONTEND_URL=http://localhost:5173
WS_PORT=3002
```

## Development

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests (coming soon)
cd frontend
npm test
```

### Building for Production

```bash
# Frontend build
cd frontend
npm run build

# Backend runs directly with Node.js
cd backend
npm start
```

## Security Features

- JWT tokens with short expiry (15 min access, 30 day refresh)
- httpOnly cookies for refresh tokens
- Password hashing with bcrypt
- Server-side answer validation for multiplayer
- Rate limiting on answer submissions
- Anti-cheat timing verification

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
