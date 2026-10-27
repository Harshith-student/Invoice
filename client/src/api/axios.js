import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api'),
  withCredentials: true, // allows httpOnly cookies to be sent and received
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
