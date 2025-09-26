// frontend/src/components/admin/AnalyticsDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert
} from 'react-native';
import { API_BASE_URL } from '../../config/api';

interface AnalyticsDashboardProps {
  token: string;
}

interface DonationAnalytics {
  summary: {
    totalAmount: number;
    totalCount: number;
    averageAmount: number;
    period: string;
  };
  dailyTrend: Array<{
    date: string;
    count: number;
    total: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    total: number;
  }>;
  topDonors: Array<{
    id: string;
    name: string;
    totalAmount: number;
    donationCount: number;
  }>;
  topStudents: Array<{
    id: string;
    name: string;
    school: string;
    totalReceived: number;
    donationCount: number;
  }>;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ token }) => {
  const [analytics, setAnalytics] = useState<DonationAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      console.log('Fetching donation analytics...');
      console.log('Token:', token);
      console.log('Token type:', typeof token);
      console.log('Token length:', token?.length);

      // Map frontend period to backend period
      const periodMap: { [key: string]: string } = {
        '7d': 'week',
        '30d': 'month',
        '90d': 'quarter',
        '1y': 'year'
      };
      const backendPeriod = periodMap[selectedPeriod] || 'month';

      const url = `${API_BASE_URL}/api/donation-admin/analytics?period=${backendPeriod}`;
      console.log('API URL:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Analytics response status:', response.status);
      console.log('Analytics response headers:', response.headers);
      
      const data = await response.json();
      console.log('Analytics data:', data);

      if (data.success && data.analytics) {
        // Transform backend data to match frontend expectations
        const transformedAnalytics = {
          summary: {
            totalAmount: Number(data.analytics.summary.totalAmount) || 0,
            totalCount: Number(data.analytics.summary.totalDonations) || 0,
            averageAmount: Number(data.analytics.summary.avgDonation) || 0,
            period: selectedPeriod
          },
          dailyTrend: (data.analytics.insights?.dailyTrend || []).map((day: any) => ({
            date: day.date,
            count: Number(day.count) || 0,
            total: Number(day.total) || 0
          })),
          paymentMethods: (data.analytics.breakdowns?.byPaymentMethod || []).map((method: any) => ({
            method: method.paymentMethod,
            count: Number(method._count) || 0,
            total: Number(method._sum?.amount) || 0
          })),
          topDonors: (data.analytics.insights?.topDonors || []).map((donor: any) => ({
            id: donor.id,
            name: donor.name,
            totalAmount: Number(donor.totalAmount) || 0,
            donationCount: Number(donor.donationCount) || 0
          })),
          topStudents: (data.analytics.insights?.topStudents || []).map((student: any) => ({
            id: student.studentId,
            name: student.studentName,
            school: student.school,
            totalReceived: Number(student._sum?.amount) || 0,
            donationCount: Number(student._count) || 0
          }))
        };

        console.log('Transformed analytics:', transformedAnalytics);
        setAnalytics(transformedAnalytics);
      } else {
        console.error('Failed to fetch analytics:', data.message || 'Unknown error');
        Alert.alert('Error', 'Failed to load analytics. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
      case '1y': return 'Last Year';
      default: return 'Last 30 Days';
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'stripe':
      case 'credit_card': return '#4285F4';
      case 'paypal': return '#0070ba';
      case 'zelle': return '#6c1fff';
      default: return '#888';
    }
  };

  const renderSummaryCards = () => {
    if (!analytics) return null;

    return (
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Summary - {getPeriodLabel(selectedPeriod)}</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{formatCurrency(analytics.summary.totalAmount)}</Text>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{analytics.summary.totalCount}</Text>
            <Text style={styles.summaryLabel}>Total Donations</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{formatCurrency(analytics.summary.averageAmount)}</Text>
            <Text style={styles.summaryLabel}>Average Donation</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{analytics.topDonors.length}</Text>
            <Text style={styles.summaryLabel}>Active Donors</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderDailyTrend = () => {
    if (!analytics || !analytics.dailyTrend.length) return null;

    const maxAmount = Math.max(...analytics.dailyTrend.map(d => Number(d.total)));

    return (
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Daily Donation Trend</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chartContainer}>
            {analytics.dailyTrend.map((day, index) => {
              const height = maxAmount > 0 ? (Number(day.total) / maxAmount) * 120 : 0;
              const date = new Date(day.date);

              return (
                <View key={index} style={styles.chartBar}>
                  <View style={styles.barContainer}>
                    <View style={[styles.bar, { height: Math.max(height, 2) }]} />
                  </View>
                  <Text style={styles.barLabel}>
                    {date.getMonth() + 1}/{date.getDate()}
                  </Text>
                  <Text style={styles.barValue}>
                    {formatCurrency(Number(day.total))}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderPaymentMethods = () => {
    if (!analytics || !analytics.paymentMethods.length) return null;

    const totalAmount = analytics.paymentMethods.reduce((sum, method) => sum + method.total, 0);

    return (
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <View style={styles.paymentMethodsContainer}>
          {analytics.paymentMethods.map((method, index) => {
            const percentage = totalAmount > 0 ? (method.total / totalAmount) * 100 : 0;

            return (
              <View key={index} style={styles.paymentMethodItem}>
                <View style={styles.paymentMethodInfo}>
                  <View style={[
                    styles.paymentMethodIndicator,
                    { backgroundColor: getPaymentMethodColor(method.method) }
                  ]} />
                  <Text style={styles.paymentMethodName}>
                    {method.method.charAt(0).toUpperCase() + method.method.slice(1)}
                  </Text>
                </View>
                <View style={styles.paymentMethodStats}>
                  <Text style={styles.paymentMethodAmount}>
                    {formatCurrency(method.total)}
                  </Text>
                  <Text style={styles.paymentMethodPercentage}>
                    {percentage.toFixed(1)}%
                  </Text>
                  <Text style={styles.paymentMethodCount}>
                    {method.count} donations
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderTopDonors = () => {
    if (!analytics || !analytics.topDonors.length) return null;

    return (
      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Top Donors</Text>
        {analytics.topDonors.slice(0, 5).map((donor, index) => (
          <View key={donor.id} style={styles.listItem}>
            <View style={styles.rankContainer}>
              <Text style={styles.rankNumber}>#{index + 1}</Text>
            </View>
            <View style={styles.listItemInfo}>
              <Text style={styles.listItemName}>{donor.name}</Text>
              <Text style={styles.listItemSubtext}>
                {donor.donationCount} donation{donor.donationCount !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.listItemValue}>
              <Text style={styles.listItemAmount}>
                {formatCurrency(donor.totalAmount)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderTopStudents = () => {
    if (!analytics || !analytics.topStudents.length) return null;

    return (
      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>Top Receiving Students</Text>
        {analytics.topStudents.slice(0, 5).map((student, index) => (
          <View key={student.id} style={styles.listItem}>
            <View style={styles.rankContainer}>
              <Text style={styles.rankNumber}>#{index + 1}</Text>
            </View>
            <View style={styles.listItemInfo}>
              <Text style={styles.listItemName}>{student.name}</Text>
              <Text style={styles.listItemSubtext}>
                {student.school} • {student.donationCount} donation{student.donationCount !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.listItemValue}>
              <Text style={styles.listItemAmount}>
                {formatCurrency(student.totalReceived)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {[
        { key: '7d', label: '7D' },
        { key: '30d', label: '30D' },
        { key: '90d', label: '90D' },
        { key: '1y', label: '1Y' }
      ].map((period) => (
        <TouchableOpacity
          key={period.key}
          style={[
            styles.periodButton,
            selectedPeriod === period.key && styles.activePeriod
          ]}
          onPress={() => setSelectedPeriod(period.key)}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === period.key && styles.activePeriodText
          ]}>
            {period.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics Dashboard</Text>
        {renderPeriodSelector()}
      </View>

      {renderSummaryCards()}
      {renderDailyTrend()}
      {renderPaymentMethods()}
      {renderTopDonors()}
      {renderTopStudents()}

      {!analytics && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No analytics data available</Text>
          <Text style={styles.emptyText}>
            Analytics will appear once donations start coming in
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121824',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121824',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  header: {
    padding: 20,
    backgroundColor: 'rgba(25, 26, 45, 0.9)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activePeriod: {
    backgroundColor: '#9C27B0',
  },
  periodButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: 'bold',
  },
  activePeriodText: {
    color: '#fff',
  },
  summarySection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryCard: {
    backgroundColor: 'rgba(25, 26, 45, 0.8)',
    padding: 16,
    borderRadius: 12,
    width: '48%',
    marginBottom: 12,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9C27B0',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#a3b3ff',
    textAlign: 'center',
  },
  chartSection: {
    padding: 20,
    paddingTop: 0,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
  },
  chartBar: {
    alignItems: 'center',
    marginHorizontal: 4,
    minWidth: 40,
  },
  barContainer: {
    height: 120,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    backgroundColor: '#9C27B0',
    width: 24,
    borderRadius: 2,
  },
  barLabel: {
    color: '#888',
    fontSize: 10,
    marginBottom: 2,
  },
  barValue: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  paymentMethodsContainer: {
    backgroundColor: 'rgba(25, 26, 45, 0.8)',
    borderRadius: 12,
    padding: 16,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  paymentMethodName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentMethodStats: {
    alignItems: 'flex-end',
  },
  paymentMethodAmount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentMethodPercentage: {
    color: '#a3b3ff',
    fontSize: 14,
  },
  paymentMethodCount: {
    color: '#888',
    fontSize: 12,
  },
  listSection: {
    padding: 20,
    paddingTop: 0,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 26, 45, 0.8)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  rankContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#9C27B0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listItemInfo: {
    flex: 1,
  },
  listItemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listItemSubtext: {
    color: '#a3b3ff',
    fontSize: 14,
    marginTop: 2,
  },
  listItemValue: {
    alignItems: 'flex-end',
  },
  listItemAmount: {
    color: '#34A853',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default AnalyticsDashboard;