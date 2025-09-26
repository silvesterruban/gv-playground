// frontend/src/components/admin/UserManagement.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';

interface UserManagementProps {
  token: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'student' | 'donor' | 'admin';
  verified?: boolean;
  isActive?: boolean;
  createdAt: string;
  // Student-specific fields
  schoolName?: string;
  registrationStatus?: string;
  amountRaised?: number;
  fundingGoal?: number;
  // Donor-specific fields
  totalDonated?: number;
  studentsSupported?: number;
  memberSince?: string;
  // Admin-specific fields
  role?: string;
  lastLogin?: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const UserManagement: React.FC<UserManagementProps> = ({ token }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Filters
  const [selectedUserType, setSelectedUserType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'https://api-dev2.gradvillage.com/api');

  // Fetch users
  const fetchUsers = async (page = 1, userType = selectedUserType, search = searchTerm, showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log(`[UserManagement] Fetching users - Page: ${page}, Type: ${userType}`);

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(userType !== 'all' && { userType }),
        ...(search && { search }),
      });

      const response = await fetch(`${API_BASE_URL}/admin/users?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const data = await response.json();
      console.log('[UserManagement] Users data received:', data);

      setUsers(data.users || []);
      setPagination(data.pagination || pagination);

    } catch (error) {
      console.error('[UserManagement] Error fetching users:', error);
      Alert.alert('Error', 'Failed to load users. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load users on component mount and when filters change
  useEffect(() => {
    fetchUsers(1, selectedUserType, searchTerm);
  }, [selectedUserType]);

  // Handle user type filter change
  const handleUserTypeChange = (userType: string) => {
    setSelectedUserType(userType);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Handle search
  const handleSearch = () => {
    fetchUsers(1, selectedUserType, searchTerm);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    fetchUsers(newPage, selectedUserType, searchTerm);
  };

  // Toggle user status
  const toggleUserStatus = async (user: User) => {
    try {
      const newStatus = user.isActive ? 'inactive' : 'active';

      Alert.alert(
        'Confirm Action',
        `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} ${user.firstName} ${user.lastName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                const response = await fetch(`${API_BASE_URL}/admin/users/${user.id}/status`, {
                  method: 'PUT',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    status: newStatus,
                    userType: user.userType,
                    reason: `Admin ${newStatus === 'active' ? 'activated' : 'deactivated'} user`,
                  }),
                });

                if (!response.ok) {
                  throw new Error(`Failed to update user status: ${response.status}`);
                }

                Alert.alert('Success', `User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
                fetchUsers(pagination.currentPage, selectedUserType, searchTerm, true);
              } catch (error) {
                console.error('[UserManagement] Error updating user status:', error);
                Alert.alert('Error', 'Failed to update user status');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('[UserManagement] Error in toggleUserStatus:', error);
    }
  };

  // Format currency
  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get user type badge color
  const getUserTypeBadgeStyle = (userType: string) => {
    switch (userType) {
      case 'student':
        return styles.studentBadge;
      case 'donor':
        return styles.donorBadge;
      case 'admin':
        return styles.adminBadge;
      default:
        return styles.defaultBadge;
    }
  };

  // Render user card
  const renderUserCard = (user: User) => (
    <View key={user.id} style={styles.userCard}>
      {/* Header */}
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>
        <View style={styles.userBadges}>
          <View style={[styles.userTypeBadge, getUserTypeBadgeStyle(user.userType)]}>
            <Text style={styles.badgeText}>{user.userType}</Text>
          </View>
          {user.isActive !== undefined && (
            <View style={[styles.statusBadge, user.isActive ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={styles.badgeText}>{user.isActive ? 'Active' : 'Inactive'}</Text>
            </View>
          )}
        </View>
      </View>

      {/* User Details */}
      <View style={styles.userDetails}>
        {user.userType === 'student' && (
          <>
            <Text style={styles.detailText}>🏫 {user.schoolName || 'No school'}</Text>
            <Text style={styles.detailText}>📋 {user.registrationStatus || 'Unknown'}</Text>
            {user.amountRaised !== undefined && (
              <Text style={styles.detailText}>💰 Raised: {formatCurrency(user.amountRaised)}</Text>
            )}
            {user.fundingGoal !== undefined && user.fundingGoal > 0 && (
              <Text style={styles.detailText}>🎯 Goal: {formatCurrency(user.fundingGoal)}</Text>
            )}
          </>
        )}

        {user.userType === 'donor' && (
          <>
            {user.totalDonated !== undefined && (
              <Text style={styles.detailText}>💝 Donated: {formatCurrency(user.totalDonated)}</Text>
            )}
            {user.studentsSupported !== undefined && (
              <Text style={styles.detailText}>👥 Students Supported: {user.studentsSupported}</Text>
            )}
            {user.memberSince && (
              <Text style={styles.detailText}>📅 Member Since: {formatDate(user.memberSince)}</Text>
            )}
          </>
        )}

        {user.userType === 'admin' && (
          <>
            <Text style={styles.detailText}>👑 Role: {user.role || 'Admin'}</Text>
            {user.lastLogin && (
              <Text style={styles.detailText}>🕐 Last Login: {formatDate(user.lastLogin)}</Text>
            )}
          </>
        )}

        <Text style={styles.detailText}>📅 Joined: {formatDate(user.createdAt)}</Text>
      </View>

      {/* Actions */}
      <View style={styles.userActions}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => setSelectedUser(user)}
        >
          <Text style={styles.buttonText}>View Details</Text>
        </TouchableOpacity>

        {user.userType !== 'admin' && (
          <TouchableOpacity
            style={[styles.statusButton, user.isActive ? styles.deactivateButton : styles.activateButton]}
            onPress={() => toggleUserStatus(user)}
          >
            <Text style={styles.buttonText}>
              {user.isActive ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>User Management</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => fetchUsers(pagination.currentPage, selectedUserType, searchTerm, true)}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.refreshButtonText}>↻ Refresh</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* User Type Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Filter by Type:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterButtons}>
            {['all', 'student', 'donor', 'admin'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterButton,
                  selectedUserType === type && styles.activeFilterButton
                ]}
                onPress={() => handleUserTypeChange(type)}
              >
                <Text style={[
                  styles.filterButtonText,
                  selectedUserType === type && styles.activeFilterButtonText
                ]}>
                  {type === 'all' ? 'All Users' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Search */}
        <View style={styles.searchSection}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#64748b"
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Showing {users.length} of {pagination.totalUsers} users
        </Text>
        <Text style={styles.statsText}>
          Page {pagination.currentPage} of {pagination.totalPages}
        </Text>
      </View>

      {/* User List */}
      <View style={styles.userList}>
        {users.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No users found</Text>
            <Text style={styles.emptyStateSubtext}>
              {selectedUserType !== 'all'
                ? `No ${selectedUserType}s match your criteria`
                : 'Try adjusting your filters'
              }
            </Text>
          </View>
        ) : (
          users.map(renderUserCard)
        )}
      </View>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[styles.paginationButton, !pagination.hasPrevPage && styles.disabledButton]}
            onPress={() => handlePageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrevPage}
          >
            <Text style={styles.paginationButtonText}>← Previous</Text>
          </TouchableOpacity>

          <Text style={styles.paginationInfo}>
            Page {pagination.currentPage} of {pagination.totalPages}
          </Text>

          <TouchableOpacity
            style={[styles.paginationButton, !pagination.hasNextPage && styles.disabledButton]}
            onPress={() => handlePageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNextPage}
          >
            <Text style={styles.paginationButtonText}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* User Detail Modal (placeholder for future implementation) */}
      {selectedUser && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>User Details</Text>
            <Text style={styles.modalText}>
              Full details view for {selectedUser.firstName} {selectedUser.lastName} coming soon!
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedUser(null)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
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
  filtersContainer: {
    marginBottom: 20,
  },
  filterSection: {
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
  },
  filterButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeFilterButton: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#ffffff',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statsText: {
    color: '#64748b',
    fontSize: 14,
  },
  userList: {
    marginBottom: 20,
  },
  userCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#94a3b8',
  },
  userBadges: {
    alignItems: 'flex-end',
  },
  userTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  studentBadge: {
    backgroundColor: '#8b5cf6',
  },
  donorBadge: {
    backgroundColor: '#06b6d4',
  },
  adminBadge: {
    backgroundColor: '#f59e0b',
  },
  defaultBadge: {
    backgroundColor: '#64748b',
  },
  activeBadge: {
    backgroundColor: '#10b981',
  },
  inactiveBadge: {
    backgroundColor: '#ef4444',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  userDetails: {
    marginBottom: 12,
  },
  detailText: {
    color: '#cbd5e1',
    fontSize: 14,
    marginBottom: 4,
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  viewButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  activateButton: {
    backgroundColor: '#10b981',
  },
  deactivateButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  paginationButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  disabledButton: {
    backgroundColor: '#64748b',
    opacity: 0.5,
  },
  paginationButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  paginationInfo: {
    color: '#94a3b8',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 20,
    margin: 20,
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  modalText: {
    color: '#94a3b8',
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default UserManagement;






// // frontend/src/components/admin/UserManagement.tsx
// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList,
//   TouchableOpacity,
//   TextInput,
//   RefreshControl,
//   Alert,
//   Modal
// } from 'react-native';
// import { API_BASE_URL } from '../../config/api';
//
// interface User {
//   id: string;
//   firstName: string;
//   lastName: string;
//   email: string;
//   userType: 'student' | 'donor';
//   verified: boolean;
//   isActive: boolean;
//   createdAt: string;
//   lastLogin?: string;
//   totalAmount: number;
//   school?: string;
//   major?: string;
//   totalDonations?: number;
//   studentsSupported?: number;
// }
//
// interface UserManagementProps {
//   token: string;
// }
//
// const UserManagement: React.FC<UserManagementProps> = ({ token }) => {
//   const [users, setUsers] = useState<User[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [filterType, setFilterType] = useState<'all' | 'student' | 'donor'>('all');
//   const [filterVerified, setFilterVerified] = useState<'all' | 'verified' | 'unverified'>('all');
//   const [page, setPage] = useState(1);
//   const [hasMore, setHasMore] = useState(true);
//   const [totalUsers, setTotalUsers] = useState(0);
//   const [selectedUser, setSelectedUser] = useState<User | null>(null);
//   const [showUserModal, setShowUserModal] = useState(false);
//
//   useEffect(() => {
//     fetchUsers(true);
//   }, [searchQuery, filterType, filterVerified]);
//
//   const fetchUsers = async (reset = false) => {
//     try {
//       const currentPage = reset ? 1 : page;
//       const params = new URLSearchParams({
//         page: currentPage.toString(),
//         limit: '20',
//         ...(searchQuery && { search: searchQuery }),
//         ...(filterType !== 'all' && { userType: filterType }),
//         ...(filterVerified !== 'all' && { verified: (filterVerified === 'verified').toString() })
//       });
//
//       console.log('Fetching users with params:', params.toString());
//
//       const response = await fetch(`${API_BASE_URL}/api/admin/users?${params}`, {
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       });
//
//       console.log('Users response status:', response.status);
//       const data = await response.json();
//       console.log('Users data:', data);
//
//       if (data.success) {
//         if (reset) {
//           setUsers(data.data.users);
//           setPage(2);
//         } else {
//           setUsers(prev => [...prev, ...data.data.users]);
//           setPage(prev => prev + 1);
//         }
//         setHasMore(data.data.pagination.hasNext);
//         setTotalUsers(data.data.pagination.total);
//       } else {
//         console.error('Failed to fetch users:', data.message);
//         Alert.alert('Error', 'Failed to load users. Please try again.');
//       }
//     } catch (error) {
//       console.error('Error fetching users:', error);
//       Alert.alert('Error', 'Network error. Please check your connection and try again.');
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };
//
//   const onRefresh = () => {
//     setRefreshing(true);
//     setPage(1);
//     fetchUsers(true);
//   };
//
//   const loadMore = () => {
//     if (!loading && hasMore) {
//       fetchUsers(false);
//     }
//   };
//
//   const formatCurrency = (amount: number) => {
//     return `$${(amount / 100).toFixed(2)}`;
//   };
//
//   const formatDate = (dateString: string) => {
//     return new Date(dateString).toLocaleDateString();
//   };
//
//   const handleUserPress = (user: User) => {
//     setSelectedUser(user);
//     setShowUserModal(true);
//   };
//
//   const handleToggleUserStatus = async (userId: string, userType: string, currentStatus: boolean) => {
//     try {
//       const action = currentStatus ? 'suspend' : 'activate';
//
//       Alert.alert(
//         `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
//         `Are you sure you want to ${action} this ${userType}?`,
//         [
//           { text: 'Cancel', style: 'cancel' },
//           {
//             text: action.charAt(0).toUpperCase() + action.slice(1),
//             style: 'destructive',
//             onPress: async () => {
//               const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/toggle-status`, {
//                 method: 'POST',
//                 headers: {
//                   'Authorization': `Bearer ${token}`,
//                   'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify({
//                   userType,
//                   isActive: !currentStatus,
//                   reason: `${action}d by admin`
//                 })
//               });
//
//               const data = await response.json();
//
//               if (data.success) {
//                 Alert.alert('Success', `User ${action}d successfully`);
//                 fetchUsers(true);
//                 setShowUserModal(false);
//               } else {
//                 Alert.alert('Error', data.message || `Failed to ${action} user`);
//               }
//             }
//           }
//         ]
//       );
//     } catch (error) {
//       console.error(`Error ${currentStatus ? 'suspending' : 'activating'} user:`, error);
//       Alert.alert('Error', 'Network error. Please try again.');
//     }
//   };
//
//   const renderUser = ({ item }: { item: User }) => (
//     <TouchableOpacity
//       style={styles.userCard}
//       onPress={() => handleUserPress(item)}
//     >
//       <View style={styles.userHeader}>
//         <View style={styles.userInfo}>
//           <View style={styles.nameRow}>
//             <Text style={styles.userName}>{item.firstName} {item.lastName}</Text>
//             <View style={[
//               styles.userTypeBadge,
//               item.userType === 'student' ? styles.studentBadge : styles.donorBadge
//             ]}>
//               <Text style={styles.userTypeText}>{item.userType}</Text>
//             </View>
//           </View>
//           <Text style={styles.userEmail}>{item.email}</Text>
//           {item.school && <Text style={styles.userSchool}>{item.school}</Text>}
//           {item.major && <Text style={styles.userMajor}>{item.major}</Text>}
//         </View>
//
//         <View style={styles.userStatus}>
//           <View style={[
//             styles.statusBadge,
//             item.verified ? styles.verifiedBadge : styles.unverifiedBadge
//           ]}>
//             <Text style={styles.statusText}>
//               {item.verified ? 'Verified' : 'Unverified'}
//             </Text>
//           </View>
//           <View style={[
//             styles.statusBadge,
//             item.isActive ? styles.activeBadge : styles.inactiveBadge
//           ]}>
//             <Text style={styles.statusText}>
//               {item.isActive ? 'Active' : 'Inactive'}
//             </Text>
//           </View>
//         </View>
//       </View>
//
//       <View style={styles.userStats}>
//         <View style={styles.statItem}>
//           <Text style={styles.statValue}>{formatCurrency(item.totalAmount)}</Text>
//           <Text style={styles.statLabel}>
//             {item.userType === 'student' ? 'Raised' : 'Donated'}
//           </Text>
//         </View>
//         {item.userType === 'student' && (
//           <View style={styles.statItem}>
//             <Text style={styles.statValue}>{item.totalDonations || 0}</Text>
//             <Text style={styles.statLabel}>Donations</Text>
//           </View>
//         )}
//         {item.userType === 'donor' && (
//           <View style={styles.statItem}>
//             <Text style={styles.statValue}>{item.studentsSupported || 0}</Text>
//             <Text style={styles.statLabel}>Students</Text>
//           </View>
//         )}
//         <View style={styles.statItem}>
//           <Text style={styles.statValue}>{formatDate(item.createdAt)}</Text>
//           <Text style={styles.statLabel}>Joined</Text>
//         </View>
//       </View>
//     </TouchableOpacity>
//   );
//
//   const renderUserModal = () => {
//     if (!selectedUser) return null;
//
//     return (
//       <Modal
//         visible={showUserModal}
//         animationType="slide"
//         transparent={true}
//         onRequestClose={() => setShowUserModal(false)}
//       >
//         <View style={styles.modalContainer}>
//           <View style={styles.modalContent}>
//             <View style={styles.modalHeader}>
//               <Text style={styles.modalTitle}>User Details</Text>
//               <TouchableOpacity
//                 style={styles.closeButton}
//                 onPress={() => setShowUserModal(false)}
//               >
//                 <Text style={styles.closeButtonText}>✕</Text>
//               </TouchableOpacity>
//             </View>
//
//             <View style={styles.modalBody}>
//               <View style={styles.detailRow}>
//                 <Text style={styles.detailLabel}>Name:</Text>
//                 <Text style={styles.detailValue}>
//                   {selectedUser.firstName} {selectedUser.lastName}
//                 </Text>
//               </View>
//               <View style={styles.detailRow}>
//                 <Text style={styles.detailLabel}>Email:</Text>
//                 <Text style={styles.detailValue}>{selectedUser.email}</Text>
//               </View>
//               <View style={styles.detailRow}>
//                 <Text style={styles.detailLabel}>Type:</Text>
//                 <Text style={styles.detailValue}>{selectedUser.userType}</Text>
//               </View>
//               <View style={styles.detailRow}>
//                 <Text style={styles.detailLabel}>Status:</Text>
//                 <Text style={[
//                   styles.detailValue,
//                   selectedUser.isActive ? styles.activeText : styles.inactiveText
//                 ]}>
//                   {selectedUser.isActive ? 'Active' : 'Inactive'}
//                 </Text>
//               </View>
//               <View style={styles.detailRow}>
//                 <Text style={styles.detailLabel}>Verified:</Text>
//                 <Text style={[
//                   styles.detailValue,
//                   selectedUser.verified ? styles.verifiedText : styles.unverifiedText
//                 ]}>
//                   {selectedUser.verified ? 'Yes' : 'No'}
//                 </Text>
//               </View>
//               {selectedUser.school && (
//                 <View style={styles.detailRow}>
//                   <Text style={styles.detailLabel}>School:</Text>
//                   <Text style={styles.detailValue}>{selectedUser.school}</Text>
//                 </View>
//               )}
//               {selectedUser.major && (
//                 <View style={styles.detailRow}>
//                   <Text style={styles.detailLabel}>Major:</Text>
//                   <Text style={styles.detailValue}>{selectedUser.major}</Text>
//                 </View>
//               )}
//               <View style={styles.detailRow}>
//                 <Text style={styles.detailLabel}>Joined:</Text>
//                 <Text style={styles.detailValue}>{formatDate(selectedUser.createdAt)}</Text>
//               </View>
//               {selectedUser.lastLogin && (
//                 <View style={styles.detailRow}>
//                   <Text style={styles.detailLabel}>Last Login:</Text>
//                   <Text style={styles.detailValue}>{formatDate(selectedUser.lastLogin)}</Text>
//                 </View>
//               )}
//               <View style={styles.detailRow}>
//                 <Text style={styles.detailLabel}>
//                   {selectedUser.userType === 'student' ? 'Amount Raised:' : 'Total Donated:'}
//                 </Text>
//                 <Text style={styles.detailValue}>{formatCurrency(selectedUser.totalAmount)}</Text>
//               </View>
//             </View>
//
//             <View style={styles.modalActions}>
//               <TouchableOpacity
//                 style={[
//                   styles.actionButton,
//                   selectedUser.isActive ? styles.suspendButton : styles.activateButton
//                 ]}
//                 onPress={() => handleToggleUserStatus(
//                   selectedUser.id,
//                   selectedUser.userType,
//                   selectedUser.isActive
//                 )}
//               >
//                 <Text style={styles.actionButtonText}>
//                   {selectedUser.isActive ? 'Suspend User' : 'Activate User'}
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>
//     );
//   };
//
//   const renderHeader = () => (
//     <View style={styles.headerContainer}>
//       <Text style={styles.headerTitle}>User Management</Text>
//
//       <View style={styles.searchContainer}>
//         <TextInput
//           style={styles.searchInput}
//           placeholder="Search by name or email..."
//           placeholderTextColor="#888"
//           value={searchQuery}
//           onChangeText={setSearchQuery}
//         />
//       </View>
//
//       <View style={styles.filtersContainer}>
//         <View style={styles.filterGroup}>
//           <Text style={styles.filterLabel}>Type:</Text>
//           <View style={styles.filterButtons}>
//             {['all', 'student', 'donor'].map((type) => (
//               <TouchableOpacity
//                 key={type}
//                 style={[
//                   styles.filterButton,
//                   filterType === type && styles.activeFilter
//                 ]}
//                 onPress={() => setFilterType(type as any)}
//               >
//                 <Text style={[
//                   styles.filterButtonText,
//                   filterType === type && styles.activeFilterText
//                 ]}>
//                   {type.charAt(0).toUpperCase() + type.slice(1)}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </View>
//
//         <View style={styles.filterGroup}>
//           <Text style={styles.filterLabel}>Status:</Text>
//           <View style={styles.filterButtons}>
//             {[
//               { key: 'all', label: 'All' },
//               { key: 'verified', label: 'Verified' },
//               { key: 'unverified', label: 'Unverified' }
//             ].map((status) => (
//               <TouchableOpacity
//                 key={status.key}
//                 style={[
//                   styles.filterButton,
//                   filterVerified === status.key && styles.activeFilter
//                 ]}
//                 onPress={() => setFilterVerified(status.key as any)}
//               >
//                 <Text style={[
//                   styles.filterButtonText,
//                   filterVerified === status.key && styles.activeFilterText
//                 ]}>
//                   {status.label}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </View>
//       </View>
//
//       <Text style={styles.resultCount}>
//         {totalUsers} users found
//       </Text>
//     </View>
//   );
//
//   const renderFooter = () => {
//     if (!loading || refreshing) return null;
//
//     return (
//       <View style={styles.footerLoader}>
//         <Text style={styles.loadingText}>Loading more users...</Text>
//       </View>
//     );
//   };
//
//   const renderEmpty = () => {
//     if (loading) {
//       return (
//         <View style={styles.emptyContainer}>
//           <Text style={styles.loadingText}>Loading users...</Text>
//         </View>
//       );
//     }
//
//     return (
//       <View style={styles.emptyContainer}>
//         <Text style={styles.emptyTitle}>No users found</Text>
//         <Text style={styles.emptyText}>
//           {searchQuery || filterType !== 'all' || filterVerified !== 'all'
//             ? 'Try adjusting your search or filters'
//             : 'No users have registered yet'
//           }
//         </Text>
//       </View>
//     );
//   };
//
//   return (
//     <View style={styles.container}>
//       <FlatList
//         data={users}
//         renderItem={renderUser}
//         keyExtractor={(item) => item.id}
//         ListHeaderComponent={renderHeader}
//         ListFooterComponent={renderFooter}
//         ListEmptyComponent={renderEmpty}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//         }
//         onEndReached={loadMore}
//         onEndReachedThreshold={0.5}
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={styles.listContainer}
//       />
//       {renderUserModal()}
//     </View>
//   );
// };
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#121824',
//   },
//   headerContainer: {
//     padding: 20,
//     backgroundColor: 'rgba(25, 26, 45, 0.9)',
//   },
//   headerTitle: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#fff',
//     marginBottom: 20,
//   },
//   searchContainer: {
//     marginBottom: 20,
//   },
//   searchInput: {
//     backgroundColor: 'rgba(255, 255, 255, 0.08)',
//     borderRadius: 8,
//     padding: 12,
//     color: '#fff',
//     fontSize: 16,
//   },
//   filtersContainer: {
//     marginBottom: 16,
//   },
//   filterGroup: {
//     marginBottom: 12,
//   },
//   filterLabel: {
//     color: '#a3b3ff',
//     fontSize: 14,
//     marginBottom: 8,
//   },
//   filterButtons: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//   },
//   filterButton: {
//     backgroundColor: 'rgba(255, 255, 255, 0.08)',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 16,
//     marginRight: 8,
//     marginBottom: 8,
//   },
//   activeFilter: {
//     backgroundColor: '#9C27B0',
//   },
//   filterButtonText: {
//     color: '#888',
//     fontSize: 12,
//     fontWeight: 'bold',
//   },
//   activeFilterText: {
//     color: '#fff',
//   },
//   resultCount: {
//     color: '#a3b3ff',
//     fontSize: 14,
//     textAlign: 'center',
//   },
//   listContainer: {
//     paddingBottom: 20,
//   },
//   userCard: {
//     backgroundColor: 'rgba(25, 26, 45, 0.8)',
//     borderRadius: 12,
//     padding: 16,
//     marginHorizontal: 16,
//     marginVertical: 8,
//     borderWidth: 1,
//     borderColor: 'rgba(255, 255, 255, 0.1)',
//   },
//   userHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 12,
//   },
//   userInfo: {
//     flex: 1,
//   },
//   nameRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 4,
//   },
//   userName: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#fff',
//     marginRight: 8,
//   },
//   userTypeBadge: {
//     paddingHorizontal: 6,
//     paddingVertical: 2,
//     borderRadius: 10,
//   },
//   studentBadge: {
//     backgroundColor: '#4285F4',
//   },
//   donorBadge: {
//     backgroundColor: '#34A853',
//   },
//   userTypeText: {
//     color: '#fff',
//     fontSize: 10,
//     fontWeight: 'bold',
//     textTransform: 'uppercase',
//   },
//   userEmail: {
//     fontSize: 14,
//     color: '#a3b3ff',
//     marginBottom: 2,
//   },
//   userSchool: {
//     fontSize: 12,
//     color: '#888',
//   },
//   userMajor: {
//     fontSize: 12,
//     color: '#888',
//   },
//   userStatus: {
//     alignItems: 'flex-end',
//   },
//   statusBadge: {
//     paddingHorizontal: 6,
//     paddingVertical: 2,
//     borderRadius: 8,
//     marginBottom: 4,
//   },
//   verifiedBadge: {
//     backgroundColor: '#34A853',
//   },
//   unverifiedBadge: {
//     backgroundColor: '#ff6b6b',
//   },
//   activeBadge: {
//     backgroundColor: '#34A853',
//   },
//   inactiveBadge: {
//     backgroundColor: '#888',
//   },
//   statusText: {
//     color: '#fff',
//     fontSize: 10,
//     fontWeight: 'bold',
//   },
//   userStats: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     paddingTop: 12,
//     borderTopWidth: 1,
//     borderTopColor: 'rgba(255, 255, 255, 0.1)',
//   },
//   statItem: {
//     alignItems: 'center',
//   },
//   statValue: {
//     fontSize: 14,
//     fontWeight: 'bold',
//     color: '#fff',
//   },
//   statLabel: {
//     fontSize: 12,
//     color: '#888',
//     marginTop: 2,
//   },
//   footerLoader: {
//     padding: 20,
//     alignItems: 'center',
//   },
//   loadingText: {
//     color: '#888',
//     fontSize: 14,
//   },
//   emptyContainer: {
//     padding: 40,
//     alignItems: 'center',
//   },
//   emptyTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#fff',
//     marginBottom: 8,
//   },
//   emptyText: {
//     fontSize: 14,
//     color: '#888',
//     textAlign: 'center',
//     lineHeight: 20,
//   },
//   // Modal styles
//   modalContainer: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.8)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   modalContent: {
//     backgroundColor: '#1E1F38',
//     borderRadius: 12,
//     padding: 20,
//     width: '90%',
//     maxWidth: 400,
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   modalTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#fff',
//   },
//   closeButton: {
//     padding: 4,
//   },
//   closeButtonText: {
//     color: '#888',
//     fontSize: 18,
//   },
//   modalBody: {
//     marginBottom: 20,
//   },
//   detailRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 12,
//   },
//   detailLabel: {
//     color: '#a3b3ff',
//     fontSize: 14,
//     fontWeight: 'bold',
//   },
//   detailValue: {
//     color: '#fff',
//     fontSize: 14,
//     textAlign: 'right',
//     flex: 1,
//     marginLeft: 12,
//   },
//   activeText: {
//     color: '#34A853',
//   },
//   inactiveText: {
//     color: '#ff6b6b',
//   },
//   verifiedText: {
//     color: '#34A853',
//   },
//   unverifiedText: {
//     color: '#ff6b6b',
//   },
//   modalActions: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//   },
//   actionButton: {
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   suspendButton: {
//     backgroundColor: '#ff6b6b',
//   },
//   activateButton: {
//     backgroundColor: '#34A853',
//   },
//   actionButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
// });
//
// export default UserManagement;