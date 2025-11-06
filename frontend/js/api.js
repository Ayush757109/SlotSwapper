// frontend/js/api.js
const API_BASE_URL = 'https://slot-swapper-0hzi.onrender.com';

class ApiService {
    constructor() {
        this.token = localStorage.getItem('token');
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            return data;
        } catch (error) {
            throw error;
        }
    }

    // Auth endpoints
    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    async signup(name, email, password) {
        return this.request('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
    }

    // Event endpoints
    async getEvents() {
        return this.request('/events');
    }

    async createEvent(eventData) {
        return this.request('/events', {
            method: 'POST',
            body: JSON.stringify(eventData)
        });
    }

    async updateEventStatus(eventId, status) {
        return this.request(`/events/${eventId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    }

    async deleteEvent(eventId) {
        return this.request(`/events/${eventId}`, {
            method: 'DELETE'
        });
    }

    // Swap endpoints
    async getSwappableSlots() {
        return this.request('/swaps/swappable-slots');
    }

    async createSwapRequest(mySlotId, theirSlotId) {
        return this.request('/swaps/swap-request', {
            method: 'POST',
            body: JSON.stringify({ mySlotId, theirSlotId })
        });
    }

    async respondToSwap(requestId, accepted) {
        return this.request(`/swaps/swap-response/${requestId}`, {
            method: 'POST',
            body: JSON.stringify({ accepted })
        });
    }

    async getMyRequests() {
        return this.request('/swaps/my-requests');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    isAuthenticated() {
        return !!this.token;
    }
}

// Create global API instance
const api = new ApiService();
