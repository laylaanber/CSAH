// src/api/courses.js
import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const courseAPI = {
  // Get all courses with optional filters
  getCourses: async (filters = {}) => {
    const queryString = new URLSearchParams(filters).toString();
    const response = await api.get(`/courses${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  // Get detailed information about a specific course
  getCourseDetails: async (courseId) => {
    const response = await api.get(`/courses/${courseId}/details`);
    return response.data;
  },

  // Get course prerequisites chain
  getPrerequisiteChain: async (courseId) => {
    const response = await api.get(`/courses/${courseId}/prerequisites`);
    return response.data;
  }
};