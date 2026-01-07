import { createContext, useContext, useReducer, useEffect } from 'react'
import { api } from '../utils/api'

const AuthContext = createContext(null)

const initialState = {
    user: null,
    loading: true,
    error: null,
}

/**
 * Auth reducer for managing authentication state.
 *
 * @param {object} state - Current state
 * @param {object} action - Action to perform
 * @returns {object} New state
 */
function authReducer(state, action) {
    switch (action.type) {
        case 'SET_USER':
            return { ...state, user: action.payload, loading: false, error: null }
        case 'LOGOUT':
            return { ...state, user: null, loading: false, error: null }
        case 'SET_LOADING':
            return { ...state, loading: action.payload }
        case 'SET_ERROR':
            return { ...state, error: action.payload, loading: false }
        default:
            return state
    }
}

/**
 * AuthProvider component for wrapping the app with auth context.
 *
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {React.ReactElement} Provider component
 */
export function AuthProvider({ children }) {
    const [state, dispatch] = useReducer(authReducer, initialState)

    // Check for existing session on mount
    useEffect(() => {
        checkAuth()
    }, [])

    // Listen for auth:logout events from API (e.g., token invalid/expired)
    useEffect(() => {
        function handleAuthLogout() {
            dispatch({ type: 'LOGOUT' })
        }
        window.addEventListener('auth:logout', handleAuthLogout)
        return () => {
            window.removeEventListener('auth:logout', handleAuthLogout)
        }
    }, [])

    /**
     * Check if user is authenticated.
     */
    async function checkAuth() {
        const token = localStorage.getItem('accessToken')
        if (!token) {
            dispatch({ type: 'SET_LOADING', payload: false })
            return
        }

        try {
            const response = await api.get('/auth/me')
            dispatch({ type: 'SET_USER', payload: response.user })
        } catch {
            localStorage.removeItem('accessToken')
            dispatch({ type: 'SET_LOADING', payload: false })
        }
    }

    /**
     * Login user with email and password.
     *
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {object} Login result
     */
    async function login(email, password) {
        try {
            const response = await api.post('/auth/login', { email, password })
            localStorage.setItem('accessToken', response.accessToken)
            dispatch({ type: 'SET_USER', payload: response.user })
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    /**
     * Register a new user.
     *
     * @param {string} email - User email
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {object} Registration result
     */
    async function register(email, username, password) {
        try {
            const response = await api.post('/auth/register', { email, username, password })
            localStorage.setItem('accessToken', response.accessToken)
            dispatch({ type: 'SET_USER', payload: response.user })
            return { success: true }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    /**
     * Logout the current user.
     */
    async function logout() {
        try {
            await api.post('/auth/logout')
        } catch {
            // Ignore errors during logout
        }
        localStorage.removeItem('accessToken')
        dispatch({ type: 'LOGOUT' })
    }

    const value = {
        user: state.user,
        loading: state.loading,
        error: state.error,
        login,
        register,
        logout,
        checkAuth,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

/**
 * Hook to use auth context.
 *
 * @returns {object} Auth context value
 */
export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export default AuthContext
