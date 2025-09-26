#!/usr/bin/env node

/**
 * Amount Reconciliation Script
 * 
 * This script verifies that dollar amounts are consistent between:
 * - Database storage
 * - Backend API responses
 * - Frontend calculations
 * - Currency formatting
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configuration
const API_BASE_URL = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@village.com';
const ADMIN_PASSWORD = 'AdminPassword123!';

class AmountReconciliation {
  constructor() {
    this.issues = [];
    this.summary = {
      totalDonations: 0,
      totalAmount: 0,
      issuesFound: 0,
      checks: {
        database: { passed: 0, failed: 0 },
        api: { passed: 0, failed: 0 },
        formatting: { passed: 0, failed: 0 }
      }
    };
  }

  async login() {
    try {
      console.log('🔐 Logging in as admin...');
      const response = await fetch(`${API_BASE_URL}/api/auth/login/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error('Login failed: ' + data.message);
      }

      this.token = data.token;
      console.log('✅ Login successful');
      return true;
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      return false;
    }
  }

  async checkDatabaseAmounts() {
    console.log('\n📊 Checking database amounts...');
    
    try {
      // Get all donations
      const donations = await prisma.donation.findMany({
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
          donationType: true
        },
        orderBy: { createdAt: 'desc' }
      });

      this.summary.totalDonations = donations.length;
      
      let totalAmount = 0;
      let completedAmount = 0;
      let stringAmounts = 0;
      let invalidAmounts = 0;

      for (const donation of donations) {
        // Check if amount is a string
        if (typeof donation.amount === 'string') {
          stringAmounts++;
          this.issues.push({
            type: 'database',
            issue: 'Amount stored as string',
            donationId: donation.id,
            amount: donation.amount,
            expected: 'Should be stored as number'
          });
        }

        // Check if amount is valid number
        const amount = Number(donation.amount);
        if (isNaN(amount) || amount < 0) {
          invalidAmounts++;
          this.issues.push({
            type: 'database',
            issue: 'Invalid amount',
            donationId: donation.id,
            amount: donation.amount,
            expected: 'Should be valid positive number'
          });
        } else {
          totalAmount += amount;
          if (donation.status === 'completed') {
            completedAmount += amount;
          }
          this.summary.checks.database.passed++;
        }
      }

      this.summary.totalAmount = totalAmount;
      this.summary.completedAmount = completedAmount;
      this.summary.checks.database.failed = stringAmounts + invalidAmounts;

      console.log(`✅ Database check complete:`);
      console.log(`   - Total donations: ${donations.length}`);
      console.log(`   - Total amount: $${totalAmount.toFixed(2)}`);
      console.log(`   - Completed amount: $${completedAmount.toFixed(2)}`);
      console.log(`   - String amounts: ${stringAmounts}`);
      console.log(`   - Invalid amounts: ${invalidAmounts}`);
      console.log(`   - Passed checks: ${this.summary.checks.database.passed}`);
      console.log(`   - Failed checks: ${this.summary.checks.database.failed}`);

    } catch (error) {
      console.error('❌ Database check failed:', error);
    }
  }

  async checkAPIAmounts() {
    console.log('\n🌐 Checking API amounts...');
    
    try {
      // Test analytics endpoint
      const analyticsResponse = await fetch(`${API_BASE_URL}/api/donation-admin/analytics?period=month`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      const analyticsData = await analyticsResponse.json();
      
      if (analyticsData.success) {
        const summary = analyticsData.analytics.summary;
        const dailyTrend = analyticsData.analytics.insights.dailyTrend;
        
        // Check summary amounts
        const apiTotalAmount = Number(summary.totalAmount);
        const apiAvgAmount = Number(summary.avgDonation);
        
        // Compare with completed amount (analytics API only counts completed donations)
        if (Math.abs(apiTotalAmount - this.summary.completedAmount) > 0.01) {
          this.issues.push({
            type: 'api',
            issue: 'Completed amount mismatch',
            database: this.summary.completedAmount,
            api: apiTotalAmount,
            difference: Math.abs(apiTotalAmount - this.summary.completedAmount)
          });
          this.summary.checks.api.failed++;
        } else {
          this.summary.checks.api.passed++;
        }

        // Check daily trend amounts
        let dailyTotal = 0;
        for (const day of dailyTrend) {
          const dayAmount = Number(day.total);
          if (isNaN(dayAmount) || dayAmount < 0) {
            this.issues.push({
              type: 'api',
              issue: 'Invalid daily trend amount',
              date: day.date,
              amount: day.total
            });
            this.summary.checks.api.failed++;
          } else {
            dailyTotal += dayAmount;
            this.summary.checks.api.passed++;
          }
        }

        console.log(`✅ API check complete:`);
        console.log(`   - API total amount: $${apiTotalAmount.toFixed(2)}`);
        console.log(`   - API average amount: $${apiAvgAmount.toFixed(2)}`);
        console.log(`   - Daily trend total: $${dailyTotal.toFixed(2)}`);
        console.log(`   - Passed checks: ${this.summary.checks.api.passed}`);
        console.log(`   - Failed checks: ${this.summary.checks.api.failed}`);

      } else {
        throw new Error('Analytics API failed: ' + analyticsData.message);
      }

    } catch (error) {
      console.error('❌ API check failed:', error);
    }
  }

  async checkDonationsAPI() {
    console.log('\n📋 Checking donations API...');
    
    try {
      const donationsResponse = await fetch(`${API_BASE_URL}/api/donation-admin/donations?page=1&limit=100`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      const donationsData = await donationsResponse.json();
      
      if (donationsData.success) {
        const donations = donationsData.donations;
        let apiTotalAmount = 0;
        let validDonations = 0;

        for (const donation of donations) {
          const amount = Number(donation.amount);
          if (!isNaN(amount) && amount >= 0) {
            apiTotalAmount += amount;
            validDonations++;
            this.summary.checks.api.passed++;
          } else {
            this.issues.push({
              type: 'api',
              issue: 'Invalid donation amount in API response',
              donationId: donation.id,
              amount: donation.amount
            });
            this.summary.checks.api.failed++;
          }
        }

        console.log(`✅ Donations API check complete:`);
        console.log(`   - API donations count: ${donations.length}`);
        console.log(`   - Valid donations: ${validDonations}`);
        console.log(`   - API total amount: $${apiTotalAmount.toFixed(2)}`);

      } else {
        throw new Error('Donations API failed: ' + donationsData.message);
      }

    } catch (error) {
      console.error('❌ Donations API check failed:', error);
    }
  }

  testCurrencyFormatting() {
    console.log('\n💰 Testing currency formatting...');
    
    const testAmounts = [0, 25, 100, 1000, 10000, 100000, 1000000];
    
    for (const amount of testAmounts) {
      try {
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(amount);

        // Check if formatting looks correct
        if (formatted.includes('$') && formatted.includes('.') && formatted.split('.')[1].length === 2) {
          this.summary.checks.formatting.passed++;
          console.log(`   ✅ $${amount.toFixed(2)} → ${formatted}`);
        } else {
          this.summary.checks.formatting.failed++;
          this.issues.push({
            type: 'formatting',
            issue: 'Invalid currency formatting',
            amount: amount,
            formatted: formatted
          });
          console.log(`   ❌ $${amount.toFixed(2)} → ${formatted}`);
        }
      } catch (error) {
        this.summary.checks.formatting.failed++;
        this.issues.push({
          type: 'formatting',
          issue: 'Currency formatting error',
          amount: amount,
          error: error.message
        });
        console.log(`   ❌ $${amount.toFixed(2)} → Error: ${error.message}`);
      }
    }

    console.log(`✅ Formatting check complete:`);
    console.log(`   - Passed checks: ${this.summary.checks.formatting.passed}`);
    console.log(`   - Failed checks: ${this.summary.checks.formatting.failed}`);
  }

  generateReport() {
    console.log('\n📈 RECONCILIATION REPORT');
    console.log('=' .repeat(50));
    
    const totalChecks = 
      this.summary.checks.database.passed + this.summary.checks.database.failed +
      this.summary.checks.api.passed + this.summary.checks.api.failed +
      this.summary.checks.formatting.passed + this.summary.checks.formatting.failed;
    
    const totalPassed = 
      this.summary.checks.database.passed +
      this.summary.checks.api.passed +
      this.summary.checks.formatting.passed;
    
    const totalFailed = 
      this.summary.checks.database.failed +
      this.summary.checks.api.failed +
      this.summary.checks.formatting.failed;

    console.log(`📊 SUMMARY:`);
    console.log(`   - Total donations: ${this.summary.totalDonations}`);
    console.log(`   - Total amount: $${this.summary.totalAmount.toFixed(2)}`);
    console.log(`   - Total checks: ${totalChecks}`);
    console.log(`   - Passed: ${totalPassed}`);
    console.log(`   - Failed: ${totalFailed}`);
    console.log(`   - Success rate: ${((totalPassed / totalChecks) * 100).toFixed(1)}%`);

    if (this.issues.length > 0) {
      console.log(`\n⚠️  ISSUES FOUND (${this.issues.length}):`);
      console.log('-'.repeat(50));
      
      const groupedIssues = this.issues.reduce((acc, issue) => {
        if (!acc[issue.type]) acc[issue.type] = [];
        acc[issue.type].push(issue);
        return acc;
      }, {});

      for (const [type, issues] of Object.entries(groupedIssues)) {
        console.log(`\n${type.toUpperCase()} ISSUES (${issues.length}):`);
        issues.forEach((issue, index) => {
          console.log(`   ${index + 1}. ${issue.issue}`);
          if (issue.donationId) console.log(`      Donation ID: ${issue.donationId}`);
          if (issue.amount) console.log(`      Amount: ${issue.amount}`);
          if (issue.expected) console.log(`      Expected: ${issue.expected}`);
          if (issue.difference) console.log(`      Difference: $${issue.difference.toFixed(2)}`);
        });
      }
    } else {
      console.log(`\n🎉 NO ISSUES FOUND! All amounts are consistent.`);
    }

    console.log('\n' + '='.repeat(50));
  }

  async run() {
    console.log('🔍 Starting Amount Reconciliation...\n');
    
    // Login
    if (!(await this.login())) {
      return;
    }

    // Run all checks
    await this.checkDatabaseAmounts();
    await this.checkAPIAmounts();
    await this.checkDonationsAPI();
    this.testCurrencyFormatting();

    // Generate report
    this.generateReport();

    // Cleanup
    await prisma.$disconnect();
  }
}

// Run the reconciliation
async function main() {
  const reconciliation = new AmountReconciliation();
  await reconciliation.run();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = AmountReconciliation; 