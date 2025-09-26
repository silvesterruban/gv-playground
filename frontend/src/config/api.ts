// config/api.ts
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getApiUrl = () => {
  // Check if we have a custom API URL from environment
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // For web platform, use current domain (works with any domain name)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Use current domain - works with k8s-dev-1, k8s-prod, or any other domain
    return window.location.origin;
  }

  // Development mode detection
  const isDev = __DEV__;

  if (isDev) {
    if (Platform.OS === 'web') {
      // For local web development, use localhost backend
      return 'http://localhost:3001';
    } else {
      // For mobile (iOS/Android), use HTTPS - Expo will proxy this correctly
      return 'https://api-dev2.gradvillage.com';
    }
  }

  // Production URLs - Updated to point to AWS dev2 backend with HTTPS
  return 'https://api-dev2.gradvillage.com';
};

export const API_BASE_URL = getApiUrl();

// Enhanced debug logging for cross-platform development
console.log('🔍 API Configuration:', {
  platform: Platform.OS,
  isDev: __DEV__,
  API_BASE_URL,
  hostUri: Constants.expoConfig?.hostUri,
  debuggerHost: Constants.expoConfig?.hostUri?.split(':').shift(),
  env: process.env.EXPO_PUBLIC_API_URL,
  isDevice: Constants.isDevice,
  location: typeof window !== 'undefined' ? window.location.href : 'N/A'
});