#!/usr/bin/env ts-node

/**
 * 🧪 COMPREHENSIVE TEST RUNNER
 * 
 * This script runs the complete test suite to ensure all existing functionality
 * works correctly before implementing new features.
 * 
 * Usage:
 *   npm run test:comprehensive
 *   npm run test:comprehensive:watch
 *   npm run test:comprehensive:coverage
 */

import { execSync } from 'child_process';
import path from 'path';

console.log('🧪 Starting Comprehensive Test Suite...\n');

const testFile = path.join(__dirname, 'comprehensive-test-suite.ts');

try {
  // Run the comprehensive test suite
  console.log('📋 Running comprehensive tests...');
  
  const result = execSync(`npx jest ${testFile} --verbose --detectOpenHandles`, {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  console.log('\n✅ All tests completed successfully!');
  console.log('🎯 Your existing functionality is working correctly.');
  console.log('🚀 You can now safely implement new features.');
  
} catch (error) {
  console.error('\n❌ Some tests failed!');
  console.error('🔍 Please fix the failing tests before proceeding with new features.');
  console.error('💡 This ensures you don\'t break existing functionality.');
  
  process.exit(1);
}







