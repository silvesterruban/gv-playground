// Simple test script to verify dashboard functionality
// This can be run in the browser console to test the dashboard

const testDashboard = () => {
  console.log('🧪 Testing Student Dashboard...');
  
  // Test 1: Check if the dashboard component exists
  const dashboardElement = document.querySelector('.dashboard-container');
  if (dashboardElement) {
    console.log('✅ Dashboard container found');
  } else {
    console.log('❌ Dashboard container not found');
  }
  
  // Test 2: Check for key dashboard elements
  const tests = [
    { selector: '.dashboard-header', name: 'Header' },
    { selector: '.stats-container', name: 'Stats' },
    { selector: '.actions-container', name: 'Actions' },
    { selector: '.activity-container', name: 'Activity' }
  ];
  
  tests.forEach(test => {
    const element = document.querySelector(test.selector);
    if (element) {
      console.log(`✅ ${test.name} section found`);
    } else {
      console.log(`❌ ${test.name} section not found`);
    }
  });
  
  // Test 3: Check for modal functionality
  const profileButton = document.querySelector('.action-button');
  if (profileButton) {
    console.log('✅ Action buttons found');
    // Test click functionality
    profileButton.click();
    setTimeout(() => {
      const modal = document.querySelector('.modal-overlay');
      if (modal) {
        console.log('✅ Modal functionality working');
        // Close modal
        modal.click();
      } else {
        console.log('❌ Modal not opening');
      }
    }, 100);
  } else {
    console.log('❌ Action buttons not found');
  }
  
  console.log('🏁 Dashboard test completed');
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testDashboard = testDashboard;
}

export default testDashboard; 