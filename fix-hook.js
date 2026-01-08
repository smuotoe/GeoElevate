const fs = require('fs');

const content = `import { useEffect, useCallback, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Hook to warn users about unsaved changes when navigating away.
 * Works with BrowserRouter (doesn't require data router).
 *
 * @param {boolean} hasUnsavedChanges - Whether there are unsaved changes
 * @param {string} message - Warning message to show
 * @returns {{ showDialog: boolean, confirmNavigation: function, cancelNavigation: function, message: string }}
 */
export function useUnsavedChanges(hasUnsavedChanges, message = 'You have unsaved changes. Are you sure you want to leave?') {
    const [showDialog, setShowDialog] = useState(false)
    const [pendingPath, setPendingPath] = useState(null)
    const navigate = useNavigate()
    const location = useLocation()
    const isNavigatingRef = useRef(false)

    // Handle browser back/refresh with beforeunload
    useEffect(() => {
        function handleBeforeUnload(e) {
            if (hasUnsavedChanges) {
                e.preventDefault()
                e.returnValue = message
                return message
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [hasUnsavedChanges, message])

    // Intercept link clicks when there are unsaved changes
    useEffect(() => {
        function handleClick(e) {
            if (!hasUnsavedChanges || isNavigatingRef.current) return

            // Find if click was on a link or inside a link
            let target = e.target
            while (target && target.tagName !== 'A') {
                target = target.parentElement
            }

            if (!target || !target.href) return

            // Check if it's an internal link
            const url = new URL(target.href)
            if (url.origin !== window.location.origin) return
            if (url.pathname === location.pathname) return

            // Prevent default navigation and show dialog
            e.preventDefault()
            e.stopPropagation()
            setPendingPath(url.pathname)
            setShowDialog(true)
        }

        document.addEventListener('click', handleClick, true)
        return () => document.removeEventListener('click', handleClick, true)
    }, [hasUnsavedChanges, location.pathname])

    // Handle browser back button
    useEffect(() => {
        function handlePopState() {
            if (hasUnsavedChanges && !isNavigatingRef.current) {
                // Push current state back to prevent navigation
                window.history.pushState(null, '', location.pathname)
                setPendingPath('__back__')
                setShowDialog(true)
            }
        }

        window.addEventListener('popstate', handlePopState)
        return () => window.removeEventListener('popstate', handlePopState)
    }, [hasUnsavedChanges, location.pathname])

    const confirmNavigation = useCallback(() => {
        setShowDialog(false)
        isNavigatingRef.current = true

        if (pendingPath === '__back__') {
            window.history.back()
        } else if (pendingPath) {
            navigate(pendingPath)
        }

        setPendingPath(null)
        // Reset the flag after navigation
        setTimeout(() => {
            isNavigatingRef.current = false
        }, 100)
    }, [pendingPath, navigate])

    const cancelNavigation = useCallback(() => {
        setShowDialog(false)
        setPendingPath(null)
    }, [])

    return {
        showDialog,
        confirmNavigation,
        cancelNavigation,
        message
    }
}

export default useUnsavedChanges
`;

fs.writeFileSync('./frontend/src/hooks/useUnsavedChanges.js', content);
console.log('useUnsavedChanges.js updated successfully');
