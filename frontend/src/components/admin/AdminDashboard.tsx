// frontend/src/components/admin/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import UserManagement from './UserManagement';
import StudentVerification from './StudentVerification';
import DonationManagement from './DonationManagement';
import AnalyticsDashboard from './AnalyticsDashboard';
import SystemSettings from './SystemSettings';
import { API_BASE_URL } from '../../config/api';

interface AdminDashboardProps {
  userData: any;
  onLogout: () => void;
}

interface PlatformStats {
  totalStudents: number;
  totalDonors: number;
  totalDonations: number;
  totalRevenue: number;
  pendingVerifications: number;
  activeStudents: number;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ userData, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<PlatformStats>({
    totalStudents: 0,
    totalDonors: 0,
    totalDonations: 0,
    totalRevenue: 0,
    pendingVerifications: 0,
    activeStudents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);



  // Add debugging
  console.log('[AdminDashboard] API_BASE_URL:', API_BASE_URL);
  console.log('[AdminDashboard] User data:', userData);
  console.log('[AdminDashboard] Available keys in userData:', Object.keys(userData || {}));
  console.log('[AdminDashboard] Token specifically:', userData?.token);
  console.log('[AdminDashboard] Access token:', userData?.accessToken);
  console.log('[AdminDashboard] Auth token:', userData?.authToken);

  // Fetch platform statistics
  const fetchPlatformStats = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log('[AdminDashboard] Fetching platform stats...');
      console.log('[AdminDashboard] Using token:', userData?.token);
      console.log('[AdminDashboard] API URL:', `${API_BASE_URL}/api/admin/stats`);
      console.log('[AdminDashboard] Full URL:', `${API_BASE_URL}/api/admin/stats`);
      console.log('[AdminDashboard] API_BASE_URL value:', API_BASE_URL);

      // Check if token exists
      if (!userData?.token) {
        console.error('[AdminDashboard] No token found in userData');
        console.error('[AdminDashboard] userData keys:', Object.keys(userData || {}));
        Alert.alert('Authentication Error', 'No valid token found. Please log in again.', [
          { text: 'OK', onPress: onLogout }
        ]);
        return;
      }

      console.log('[AdminDashboard] Token found, length:', userData.token.length);
      console.log('[AdminDashboard] Token preview:', userData.token.substring(0, 20) + '...');

      const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json',
          // Remove the x-access-token header for now to avoid conflicts
        },
      });

      console.log('[AdminDashboard] Stats response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          Alert.alert('Session Expired', 'Please log in again.', [
            { text: 'OK', onPress: onLogout }
          ]);
          return;
        }
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      const data = await response.json();
      console.log('[AdminDashboard] Stats data received:', data);

      setStats({
        totalStudents: data.totalStudents || 0,
        totalDonors: data.totalDonors || 0,
        totalDonations: data.totalDonations || 0,
        totalRevenue: data.totalRevenue || 0,
        pendingVerifications: data.pendingVerifications || 0,
        activeStudents: data.activeStudents || 0,
      });

    } catch (error: any) {
      console.error('💥 [AdminDashboard] Error in fetchPlatformStats:', error);
      console.error('💥 [AdminDashboard] Error type:', typeof error);
      console.error('💥 [AdminDashboard] Error name:', error?.name);
      console.error('💥 [AdminDashboard] Error message:', error?.message);

      // Check if it's a CORS error
      if (error?.message?.includes('CORS') || error?.message?.includes('cors') ||
          error?.message?.includes('cross-origin') || error?.name === 'TypeError') {
        console.error('🚫 [AdminDashboard] CORS ERROR DETECTED!');
        Alert.alert(
          'Connection Error',
          `CORS error: Cannot connect to backend at ${API_BASE_URL}. Please check:\n\n1. Backend is running on port 3001\n2. CORS is properly configured\n3. Frontend URL is whitelisted`,
          [
            { text: 'Retry', onPress: () => fetchPlatformStats() },
            { text: 'Continue Offline' }
          ]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to load platform statistics. Using offline data.',
          [{ text: 'Retry', onPress: () => fetchPlatformStats() }, { text: 'Continue' }]
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchPlatformStats();
  }, []);

  // Handle quick actions
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'verifications':
        setActiveTab('verification');
        break;
      case 'users':
        setActiveTab('users');
        break;
      case 'donations':
        setActiveTab('donations');
        break;
      case 'analytics':
        setActiveTab('analytics');
        break;
      default:
        console.log(`[AdminDashboard] Unknown action: ${action}`);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Render overview tab content
  const renderOverview = () => (
    <ScrollView style={styles.tabContent}>
      {/* Header with refresh */}
      <View style={styles.overviewHeader}>
        <Text style={styles.sectionTitle}>Platform Overview</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => fetchPlatformStats(true)}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.refreshButtonText}>↻ Refresh</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading platform data...</Text>
        </View>
      ) : (
        <>
          {/* Statistics Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.studentCard]}>
              <Text style={styles.statNumber}>{stats.totalStudents.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Students</Text>
            </View>

            <View style={[styles.statCard, styles.donorCard]}>
              <Text style={styles.statNumber}>{stats.totalDonors.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Donors</Text>
            </View>

            <View style={[styles.statCard, styles.donationCard]}>
              <Text style={styles.statNumber}>{stats.totalDonations.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Donations</Text>
            </View>

            <View style={[styles.statCard, styles.revenueCard]}>
              <Text style={styles.statNumber}>{formatCurrency(stats.totalRevenue)}</Text>
              <Text style={styles.statLabel}>Total Revenue</Text>
            </View>

            <View style={[styles.statCard, styles.pendingCard]}>
              <Text style={styles.statNumber}>{stats.pendingVerifications.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Pending Verifications</Text>
            </View>

            <View style={[styles.statCard, styles.activeCard]}>
              <Text style={styles.statNumber}>{stats.activeStudents.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Active Students</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={[styles.actionButton, styles.verificationAction]}
                onPress={() => handleQuickAction('verifications')}
              >
                <Text style={styles.actionButtonText}>Review Verifications</Text>
                {stats.pendingVerifications > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{stats.pendingVerifications}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.userAction]}
                onPress={() => handleQuickAction('users')}
              >
                <Text style={styles.actionButtonText}>Manage Users</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.donationAction]}
                onPress={() => handleQuickAction('donations')}
              >
                <Text style={styles.actionButtonText}>View Donations</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.analyticsAction]}
                onPress={() => handleQuickAction('analytics')}
              >
                <Text style={styles.actionButtonText}>Analytics</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Last Updated */}
          <View style={styles.lastUpdated}>
            <Text style={styles.lastUpdatedText}>
              Last updated: {new Date().toLocaleString()}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );

  // Render active tab content
  const renderTabContent = () => {
    console.log('[AdminDashboard] Rendering tab:', activeTab);
    console.log('[AdminDashboard] userData for analytics:', userData);
    console.log('[AdminDashboard] token for analytics:', userData?.token);
    
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'users':
        return <UserManagement token={userData?.token} />;
      case 'donations':
        return <DonationManagement token={userData?.token} />;
      case 'verification':
        return <StudentVerification token={userData?.token} />;
      case 'analytics':
        return <AnalyticsDashboard token={userData?.token} />;
      case 'settings':
        return <SystemSettings token={userData?.token} />;
      default:
        return renderOverview();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Platform Management & Analytics</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'users', label: 'Users' },
          { key: 'donations', label: 'Donations' },
          { key: 'verification', label: 'Verification' },
          { key: 'analytics', label: 'Analytics' },
          { key: 'settings', label: 'Settings' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              activeTab === tab.key && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === tab.key && styles.activeTabButtonText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.tabContentContainer}>
        {renderTabContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366f1',
  },
  tabButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  tabContentContainer: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  refreshButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 10,
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
  },
  studentCard: {
    borderLeftColor: '#8b5cf6',
  },
  donorCard: {
    borderLeftColor: '#06b6d4',
  },
  donationCard: {
    borderLeftColor: '#10b981',
  },
  revenueCard: {
    borderLeftColor: '#f59e0b',
  },
  pendingCard: {
    borderLeftColor: '#ef4444',
  },
  activeCard: {
    borderLeftColor: '#8b5cf6',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  quickActionsSection: {
    marginBottom: 30,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  actionButton: {
    width: '48%',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    position: 'relative',
  },
  verificationAction: {
    backgroundColor: '#ef4444',
  },
  userAction: {
    backgroundColor: '#3b82f6',
  },
  donationAction: {
    backgroundColor: '#10b981',
  },
  analyticsAction: {
    backgroundColor: '#8b5cf6',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fbbf24',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  lastUpdated: {
    alignItems: 'center',
    marginTop: 20,
  },
  lastUpdatedText: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default AdminDashboard;