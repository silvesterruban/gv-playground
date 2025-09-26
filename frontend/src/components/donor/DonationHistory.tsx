// frontend/src/components/donor/DonationHistory.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { API_BASE_URL } from '../../config/api';

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
  registryItem?: {
    id: string;
    itemName: string;
    category: string;
  };
  paymentMethod: string;
  transactionId?: string;
  note?: string;
}

interface DonationHistoryProps {
  token: string;
  onBack: () => void;
}

const DonationHistory: React.FC<DonationHistoryProps> = ({ token, onBack }) => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalDonations, setTotalDonations] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

//   const getImageUrl = (profilePhoto: string) => {
//     if (!profilePhoto) return null;
//
//     let filename = '';
//     if (profilePhoto.includes('/')) {
//       const parts = profilePhoto.split('/');
//       filename = parts[parts.length - 1];
//     } else {
//       filename = profilePhoto;
//     }
//
//     return `http://3.234.140.112:3001/img/${filename}`;
//   };
    const getImageUrl = (profilePhoto: string) => {
      if (!profilePhoto) return null;

      // If it's already a full URL, return it as-is
      if (profilePhoto.startsWith('http://') || profilePhoto.startsWith('https://')) {
        return profilePhoto;
      }

      // Otherwise, build the URL as before
      let filename = '';
      if (profilePhoto.includes('/')) {
        const parts = profilePhoto.split('/');
        filename = parts[parts.length - 1];
      } else {
        filename = profilePhoto;
      }

      return `${API_BASE_URL}/img/${filename}`;
    };

  useEffect(() => {
    fetchDonations(true);
  }, [searchQuery, filter]);

  const fetchDonations = async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchQuery && { search: searchQuery }),
        ...(filter !== 'all' && { status: filter })
      });

      console.log('Fetching donations with params:', params.toString());

      const response = await fetch(`${API_BASE_URL}/api/donors/donations?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Donations response status:', response.status);
      const data = await response.json();
      console.log('Donations data:', data);

      if (data.success) {
        const rawDonations = data.data.donations || data.donations || [];

        // DEBUG: Log the raw donations to see the structure
        console.log('Raw donations:', rawDonations);
        console.log('First donation structure:', rawDonations[0]);

        // Transform the data to match your interface
        const transformedDonations = rawDonations.map((donation: any) => {
          // Split the studentName into firstName and lastName
          const nameParts = donation.studentName?.split(' ') || ['Unknown', 'User'];
          const firstName = nameParts[0] || 'Unknown';
          const lastName = nameParts.slice(1).join(' ') || 'User';

          return {
            id: donation.id,
            amount: donation.amount * 100, // Convert to cents if needed
            date: donation.createdAt || donation.date || new Date().toISOString(),
            status: donation.status || 'completed',
            donationType: donation.donationType || 'general',
            student: {
              id: donation.studentId,
              firstName: firstName,
              lastName: lastName,
              school: donation.studentSchool || 'Unknown School',
              profilePhoto: donation.studentPhoto
            },
            registryItem: donation.registryItem || undefined,
            paymentMethod: donation.paymentMethod || 'card',
            transactionId: donation.transactionId || donation.id,
            note: donation.note || undefined
          };
        });

        console.log('Transformed donations:', transformedDonations);

        if (reset) {
          setDonations(transformedDonations);
          setPage(2);
        } else {
          setDonations(prev => [...prev, ...transformedDonations]);
          setPage(prev => prev + 1);
        }

        setHasMore(data.data?.pagination?.hasNext || false);
        setTotalDonations(data.data?.summary?.totalDonations || rawDonations.length);
        setTotalAmount(data.data?.summary?.totalAmount || 0);
      } else {
        console.error('Failed to fetch donations:', data.message);
        setDonations([]);
      }
    } catch (error) {
      console.error('Error fetching donations:', error);
      setDonations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

//   const fetchDonations = async (reset = false) => {
//     try {
//       const currentPage = reset ? 1 : page;
//       const params = new URLSearchParams({
//         page: currentPage.toString(),
//         limit: '10',
//         ...(searchQuery && { search: searchQuery }),
//         ...(filter !== 'all' && { status: filter })
//       });
//
//       console.log('Fetching donations with params:', params.toString());
//
//       const response = await fetch(`${API_BASE_URL}/api/donors/donations?${params}`, {
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       });
//
//       console.log('Donations response status:', response.status);
//       const data = await response.json();
//       console.log('Donations data:', data);
//
//       if (data.success) {
//         if (reset) {
//           setDonations(data.data.donations || data.donations || []);
//           setPage(2);
//         } else {
//           setDonations(prev => [...prev, ...(data.data.donations || data.donations || [])]);
//           setPage(prev => prev + 1);
//         }
//
//         setHasMore(data.data?.pagination?.hasNext || false);
//         setTotalDonations(data.data?.summary?.totalDonations || (data.data?.donations || data.donations || []).length);
//         setTotalAmount(data.data?.summary?.totalAmount || 0);
//       } else {
//         console.error('Failed to fetch donations:', data.message);
//         setDonations([]);
//       }
//     } catch (error) {
//       console.error('Error fetching donations:', error);
//       setDonations([]);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchDonations(true);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchDonations(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
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
      case 'completed': return '#4BB543';
      case 'pending': return '#ffa726';
      case 'failed': return '#ff6b6b';
      case 'refunded': return '#9e9e9e';
      default: return '#888';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return '✓';
      case 'pending': return '⏳';
      case 'failed': return '✗';
      case 'refunded': return '↩';
      default: return '?';
    }
  };

  const renderProfileImage = (student: Donation['student']) => {
    if (!student.profilePhoto) {
      return (
        <View style={styles.profilePlaceholder}>
          <Text style={styles.profileInitials}>
            {student.firstName[0]}{student.lastName[0]}
          </Text>
        </View>
      );
    }

    const imageUrl = getImageUrl(student.profilePhoto);

    if (Platform.OS === 'web') {
      return (
        <img
          src={imageUrl}
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            objectFit: 'cover',
            marginRight: 12,
            border: '2px solid rgba(255, 255, 255, 0.1)',
          }}
          alt="Profile"
          crossOrigin="anonymous"
          onError={(e) => {
            console.error('❌ [DonationHistory] Image failed to load:', imageUrl);
            const placeholder = document.createElement('div');
            placeholder.style.cssText = `
              width: 50px;
              height: 50px;
              border-radius: 25px;
              background: #4285F4;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 12px;
              color: white;
              font-size: 18px;
              font-weight: bold;
            `;
            placeholder.textContent = `${student.firstName[0]}${student.lastName[0]}`;
            e.currentTarget.parentElement?.replaceChild(placeholder, e.currentTarget);
          }}
        />
      );
    } else {
      return (
        <Image
          source={{ uri: imageUrl }}
          style={styles.profileImage}
          onError={() => {
            console.error('❌ [DonationHistory] React Native Image error for:', imageUrl);
          }}
        />
      );
    }
  };

  const renderDonation = ({ item }: { item: Donation }) => (
    <View style={styles.donationCard}>
      <View style={styles.donationHeader}>
        {renderProfileImage(item.student)}

        <View style={styles.donationInfo}>
          <Text style={styles.studentName}>
            {item.student.firstName} {item.student.lastName}
          </Text>
          <Text style={styles.schoolName}>{item.student.school}</Text>
          {item.registryItem && (
            <Text style={styles.registryItem}>
              📦 {item.registryItem.itemName}
            </Text>
          )}
        </View>

        <View style={styles.donationDetails}>
          <Text style={styles.donationAmount}>{formatCurrency(item.amount)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusIcon}>{getStatusIcon(item.status)}</Text>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
      </View>

      <View style={styles.donationMeta}>
        <Text style={styles.donationDate}>{formatDate(item.date)}</Text>
        <Text style={styles.paymentMethod}>via {item.paymentMethod || 'N/A'}</Text>
        {item.transactionId && (
          <Text style={styles.transactionId}>ID: {item.transactionId.substring(0, 8)}...</Text>
        )}
      </View>

      {item.note && (
        <View style={styles.noteContainer}>
          <Text style={styles.noteLabel}>Note:</Text>
          <Text style={styles.noteText}>{item.note}</Text>
        </View>
      )}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerTop}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Donation History</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{totalDonations}</Text>
          <Text style={styles.summaryLabel}>Total Donations</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatCurrency(totalAmount * 100)}</Text>
          <Text style={styles.summaryLabel}>Total Amount</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by student name or school..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        {['all', 'completed', 'pending', 'failed'].map((filterOption) => (
          <TouchableOpacity
            key={filterOption}
            style={[
              styles.filterButton,
              filter === filterOption && styles.activeFilterButton
            ]}
            onPress={() => setFilter(filterOption)}
          >
            <Text style={[
              styles.filterButtonText,
              filter === filterOption && styles.activeFilterButtonText
            ]}>
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!loading || refreshing) return null;
    return (
      <View style={styles.footerLoader}>
        <Text style={styles.loadingText}>Loading more donations...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.loadingText}>Loading donations...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No donations found</Text>
        <Text style={styles.emptyText}>
          {searchQuery || filter !== 'all'
            ? 'Try adjusting your search or filters'
            : 'You haven\'t made any donations yet. Start supporting students today!'
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
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121824',
  },
  headerContainer: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: 'rgba(25, 26, 45, 0.9)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 60,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  summaryCard: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34A853',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#a3b3ff',
    marginTop: 4,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeFilterButton: {
    backgroundColor: '#34A853',
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 20,
  },
  donationCard: {
    backgroundColor: 'rgba(25, 26, 45, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  donationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  profilePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileInitials: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  donationInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  schoolName: {
    fontSize: 14,
    color: '#a3b3ff',
    marginTop: 2,
  },
  registryItem: {
    fontSize: 12,
    color: '#34A853',
    marginTop: 2,
  },
  donationDetails: {
    alignItems: 'flex-end',
  },
  donationAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    color: '#fff',
    fontSize: 12,
    marginRight: 4,
  },
  statusText: {
    color: '#fff',
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
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  donationDate: {
    fontSize: 12,
    color: '#888',
  },
  paymentMethod: {
    fontSize: 12,
    color: '#888',
    textTransform: 'capitalize',
  },
  transactionId: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
  },
  noteContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
  },
  noteLabel: {
    fontSize: 12,
    color: '#a3b3ff',
    fontWeight: 'bold',
  },
  noteText: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 2,
  },
  footerLoader: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
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

export default DonationHistory;