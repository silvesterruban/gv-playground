#!/usr/bin/env node

/**
 * Quick Amount Check Script
 * 
 * A lightweight script to quickly verify amount consistency
 * Run this regularly to monitor for issues
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function quickCheck() {
  console.log('🔍 Quick Amount Check...\n');
  
  try {
    // Check database totals
    const allDonations = await prisma.donation.findMany({
      select: { amount: true, status: true, createdAt: true }
    });
    
    const totalAmount = allDonations.reduce((sum, d) => sum + Number(d.amount), 0);
    const completedDonations = allDonations.filter(d => d.status === 'completed');
    const completedAmount = completedDonations.reduce((sum, d) => sum + Number(d.amount), 0);
    
    // Check for string amounts
    const stringAmounts = allDonations.filter(d => typeof d.amount === 'string').length;
    const invalidAmounts = allDonations.filter(d => isNaN(Number(d.amount)) || Number(d.amount) < 0).length;
    
    console.log('📊 DATABASE SUMMARY:');
    console.log(`   - Total donations: ${allDonations.length}`);
    console.log(`   - Completed donations: ${completedDonations.length}`);
    console.log(`   - Total amount: $${totalAmount.toFixed(2)}`);
    console.log(`   - Completed amount: $${completedAmount.toFixed(2)}`);
    console.log(`   - String amounts: ${stringAmounts}`);
    console.log(`   - Invalid amounts: ${invalidAmounts}`);
    
    // Check recent donations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentDonations = allDonations.filter(d => 
      new Date(d.createdAt) >= thirtyDaysAgo && d.status === 'completed'
    );
    
    const recentAmount = recentDonations.reduce((sum, d) => sum + Number(d.amount), 0);
    
    console.log('\n📅 LAST 30 DAYS:');
    console.log(`   - Completed donations: ${recentDonations.length}`);
    console.log(`   - Total amount: $${recentAmount.toFixed(2)}`);
    console.log(`   - Average donation: $${recentDonations.length > 0 ? (recentAmount / recentDonations.length).toFixed(2) : '0.00'}`);
    
    // Status check
    const statusCounts = allDonations.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📈 STATUS BREAKDOWN:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });
    
    // Issues summary
    const issues = [];
    if (stringAmounts > 0) issues.push(`${stringAmounts} string amounts`);
    if (invalidAmounts > 0) issues.push(`${invalidAmounts} invalid amounts`);
    
    if (issues.length === 0) {
      console.log('\n✅ NO ISSUES FOUND - All amounts look good!');
    } else {
      console.log('\n⚠️  ISSUES FOUND:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
quickCheck().catch(console.error); 