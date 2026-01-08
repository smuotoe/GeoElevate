const fs = require('fs');

// Read the current file
let content = fs.readFileSync('./frontend/src/pages/Settings.jsx', 'utf8');

// Replace the password change validation
const oldValidation = `        // Client-side validation
        if (!currentPassword) {
            setPasswordError('Current password is required')
            return
        }

        if (!newPassword) {
            setPasswordError('New password is required')
            return
        }

        if (newPassword.length < 8) {`;

const newValidation = `        // Client-side validation - trim whitespace
        const trimmedCurrentPassword = currentPassword.trim()
        const trimmedNewPassword = newPassword.trim()

        if (!trimmedCurrentPassword) {
            setPasswordError('Current password is required')
            return
        }

        if (!trimmedNewPassword) {
            setPasswordError('New password is required')
            return
        }

        if (newPassword.length < 8) {`;

content = content.replace(oldValidation, newValidation);

// Replace the delete account validation
const oldDeleteValidation = `        if (!deletePassword) {
            setDeleteError('Password is required to confirm deletion')
            return
        }`;

const newDeleteValidation = `        const trimmedDeletePassword = deletePassword.trim()
        if (!trimmedDeletePassword) {
            setDeleteError('Password is required to confirm deletion')
            return
        }`;

content = content.replace(oldDeleteValidation, newDeleteValidation);

fs.writeFileSync('./frontend/src/pages/Settings.jsx', content);
console.log('Settings.jsx updated with whitespace validation');
