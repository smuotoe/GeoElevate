import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import Today from './pages/Today'
import Games from './pages/Games'
import GamePlay from './pages/GamePlay'
import Leaderboards from './pages/Leaderboards'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import Friends from './pages/Friends'
import Settings from './pages/Settings'
import Achievements from './pages/Achievements'
import NotFound from './pages/NotFound'

// Components
import BottomNav from './components/BottomNav'
import ProtectedRoute from './components/ProtectedRoute'

import './styles/App.css'

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
                    {/* Public routes */}
                    <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
                    <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />

                    {/* Protected routes */}
                    <Route path="/" element={
                        <ProtectedRoute>
                            <Today />
                        </ProtectedRoute>
                    } />
                    <Route path="/games" element={
                        <ProtectedRoute>
                            <Games />
                        </ProtectedRoute>
                    } />
                    <Route path="/games/:gameType" element={
                        <ProtectedRoute>
                            <Games />
                        </ProtectedRoute>
                    } />
                    <Route path="/play/:gameType" element={
                        <ProtectedRoute>
                            <GamePlay />
                        </ProtectedRoute>
                    } />
                    <Route path="/leaderboards" element={
                        <ProtectedRoute>
                            <Leaderboards />
                        </ProtectedRoute>
                    } />
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

                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </main>

            {user && <BottomNav />}
        </div>
    )
}

export default App
