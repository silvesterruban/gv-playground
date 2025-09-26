// Debug script for profile modal issues
console.log('🔍 Debugging Profile Modal Issues');

// Check if we're in a web environment
if (typeof window !== 'undefined') {
  console.log('✅ Running in web environment');
  console.log('📍 Current URL:', window.location.href);
  console.log('🔧 User Agent:', navigator.userAgent);
  
  // Check for React Native Web
  if (window.ReactNativeWebView) {
    console.log('📱 React Native Web detected');
  }
  
  // Check for any global errors
  window.addEventListener('error', (event) => {
    console.error('❌ Global error caught:', event.error);
  });
  
  // Check for unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection:', event.reason);
  });
  
  // Monitor console for any errors
  const originalConsoleError = console.error;
  console.error = (...args) => {
    console.log('🚨 Console error detected:', args);
    originalConsoleError.apply(console, args);
  };
  
  // Check if modals are being rendered
  const checkModals = () => {
    const modals = document.querySelectorAll('[role="dialog"], .modal, [data-modal]');
    console.log('🔍 Found modals:', modals.length);
    modals.forEach((modal, index) => {
      console.log(`Modal ${index + 1}:`, {
        visible: modal.style.display !== 'none',
        zIndex: modal.style.zIndex,
        position: modal.style.position,
        className: modal.className,
        id: modal.id
      });
    });
  };
  
  // Check every 2 seconds
  setInterval(checkModals, 2000);
  
  // Check immediately
  setTimeout(checkModals, 1000);
  
} else {
  console.log('📱 Running in React Native environment');
}

// Check API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://dev1.gradvillage.com';
console.log('🌐 API Base URL:', API_BASE_URL);

// Test API connectivity
fetch(`${API_BASE_URL}/api/health`)
  .then(response => {
    console.log('✅ API health check response:', response.status);
    return response.text();
  })
  .then(data => {
    console.log('📄 API health check data:', data);
  })
  .catch(error => {
    console.error('❌ API health check failed:', error);
  });

console.log('🔍 Debug script loaded successfully'); 