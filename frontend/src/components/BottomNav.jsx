import { NavLink } from 'react-router-dom'
import './BottomNav.css'

/**
 * Bottom navigation bar component.
 *
 * @returns {React.ReactElement} Navigation component
 */
function BottomNav() {
    return (
        <nav className="bottom-nav">
            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon">&#127968;</span>
                <span className="nav-label">Today</span>
            </NavLink>
            <NavLink to="/leaderboards" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon">&#127942;</span>
                <span className="nav-label">Leaderboards</span>
            </NavLink>
            <NavLink to="/games" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon">&#127918;</span>
                <span className="nav-label">Games</span>
            </NavLink>
            <NavLink to="/notifications" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon">&#128276;</span>
                <span className="nav-label">Notifications</span>
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon">&#128100;</span>
                <span className="nav-label">Me</span>
            </NavLink>
        </nav>
    )
}

export default BottomNav
