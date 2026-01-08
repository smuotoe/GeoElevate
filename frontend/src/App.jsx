import { Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "./context/AuthContext"

// Pages
import Login from "./pages/Login"
import Register from "./pages/Register"
import ForgotPassword from "./pages/ForgotPassword"
import ResetPassword from "./pages/ResetPassword"
import Today from "./pages/Today"
import Games from "./pages/Games"
import GamePlay from "./pages/GamePlay"
import Leaderboards from "./pages/Leaderboards"
import Notifications from "./pages/Notifications"
import Profile from "./pages/Profile"
import Friends from "./pages/Friends"
import Settings from "./pages/Settings"
import Achievements from "./pages/Achievements"
import Help from "./pages/Help"
import Multiplayer from "./pages/Multiplayer"
import MultiplayerGame from "./pages/MultiplayerGame"
import MatchDetails from "./pages/MatchDetails"
import SkillAssessment from "./pages/SkillAssessment"
import Tutorial from "./pages/Tutorial"
import NotFound from "./pages/NotFound"

// Components
import BottomNav from "./components/BottomNav"
import ProtectedRoute from "./components/ProtectedRoute"

import "./styles/App.css"

/**
 * Main App component with routing.
 *
 * @returns {React.ReactElement} The app component
 */
function App() {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
                <p>Loading GeoElevate...</p>
            </div>
        )
    }

    return (
        <div className="app">
            <main className="main-content">
                <Routes>
                    {/* Public auth routes */}
                    <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
                    <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
                    <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPassword />} />
                    <Route path="/reset-password" element={user ? <Navigate to="/" /> : <ResetPassword />} />

                    {/* Guest-accessible routes (no login required) */}
                    <Route path="/" element={<Today />} />
                    <Route path="/games" element={<Games />} />
                    <Route path="/games/:gameType" element={<Games />} />
                    <Route path="/play/:gameType" element={<GamePlay />} />
                    <Route path="/leaderboards" element={<Leaderboards />} />
                    <Route path="/help" element={<Help />} />

                    {/* Multiplayer - requires login */}
                    <Route path="/multiplayer" element={
                        <ProtectedRoute>
                            <Multiplayer />
                        </ProtectedRoute>
                    } />
                    <Route path="/multiplayer/lobby/:matchId" element={
                        <ProtectedRoute>
                            <Multiplayer />
                        </ProtectedRoute>
                    } />
                    <Route path="/multiplayer/game/:gameType" element={
                        <ProtectedRoute>
                            <MultiplayerGame />
                        </ProtectedRoute>
                    } />
                    <Route path="/multiplayer/match/:matchId" element={
                        <ProtectedRoute>
                            <MatchDetails />
                        </ProtectedRoute>
                    } />

                    {/* User-only routes (require login) */}
                    <Route path="/notifications" element={
                        <ProtectedRoute>
                            <Notifications />
                        </ProtectedRoute>
                    } />
                    <Route path="/profile" element={
                        <ProtectedRoute>
                            <Profile />
                        </ProtectedRoute>
                    } />
                    <Route path="/profile/:userId" element={
                        <ProtectedRoute>
                            <Profile />
                        </ProtectedRoute>
                    } />
                    <Route path="/friends" element={
                        <ProtectedRoute>
                            <Friends />
                        </ProtectedRoute>
                    } />
                    <Route path="/settings" element={
                        <ProtectedRoute>
                            <Settings />
                        </ProtectedRoute>
                    } />
                    <Route path="/achievements" element={
                        <ProtectedRoute>
                            <Achievements />
                        </ProtectedRoute>
                    } />
                    <Route path="/assessment" element={
                        <ProtectedRoute>
                            <SkillAssessment />
                        </ProtectedRoute>
                    } />
                    <Route path="/tutorial" element={
                        <ProtectedRoute>
                            <Tutorial />
                        </ProtectedRoute>
                    } />

                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </main>

            <BottomNav />
        </div>
    )
}

export default App
