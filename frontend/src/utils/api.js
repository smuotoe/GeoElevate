const API_BASE = '/api'

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
 * Make an HTTP request with authentication.
 *
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Response data
 */
async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`
    const token = localStorage.getItem('accessToken')

    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    }

    const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
    })

    // Handle token expiration
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
                        Authorization: `Bearer ${newToken}`,
                    },
                })
            }
        }
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
        const response = await fetch(`${API_BASE}/auth/refresh`, {
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

    // Clear token and redirect to login
    localStorage.removeItem('accessToken')
    return false
}

export default api
