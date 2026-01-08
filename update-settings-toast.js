const fs = require('fs');

// Read the current file
let content = fs.readFileSync('./frontend/src/pages/Settings.jsx', 'utf8');

// Add useEffect to import
content = content.replace(
    "import { useState } from 'react'",
    "import { useState, useEffect } from 'react'"
);

// Add useEffect for auto-dismiss toast after the hasUnsavedChanges section
const toastEffect = `

    // Auto-dismiss success toast after 3 seconds
    useEffect(() => {
        if (passwordSuccess) {
            const timer = setTimeout(() => {
                setPasswordSuccess('')
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [passwordSuccess])
`;

content = content.replace(
    `    // Track unsaved changes in the password form
    const hasUnsavedChanges = showPasswordForm && (currentPassword || newPassword || confirmPassword)
    const { showDialog, confirmNavigation, cancelNavigation, message } = useUnsavedChanges(
        hasUnsavedChanges,
        'You have unsaved changes in the password form. Are you sure you want to leave?'
    )`,
    `    // Track unsaved changes in the password form
    const hasUnsavedChanges = showPasswordForm && (currentPassword || newPassword || confirmPassword)
    const { showDialog, confirmNavigation, cancelNavigation, message } = useUnsavedChanges(
        hasUnsavedChanges,
        'You have unsaved changes in the password form. Are you sure you want to leave?'
    )${toastEffect}`
);

fs.writeFileSync('./frontend/src/pages/Settings.jsx', content);
console.log('Settings.jsx updated with auto-dismiss toast');
