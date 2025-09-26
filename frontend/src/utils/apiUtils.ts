// utils/apiUtils.ts
import { API_BASE_URL } from '../config/api';

// Get the base API URL
export const getApiUrl = () => API_BASE_URL;

// Get image URL for profile photos
export const getImageUrl = (filename: string) => {
  if (!filename) return '';
  
  // Remove any existing base URL if present
  const cleanFilename = filename.replace(/^https?:\/\/[^\/]+/, '');
  
  // Return the full URL
  return `${API_BASE_URL}/img/${cleanFilename.split('/').pop()}`;
};

// Get photo URL for profile photos (alternative endpoint)
export const getPhotoUrl = (filename: string) => {
  if (!filename) return '';
  
  // Remove any existing base URL if present
  const cleanFilename = filename.replace(/^https?:\/\/[^\/]+/, '');
  
  // Return the full URL
  return `${API_BASE_URL}/photos/${cleanFilename.split('/').pop()}`;
};

// Get API endpoint URL
export const getApiEndpoint = (endpoint: string) => {
  return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
}; 