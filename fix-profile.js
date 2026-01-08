const fs = require('fs');
const path = 'C:/Users/Somto/Documents/geo-elevate/frontend/src/pages/Profile.jsx';
let content = fs.readFileSync(path, 'utf8');

// Fix: Always fetch stats on mount instead of caching
content = content.replace(
    `useEffect(() => {
        if (activeTab === 'performance' && user?.id && !stats && !statsLoading) {
            fetchStats()
        }
    }, [activeTab, user?.id, stats, statsLoading])`,
    `// Fetch stats on mount and when user changes
    useEffect(() => {
        if (user?.id) {
            fetchStats()
        }
    }, [user?.id])`
);

fs.writeFileSync(path, content);
console.log('Profile.jsx updated successfully');
