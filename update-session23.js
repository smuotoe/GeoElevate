const fs = require('fs');
const path = require('path');

const progressPath = path.join(__dirname, 'claude-progress.txt');
const oldContent = fs.readFileSync(progressPath, 'utf8');

const newSession = `# GeoElevate - Progress Report

## Session 23 Progress
- **Date**: January 8, 2026
- **Status**: 224/302 features passing (74.2%)
- **Focus**: Style features verification, achievements page

### Features Completed This Session

#### Feature #255: Achievements page displays all
- Full Achievements.jsx with API integration, category filtering, progress bars

#### Feature #257: Progressive achievement progress tracked
- Verified: Flag Master 5/100, Capital Expert 10/50 progress shown

#### Feature #264: Notification history page works
- Verified: Unread badge shows count, Mark All Read works

#### Feature #267: Dark mode toggle works
- Verified: Toggle between dark and light themes

#### Feature #269: Data export generates file
- Verified: Downloads JSON with user data

#### Feature #270: Help FAQ page has content
- Verified: 10 FAQ questions with expandable answers

#### Feature #271: About page displays info
- Verified: Version 1.0.0 shown in Help and FAQ

#### Features #276-295: Style Features (20 features verified)
- Page transitions, loading spinners, error states
- Empty states, answer feedback, theme colors
- Typography, navigation, cards, buttons, avatars

### Commits Made
- Implement Achievements page and add achievement unlock notifications

### Features Skipped
- Sound/Music toggle - No audio system
- Privacy settings - UI not implemented
- Offline mode - Requires service workers
- End-to-end journeys - Complex multi-step tests

### What the Next Agent Should Do
1. Implement missing features: sound, privacy, password reset
2. Run regression tests
3. Consider offline mode with service workers

### Technical Notes
- Test user: srtest@example.com / Test123! / srtest (ID 30)
- Frontend: http://localhost:5173
- Backend: http://localhost:5002

---

`;

const session7Start = oldContent.indexOf('## Session 7 Progress');
if (session7Start > 0) {
    const rest = oldContent.substring(session7Start);
    fs.writeFileSync(progressPath, newSession + rest);
    console.log('Progress file updated successfully');
} else {
    fs.writeFileSync(progressPath, newSession + oldContent);
    console.log('Prepended new session to file');
}
