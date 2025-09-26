// frontend/src/components/admin/DonationManagement.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';

interface Donation {
  id: string;
  amount: number;
  date: string;
  status: string;
  donationType: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    school: string;
    profilePhoto?: string;
  };
  donor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  registryItem?: {
    id: string;
    itemName: string;
    category: string;
  };
  paymentMethod: string;
  transactionId?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

interface DonationStats {
  totalDonations: number;
  totalAmount: number;
  completedDonations: number;
  pendingDonations: number;
  failedDonations: number;
  refundedDonations: number;
  averageDonation: number;
  topDonor?: {
    name: string;
    totalAmount: number;
    donationCount: number;
  };
}

interface DonationManagementProps {
  token: string;
}

const DonationManagement: React.FC<DonationManagementProps> = ({ token }) => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [stats, setStats] = useState<DonationStats>({
    totalDonations: 0,
    totalAmount: 0,
    completedDonations: 0,
    pendingDonations: 0,
    failedDonations: 0,
    refundedDonations: 0,
    averageDonation: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://api-dev2.gradvillage.com');

  useEffect(() => {
    fetchDonations(true);
    fetchDonationStats();
  }, [searchQuery, statusFilter, dateFilter]);

  const fetchDonationStats = async () => {
    try {
      console.log('📊 [AdminDonations] Calculating stats from filtered donations...');

      // Calculate date range for stats (same as donations)
      let startDate, endDate;
      if (dateFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (dateFilter) {
          case 'today':
            startDate = today.toISOString();
            endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
            break;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            startDate = weekAgo.toISOString();
            endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
            break;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            startDate = monthAgo.toISOString();
            endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
            break;
        }
      }

      // Build params for stats query
      const params = new URLSearchParams({
        limit: '1000', // Get more data for accurate stats
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      });

      const response = await fetch(`${API_BASE_URL}/api/donation-admin/donations?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📊 [AdminDonations] Stats response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 [AdminDonations] Stats data received:', data);

        if (data.success && data.donations) {
          const donations = data.donations;
          const totalDonations = donations.length;
          const totalAmount = donations.reduce((sum: number, d: any) => sum + Number(d.amount), 0);
          const statusCounts = donations.reduce((acc: any, d: any) => {
            const status = d.status || 'completed';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {});

          setStats({
            totalDonations,
            totalAmount,
            completedDonations: statusCounts.completed || 0,
            pendingDonations: statusCounts.pending || 0,
            failedDonations: statusCounts.failed || 0,
            refundedDonations: statusCounts.refunded || 0,
            averageDonation: totalDonations > 0 ? totalAmount / totalDonations : 0,
          });
        }
      } else {
        const errorText = await response.text();
        console.error('❌ [AdminDonations] Stats error:', response.status, errorText);
      }
    } catch (error) {
      console.error('💥 [AdminDonations] Error fetching stats:', error);
    }
  };

  const fetchDonations = async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      
      // Convert dateFilter to proper date range parameters
      let startDate, endDate;
      if (dateFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (dateFilter) {
          case 'today':
            startDate = today.toISOString();
            endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
            break;
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            startDate = weekAgo.toISOString();
            endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
            break;
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            startDate = monthAgo.toISOString();
            endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
            break;
        }
      }
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        offset: ((currentPage - 1) * 20).toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      });

      console.log('📋 [AdminDonations] Fetching donations with params:', params.toString());

      // Use the donation-admin endpoint
      const response = await fetch(`${API_BASE_URL}/api/donation-admin/donations?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📋 [AdminDonations] Response status:', response.status);
      const data = await response.json();
      console.log('📋 [AdminDonations] Response data:', data);

      if (response.ok && data.success) {
        const rawDonations = data.donations || [];
        console.log('📋 [AdminDonations] Raw donations count:', rawDonations.length);
        console.log('📋 [AdminDonations] First donation:', rawDonations[0]);

        // Transform data to match frontend expectations
        const transformedDonations = rawDonations.map((donation: any) => {
          return {
            id: donation.id,
            amount: Number(donation.amount), // Remove the * 100 multiplication
            date: donation.createdAt || new Date().toISOString(),
            status: donation.status || 'completed',
            donationType: donation.donationType || 'general',
            student: {
              id: donation.studentId || donation.student?.id || 'unknown',
              firstName: donation.student?.firstName || 'Unknown',
              lastName: donation.student?.lastName || 'Student',
              school: donation.student?.schoolName || 'Unknown School',
              profilePhoto: donation.student?.profilePhoto
            },
            donor: {
              id: donation.donorId || donation.donor?.id || 'unknown',
              firstName: donation.donor?.firstName || donation.donorFirstName || 'Anonymous',
              lastName: donation.donor?.lastName || donation.donorLastName || 'Donor',
              email: donation.donor?.email || donation.donorEmail || 'N/A'
            },
            registryItem: donation.targetRegistry ? {
              id: donation.targetRegistry.id,
              itemName: donation.targetRegistry.itemName,
              category: 'general'
            } : undefined,
            paymentMethod: donation.paymentMethod || 'card',
            transactionId: donation.paymentTransaction?.providerTransactionId || donation.id,
            note: donation.note || undefined,
            createdAt: donation.createdAt || new Date().toISOString(),
            updatedAt: donation.updatedAt || new Date().toISOString()
          };
        });

        console.log('📋 [AdminDonations] Transformed donations count:', transformedDonations.length);
        console.log('📋 [AdminDonations] First transformed:', transformedDonations[0]);

        if (reset) {
          setDonations(transformedDonations);
          setPage(2);
        } else {
          setDonations(prev => [...prev, ...transformedDonations]);
          setPage(prev => prev + 1);
        }

        setHasMore(data.pagination?.total > (currentPage * 20));
      } else {
        console.error('❌ [AdminDonations] Failed to fetch donations:', data.error || 'Unknown error');
        setDonations([]);
      }
    } catch (error) {
      console.error('💥 [AdminDonations] Error fetching donations:', error);
      Alert.alert('Error', 'Failed to load donations. Please try again.');
      setDonations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateDonationStatus = async (donationId: string, newStatus: string) => {
    try {
      // Note: You'll need to implement this endpoint in donation-admin.ts
      const response = await fetch(`${API_BASE_URL}/api/donation-admin/donations/${donationId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setDonations(prev => prev.map(donation =>
          donation.id === donationId
            ? { ...donation, status: newStatus }
            : donation
        ));

        Alert.alert('Success', 'Donation status updated successfully');
        fetchDonationStats();
      } else {
        throw new Error('Failed to update donation status');
      }
    } catch (error) {
      console.error('Error updating donation status:', error);
      Alert.alert('Error', 'Status update feature coming soon');
    }
  };

  const refundDonation = async (donationId: string) => {
    Alert.alert(
      'Confirm Refund',
      'Are you sure you want to refund this donation? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refund',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/donation-admin/refund/${donationId}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  reason: 'Admin initiated refund',
                  notifyDonor: true
                })
              });

              if (response.ok) {
                setDonations(prev => prev.map(donation =>
                  donation.id === donationId
                    ? { ...donation, status: 'refunded' }
                    : donation
                ));
                Alert.alert('Success', 'Donation refunded successfully');
                fetchDonationStats();
              } else {
                throw new Error('Failed to refund donation');
              }
            } catch (error) {
              console.error('Error refunding donation:', error);
              Alert.alert('Error', 'Failed to refund donation');
            }
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchDonations(true);
    fetchDonationStats();
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchDonations(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'failed': return '#ef4444';
      case 'refunded': return '#6b7280';
      default: return '#9ca3af';
    }
  };

  const renderDonationDetails = () => {
    if (!selectedDonation) return null;

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Donation Details</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Transaction Information</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount:</Text>
                <Text style={styles.detailValue}>{formatCurrency(selectedDonation.amount)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedDonation.status) }]}>
                  <Text style={styles.statusText}>{selectedDonation.status}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Transaction ID:</Text>
                <Text style={styles.detailValue}>{selectedDonation.transactionId}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Method:</Text>
                <Text style={styles.detailValue}>{selectedDonation.paymentMethod}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>{formatDate(selectedDonation.createdAt)}</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Student Information</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>
                  {selectedDonation.student.firstName} {selectedDonation.student.lastName}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>School:</Text>
                <Text style={styles.detailValue}>{selectedDonation.student.school}</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Donor Information</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>
                  {selectedDonation.donor.firstName} {selectedDonation.donor.lastName}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email:</Text>
                <Text style={styles.detailValue}>{selectedDonation.donor.email}</Text>
              </View>
            </View>

            {selectedDonation.registryItem && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Registry Item</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Item:</Text>
                  <Text style={styles.detailValue}>{selectedDonation.registryItem.itemName}</Text>
                </View>
              </View>
            )}

            {selectedDonation.note && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Note</Text>
                <Text style={styles.noteText}>{selectedDonation.note}</Text>
              </View>
            )}

            <View style={styles.adminActions}>
              <Text style={styles.detailSectionTitle}>Admin Actions</Text>
              <View style={styles.actionButtons}>
                {selectedDonation.status !== 'refunded' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.refundButton]}
                    onPress={() => refundDonation(selectedDonation.id)}
                  >
                    <Text style={styles.actionButtonText}>Refund</Text>
                  </TouchableOpacity>
                )}

                {selectedDonation.status === 'pending' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => updateDonationStatus(selectedDonation.id, 'completed')}
                  >
                    <Text style={styles.actionButtonText}>Mark Complete</Text>
                  </TouchableOpacity>
                )}

                {selectedDonation.status === 'pending' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.failButton]}
                    onPress={() => updateDonationStatus(selectedDonation.id, 'failed')}
                  >
                    <Text style={styles.actionButtonText}>Mark Failed</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderDonation = ({ item }: { item: Donation }) => (
    <TouchableOpacity
      style={styles.donationCard}
      onPress={() => {
        setSelectedDonation(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.donationHeader}>
        <View style={styles.donationInfo}>
          <Text style={styles.studentName}>
            {item.student.firstName} {item.student.lastName}
          </Text>
          <Text style={styles.schoolName}>{item.student.school}</Text>
          <Text style={styles.donorName}>
            From: {item.donor.firstName} {item.donor.lastName}
          </Text>
          {item.registryItem && (
            <Text style={styles.registryItem}>
              📦 {item.registryItem.itemName}
            </Text>
          )}
        </View>

        <View style={styles.donationDetails}>
          <Text style={styles.donationAmount}>{formatCurrency(item.amount)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
      </View>

      <View style={styles.donationMeta}>
        <Text style={styles.donationDate}>{formatDate(item.createdAt)}</Text>
        <Text style={styles.transactionId}>ID: {item.transactionId?.substring(0, 8)}...</Text>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.title}>Donation Management</Text>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalDonations}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatCurrency(stats.totalAmount)}</Text>
          <Text style={styles.statLabel}>Amount</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.completedDonations}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.pendingDonations}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by student name, donor name, or transaction ID..."
        placeholderTextColor="#6b7280"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <View style={styles.filtersContainer}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Status:</Text>
          <View style={styles.filterButtons}>
            {['all', 'completed', 'pending', 'failed', 'refunded'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  statusFilter === status && styles.activeFilterButton
                ]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[
                  styles.filterButtonText,
                  statusFilter === status && styles.activeFilterButtonText
                ]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Date:</Text>
          <View style={styles.filterButtons}>
            {['all', 'today', 'week', 'month'].map((date) => (
              <TouchableOpacity
                key={date}
                style={[
                  styles.filterButton,
                  dateFilter === date && styles.activeFilterButton
                ]}
                onPress={() => setDateFilter(date)}
              >
                <Text style={[
                  styles.filterButtonText,
                  dateFilter === date && styles.activeFilterButtonText
                ]}>
                  {date.charAt(0).toUpperCase() + date.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading donations...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No donations found</Text>
        <Text style={styles.emptyText}>
          {searchQuery || statusFilter !== 'all' || dateFilter !== 'all'
            ? 'Try adjusting your search or filters'
            : 'No donations have been made yet'
          }
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={donations}
        renderItem={renderDonation}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />

      {renderDonationDetails()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  headerContainer: {
    padding: 20,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 16,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filterGroup: {
    marginBottom: 12,
  },
  filterLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
    marginBottom: 8,
  },
  activeFilterButton: {
    backgroundColor: '#6366f1',
  },
  filterButtonText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 20,
  },
  donationCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  donationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  donationInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  schoolName: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  donorName: {
    fontSize: 12,
    color: '#6366f1',
    marginTop: 2,
  },
  registryItem: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 2,
  },
  donationDetails: {
    alignItems: 'flex-end',
  },
  donationAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  donationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  donationDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  transactionId: {
    fontSize: 10,
    color: '#6b7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 10,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#6b7280',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  detailLabel: {
    fontSize: 14,
    color: '#94a3b8',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#ffffff',
    flex: 2,
    textAlign: 'right',
  },
  noteText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  adminActions: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  refundButton: {
    backgroundColor: '#ef4444',
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  failButton: {
    backgroundColor: '#f59e0b',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default DonationManagement;