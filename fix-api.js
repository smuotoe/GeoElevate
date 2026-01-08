const fs = require('fs');
const content = `const API_BASE = '/api'
const DEFAULT_TIMEOUT = 15000 // 15 seconds

/**
 * Create an AbortController with timeout.
 *
 * @param {number} ms - Timeout in milliseconds
 * @returns {{ controller: AbortController, timeoutId: number }}
 */
function createTimeoutController(ms) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), ms)
    return { controller, timeoutId }
}

/**
 * API utility for making HTTP requests.
 */
export const api = {
    /**
     * Make a GET request.
     *
     * @param {string} endpoint - API endpoint
     * @returns {Promise<object>} Response data
     */
    async get(endpoint) {
        return request(endpoint, { method: 'GET' })
    },

    /**
     * Make a POST request.
     *
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request body
     * @returns {Promise<object>} Response data
     */
    async post(endpoint, data) {
        return request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        })
    },

    /**
     * Make a PATCH request.
     *
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request body
     * @returns {Promise<object>} Response data
     */
    async patch(endpoint, data) {
        return request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data),
        })
    },

    /**
     * Make a DELETE request.
     *
     * @param {string} endpoint - API endpoint
     * @param {object} data - Optional request body
     * @returns {Promise<object>} Response data
     */
    async delete(endpoint, data) {
        return request(endpoint, {
            method: 'DELETE',
            ...(data && { body: JSON.stringify(data) })
        })
    },
}

/**
 * Make an HTTP request with authentication and timeout.
 *
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @param {number} timeout - Request timeout in ms (default 15s)
 * @returns {Promise<object>} Response data
 */
async function request(endpoint, options = {}, timeout = DEFAULT_TIMEOUT) {
    const url = \`\${API_BASE}\${endpoint}\`
    const token = localStorage.getItem('accessToken')

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: \`Bearer \${token}\` }),
        ...options.headers,
    }

    const { controller, timeoutId } = createTimeoutController(timeout)

    let response
    try {
        response = await fetch(url, {
            ...options,
            headers,
            credentials: 'include',
            signal: controller.signal,
        })
    } catch (err) {
        clearTimeout(timeoutId)
        if (err.name === 'AbortError') {
            throw new Error('Request timed out. Please check your connection and try again.')
        }
        throw new Error('Network error. Please check your connection.')
    }

    clearTimeout(timeoutId)

    // Handle token expiration or invalid token (e.g., localStorage cleared)
    if (response.status === 401) {
        const data = await response.json()
        if (data.error?.code === 'TOKEN_EXPIRED') {
            // Try to refresh token
            const refreshed = await refreshToken()
            if (refreshed) {
                // Retry original request with new token
                const newToken = localStorage.getItem('accessToken')
                return request(endpoint, {
                    ...options,
                    headers: {
                        ...headers,
                        Authorization: \`Bearer \${newToken}\`,
                    },
                }, timeout)
            }
        }
        // Token is invalid or missing - trigger logout and redirect
        localStorage.removeItem('accessToken')
        window.dispatchEvent(new CustomEvent('auth:logout'))
        throw new Error(data.error?.message || 'Authentication required')
    }

    if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Request failed')
    }

    return response.json()
}

/**
 * Attempt to refresh the access token.
 *
 * @returns {Promise<boolean>} Whether refresh was successful
 */
async function refreshToken() {
    try {
        const response = await fetch(\`\${API_BASE}/auth/refresh\`, {
            method: 'POST',
            credentials: 'include',
        })

        if (response.ok) {
            const data = await response.json()
            localStorage.setItem('accessToken', data.accessToken)
            return true
        }
    } catch {
        // Refresh failed
    }

    // Clear token and dispatch auth failure event for redirect to login
    localStorage.removeItem('accessToken')
    window.dispatchEvent(new CustomEvent('auth:logout'))
    return false
}

export default api
`;

fs.writeFileSync('./frontend/src/utils/api.js', content);
console.log('File written successfully');
