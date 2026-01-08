const fs = require('fs')

// Update App.jsx to add Help route
let appContent = fs.readFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/App.jsx', 'utf8')

// Add Help import
appContent = appContent.replace(
    "import Achievements from './pages/Achievements'",
    "import Achievements from './pages/Achievements'\nimport Help from './pages/Help'"
)

// Add Help route (guest-accessible)
appContent = appContent.replace(
    '<Route path="/leaderboards" element={<Leaderboards />} />',
    '<Route path="/leaderboards" element={<Leaderboards />} />\n                    <Route path="/help" element={<Help />} />'
)

fs.writeFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/App.jsx', appContent)
console.log('Updated App.jsx with Help route')

// Update Settings.jsx to add link to Help page
let settingsContent = fs.readFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/Settings.jsx', 'utf8')

// Add Link import
settingsContent = settingsContent.replace(
    "import { useNavigate } from 'react-router-dom'",
    "import { useNavigate, Link } from 'react-router-dom'"
)

// Update Help & Support section to include link
settingsContent = settingsContent.replace(
    `<section className="card mb-md">
                <h3 className="mb-md">Help & Support</h3>
                <p className="text-secondary">FAQ, contact support, and more.</p>
            </section>`,
    `<section className="card mb-md">
                <h3 className="mb-md">Help & Support</h3>
                <p className="text-secondary mb-md">FAQ, contact support, and more.</p>
                <Link to="/help" className="btn btn-secondary">
                    View Help & FAQ
                </Link>
            </section>`
)

fs.writeFileSync('C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/Settings.jsx', settingsContent)
console.log('Updated Settings.jsx with Help link')
