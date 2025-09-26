import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Create axios instance with default config
const api: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData: { name: string; email: string; password: string }) =>
    api.post('/auth/register', userData),
  
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  
  verify: () =>
    api.get('/auth/verify'),
  
  refresh: () =>
    api.post('/auth/refresh'),
};

// User API
export const userAPI = {
  getProfile: () =>
    api.get('/users/profile'),
  
  updateProfile: (data: { name: string }) =>
    api.put('/users/profile', data),
  
  deleteAccount: () =>
    api.delete('/users/profile'),
  
  getAllUsers: (page: number = 1, limit: number = 10) =>
    api.get(`/users?page=${page}&limit=${limit}`),
  
  getUserById: (id: string) =>
    api.get(`/users/${id}`),
};

// Health API
export const healthAPI = {
  getHealth: () =>
    api.get('/health'),
  
  getDetailedHealth: () =>
    api.get('/health/detailed'),
  
  getReadiness: () =>
    api.get('/health/ready'),
  
  getLiveness: () =>
    api.get('/health/live'),
};

// Utility functions
export const setAuthToken = (token: string) => {
  localStorage.setItem('token', token);
};

export const removeAuthToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const isAuthenticated = () => {
  const token = getAuthToken();
  return !!token;
};

export default api;