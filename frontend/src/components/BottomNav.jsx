import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Home, Trophy, Gamepad2, Bell, User, LogIn } from 'lucide-react'
import './BottomNav.css'

/**
 * Bottom navigation bar component.
 * Shows different items based on login status.
 *
 * @returns {React.ReactElement} Navigation component
 */
function BottomNav() {
    const { user } = useAuth()

    return (
        <nav className="bottom-nav">
            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><Home size={24} /></span>
                <span className="nav-label">Today</span>
            </NavLink>
            <NavLink to="/leaderboards" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><Trophy size={24} /></span>
                <span className="nav-label">Leaderboards</span>
            </NavLink>
            <NavLink to="/games" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon"><Gamepad2 size={24} /></span>
                <span className="nav-label">Games</span>
            </NavLink>
            {user ? (
                <>
                    <NavLink to="/notifications" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <span className="nav-icon"><Bell size={24} /></span>
                        <span className="nav-label">Alerts</span>
                    </NavLink>
                    <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <span className="nav-icon"><User size={24} /></span>
                        <span className="nav-label">Me</span>
                    </NavLink>
                </>
            ) : (
                <NavLink to="/login" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <span className="nav-icon"><LogIn size={24} /></span>
                    <span className="nav-label">Log In</span>
                </NavLink>
            )}
        </nav>
    )
}

export default BottomNav
