// frontend/src/components/admin/VerificationManagement.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';

interface VerificationManagementProps {
  userData: any;
}

interface Verification {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  verificationMethod: string;
  verificationEmail?: string;
  verificationDocument?: string;
  rejectionReason?: string;
  createdAt: string;
  verifiedAt?: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  school: {
    id: string;
    name: string;
    domain?: string;
  };
}

interface VerificationStats {
  total: number;
  today: number;
  pending: number;
  approved: number;
  rejected: number;
}

const VerificationManagement: React.FC<VerificationManagementProps> = ({ userData }) => {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [stats, setStats] = useState<VerificationStats>({
    total: 0,
    today: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'https://api-dev2.gradvillage.com/api');

  useEffect(() => {
    fetchVerifications();
    fetchStats();
  }, [selectedStatus]);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      console.log('[Admin] Fetching verifications with status:', selectedStatus);
      console.log('[Admin] Using token:', userData?.token);

      const url = selectedStatus === 'all'
        ? `${API_BASE_URL}/admin/verifications`
        : `${API_BASE_URL}/admin/verifications?status=${selectedStatus}`;

      console.log('[Admin] Request URL:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${userData?.token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[Admin] Response status:', response.status);
      console.log('[Admin] Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('[Admin] Response data:', data);
        setVerifications(data.verifications || []);
        console.log('[Admin] Set verifications:', data.verifications?.length || 0);
      } else {
        const errorText = await response.text();
        console.error('[Admin] Failed to fetch verifications:', response.status, errorText);
        setVerifications([]);
      }
    } catch (error) {
      console.error('[Admin] Error fetching verifications:', error);
      setVerifications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      console.log('[Admin] Fetching stats...');
      const response = await fetch(`${API_BASE_URL}/admin/verifications/stats`, {
        headers: {
          'Authorization': `Bearer ${userData?.token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[Admin] Stats response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[Admin] Stats data:', data);
        setStats(data.stats);
      } else {
        const errorText = await response.text();
        console.error('[Admin] Failed to fetch stats:', response.status, errorText);
      }
    } catch (error) {
      console.error('[Admin] Error fetching stats:', error);
    }
  };

  const handleApprove = async (verification: Verification) => {
    if (Platform.OS === 'web') {
      if (!window.confirm(`Approve verification for ${verification.student.firstName} ${verification.student.lastName}?`)) {
        return;
      }
    } else {
      Alert.alert(
        'Approve Verification',
        `Approve verification for ${verification.student.firstName} ${verification.student.lastName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Approve', onPress: () => performApprove(verification) }
        ]
      );
      return;
    }

    performApprove(verification);
  };

  const performApprove = async (verification: Verification) => {
    try {
      setProcessing(verification.id);
      const response = await fetch(
        `${API_BASE_URL}/admin/verifications/${verification.id}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userData?.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        Alert.alert('Success', 'Verification approved successfully!');
        fetchVerifications();
        fetchStats();
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Failed to approve verification');
      }
    } catch (error) {
      console.error('Error approving verification:', error);
      Alert.alert('Error', 'Failed to approve verification');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = (verification: Verification) => {
    setSelectedVerification(verification);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const performReject = async () => {
    if (!selectedVerification || !rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a rejection reason');
      return;
    }

    try {
      setProcessing(selectedVerification.id);
      const response = await fetch(
        `${API_BASE_URL}/admin/verifications/${selectedVerification.id}/reject`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userData?.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rejectionReason: rejectionReason.trim()
          }),
        }
      );

      if (response.ok) {
        setShowRejectModal(false);
        setSelectedVerification(null);
        setRejectionReason('');
        Alert.alert('Success', 'Verification rejected successfully!');
        fetchVerifications();
        fetchStats();
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Failed to reject verification');
      }
    } catch (error) {
      console.error('Error rejecting verification:', error);
      Alert.alert('Error', 'Failed to reject verification');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return '✅';
      case 'pending': return '⏳';
      case 'rejected': return '❌';
      default: return '❓';
    }
  };

  const renderVerificationCard = (verification: Verification) => (
    <View key={verification.id} style={styles.verificationCard}>
      <View style={styles.cardHeader}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>
            {verification.student.firstName} {verification.student.lastName}
          </Text>
          <Text style={styles.studentEmail}>{verification.student.email}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(verification.status) }]}>
          <Text style={styles.statusText}>
            {getStatusIcon(verification.status)} {verification.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>School:</Text>
          <Text style={styles.detailValue}>{verification.school.name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Method:</Text>
          <Text style={styles.detailValue}>{verification.verificationMethod}</Text>
        </View>
        {verification.verificationEmail && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email:</Text>
            <Text style={styles.detailValue}>{verification.verificationEmail}</Text>
          </View>
        )}
        {verification.verificationDocument && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Document:</Text>
            <Text style={styles.detailValue}>📎 Document uploaded</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Submitted:</Text>
          <Text style={styles.detailValue}>
            {new Date(verification.createdAt).toLocaleDateString()} at{' '}
            {new Date(verification.createdAt).toLocaleTimeString()}
          </Text>
        </View>
        {verification.rejectionReason && (
          <View style={styles.rejectionContainer}>
            <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
            <Text style={styles.rejectionText}>{verification.rejectionReason}</Text>
          </View>
        )}
      </View>

      {verification.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(verification)}
            disabled={processing === verification.id}
          >
            {processing === verification.id ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.actionButtonText}>✅ Approve</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(verification)}
            disabled={processing === verification.id}
          >
            <Text style={styles.actionButtonText}>❌ Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Student Verification Management</Text>

      {/* Debug Info */}
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>
          Status: {selectedStatus} | Verifications: {verifications.length} | Token: {userData?.token ? 'Present' : 'Missing'}
        </Text>
        <TouchableOpacity
          style={styles.debugButton}
          onPress={() => {
            console.log('[Admin Debug] Current state:', {
              selectedStatus,
              verificationsCount: verifications.length,
              stats,
              loading,
              userToken: userData?.token
            });
          }}
        >
          <Text style={styles.debugButtonText}>🐛 Debug Log</Text>
        </TouchableOpacity>
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.today}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
            <Text style={[styles.statValue, { color: '#d97706' }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
            <Text style={[styles.statValue, { color: '#059669' }]}>{stats.approved}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
        </View>
      </View>

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by status:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterButtons}>
          {[
            { key: 'pending', label: '⏳ Pending', count: stats.pending },
            { key: 'approved', label: '✅ Approved', count: stats.approved },
            { key: 'rejected', label: '❌ Rejected', count: stats.rejected },
            { key: 'all', label: '📋 All', count: stats.total },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                selectedStatus === filter.key && styles.filterButtonActive
              ]}
              onPress={() => setSelectedStatus(filter.key)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedStatus === filter.key && styles.filterButtonTextActive
                ]}
              >
                {filter.label} ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Verifications List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading verifications...</Text>
        </View>
      ) : (
        <ScrollView style={styles.verificationsList}>
          {verifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No {selectedStatus === 'all' ? '' : selectedStatus} verifications found
              </Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => {
                  fetchVerifications();
                  fetchStats();
                }}
              >
                <Text style={styles.refreshButtonText}>🔄 Refresh Data</Text>
              </TouchableOpacity>
            </View>
          ) : (
            verifications.map(renderVerificationCard)
          )}
        </ScrollView>
      )}

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Verification</Text>
            <Text style={styles.modalSubtitle}>
              Rejecting verification for{' '}
              {selectedVerification?.student.firstName} {selectedVerification?.student.lastName}
            </Text>

            <Text style={styles.inputLabel}>Rejection Reason *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Please provide a reason for rejection..."
              placeholderTextColor="#9ca3af"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowRejectModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.rejectModalButton]}
                onPress={performReject}
                disabled={!rejectionReason.trim() || processing === selectedVerification?.id}
              >
                {processing === selectedVerification?.id ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.rejectModalButtonText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
  },
  statsContainer: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    width: '23%',
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  filterContainer: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  filterButtons: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    marginRight: 10,
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280',
  },
  verificationsList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  verificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cardDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  rejectionContainer: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 14,
    color: '#7f1d1d',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    minHeight: 100,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  rejectModalButton: {
    backgroundColor: '#ef4444',
  },
});

export default VerificationManagement;




// // frontend/src/components/admin/VerificationManagement.tsx
// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   TextInput,
//   Alert,
//   ActivityIndicator,
//   Modal,
//   Platform
// } from 'react-native';
//
// interface VerificationManagementProps {
//   userData: any;
// }
//
// interface Verification {
//   id: string;
//   status: 'pending' | 'approved' | 'rejected';
//   verificationMethod: string;
//   verificationEmail?: string;
//   verificationDocument?: string;
//   rejectionReason?: string;
//   createdAt: string;
//   verifiedAt?: string;
//   student: {
//     id: string;
//     firstName: string;
//     lastName: string;
//     email: string;
//   };
//   school: {
//     id: string;
//     name: string;
//     domain?: string;
//   };
// }
//
// interface VerificationStats {
//   total: number;
//   today: number;
//   pending: number;
//   approved: number;
//   rejected: number;
// }
//
// const VerificationManagement: React.FC<VerificationManagementProps> = ({ userData }) => {
//   const [verifications, setVerifications] = useState<Verification[]>([]);
//   const [stats, setStats] = useState<VerificationStats>({
//     total: 0,
//     today: 0,
//     pending: 0,
//     approved: 0,
//     rejected: 0
//   });
//   const [loading, setLoading] = useState(true);
//   const [selectedStatus, setSelectedStatus] = useState<string>('pending');
//   const [showRejectModal, setShowRejectModal] = useState(false);
//   const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
//   const [rejectionReason, setRejectionReason] = useState('');
//   const [processing, setProcessing] = useState<string | null>(null);
//
//   const API_BASE_URL = 'http://3.234.140.112:3001/api';
//
//   useEffect(() => {
//     fetchVerifications();
//     fetchStats();
//   }, [selectedStatus]);
//
//   const fetchVerifications = async () => {
//     try {
//       setLoading(true);
//       const response = await fetch(
//         `${API_BASE_URL}/admin/verifications?status=${selectedStatus}`,
//         {
//           headers: {
//             'Authorization': `Bearer ${userData?.token}`,
//             'Content-Type': 'application/json',
//           },
//         }
//       );
//
//       if (response.ok) {
//         const data = await response.json();
//         setVerifications(data.verifications || []);
//       } else {
//         console.error('Failed to fetch verifications:', response.status);
//       }
//     } catch (error) {
//       console.error('Error fetching verifications:', error);
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   const fetchStats = async () => {
//     try {
//       const response = await fetch(`${API_BASE_URL}/admin/verifications/stats`, {
//         headers: {
//           'Authorization': `Bearer ${userData?.token}`,
//           'Content-Type': 'application/json',
//         },
//       });
//
//       if (response.ok) {
//         const data = await response.json();
//         setStats(data.stats);
//       }
//     } catch (error) {
//       console.error('Error fetching stats:', error);
//     }
//   };
//
//   const handleApprove = async (verification: Verification) => {
//     if (Platform.OS === 'web') {
//       if (!window.confirm(`Approve verification for ${verification.student.firstName} ${verification.student.lastName}?`)) {
//         return;
//       }
//     } else {
//       Alert.alert(
//         'Approve Verification',
//         `Approve verification for ${verification.student.firstName} ${verification.student.lastName}?`,
//         [
//           { text: 'Cancel', style: 'cancel' },
//           { text: 'Approve', onPress: () => performApprove(verification) }
//         ]
//       );
//       return;
//     }
//
//     performApprove(verification);
//   };
//
//   const performApprove = async (verification: Verification) => {
//     try {
//       setProcessing(verification.id);
//       const response = await fetch(
//         `${API_BASE_URL}/admin/verifications/${verification.id}/approve`,
//         {
//           method: 'POST',
//           headers: {
//             'Authorization': `Bearer ${userData?.token}`,
//             'Content-Type': 'application/json',
//           },
//         }
//       );
//
//       if (response.ok) {
//         Alert.alert('Success', 'Verification approved successfully!');
//         fetchVerifications();
//         fetchStats();
//       } else {
//         const errorData = await response.json();
//         Alert.alert('Error', errorData.error || 'Failed to approve verification');
//       }
//     } catch (error) {
//       console.error('Error approving verification:', error);
//       Alert.alert('Error', 'Failed to approve verification');
//     } finally {
//       setProcessing(null);
//     }
//   };
//
//   const handleReject = (verification: Verification) => {
//     setSelectedVerification(verification);
//     setRejectionReason('');
//     setShowRejectModal(true);
//   };
//
//   const performReject = async () => {
//     if (!selectedVerification || !rejectionReason.trim()) {
//       Alert.alert('Error', 'Please provide a rejection reason');
//       return;
//     }
//
//     try {
//       setProcessing(selectedVerification.id);
//       const response = await fetch(
//         `${API_BASE_URL}/admin/verifications/${selectedVerification.id}/reject`,
//         {
//           method: 'POST',
//           headers: {
//             'Authorization': `Bearer ${userData?.token}`,
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             rejectionReason: rejectionReason.trim()
//           }),
//         }
//       );
//
//       if (response.ok) {
//         setShowRejectModal(false);
//         setSelectedVerification(null);
//         setRejectionReason('');
//         Alert.alert('Success', 'Verification rejected successfully!');
//         fetchVerifications();
//         fetchStats();
//       } else {
//         const errorData = await response.json();
//         Alert.alert('Error', errorData.error || 'Failed to reject verification');
//       }
//     } catch (error) {
//       console.error('Error rejecting verification:', error);
//       Alert.alert('Error', 'Failed to reject verification');
//     } finally {
//       setProcessing(null);
//     }
//   };
//
//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case 'approved': return '#10b981';
//       case 'pending': return '#f59e0b';
//       case 'rejected': return '#ef4444';
//       default: return '#6b7280';
//     }
//   };
//
//   const getStatusIcon = (status: string) => {
//     switch (status) {
//       case 'approved': return '✅';
//       case 'pending': return '⏳';
//       case 'rejected': return '❌';
//       default: return '❓';
//     }
//   };
//
//   const renderVerificationCard = (verification: Verification) => (
//     <View key={verification.id} style={styles.verificationCard}>
//       <View style={styles.cardHeader}>
//         <View style={styles.studentInfo}>
//           <Text style={styles.studentName}>
//             {verification.student.firstName} {verification.student.lastName}
//           </Text>
//           <Text style={styles.studentEmail}>{verification.student.email}</Text>
//         </View>
//         <View style={[styles.statusBadge, { backgroundColor: getStatusColor(verification.status) }]}>
//           <Text style={styles.statusText}>
//             {getStatusIcon(verification.status)} {verification.status.toUpperCase()}
//           </Text>
//         </View>
//       </View>
//
//       <View style={styles.cardDetails}>
//         <View style={styles.detailRow}>
//           <Text style={styles.detailLabel}>School:</Text>
//           <Text style={styles.detailValue}>{verification.school.name}</Text>
//         </View>
//         <View style={styles.detailRow}>
//           <Text style={styles.detailLabel}>Method:</Text>
//           <Text style={styles.detailValue}>{verification.verificationMethod}</Text>
//         </View>
//         {verification.verificationEmail && (
//           <View style={styles.detailRow}>
//             <Text style={styles.detailLabel}>Email:</Text>
//             <Text style={styles.detailValue}>{verification.verificationEmail}</Text>
//           </View>
//         )}
//         {verification.verificationDocument && (
//           <View style={styles.detailRow}>
//             <Text style={styles.detailLabel}>Document:</Text>
//             <Text style={styles.detailValue}>📎 Document uploaded</Text>
//           </View>
//         )}
//         <View style={styles.detailRow}>
//           <Text style={styles.detailLabel}>Submitted:</Text>
//           <Text style={styles.detailValue}>
//             {new Date(verification.createdAt).toLocaleDateString()} at{' '}
//             {new Date(verification.createdAt).toLocaleTimeString()}
//           </Text>
//         </View>
//         {verification.rejectionReason && (
//           <View style={styles.rejectionContainer}>
//             <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
//             <Text style={styles.rejectionText}>{verification.rejectionReason}</Text>
//           </View>
//         )}
//       </View>
//
//       {verification.status === 'pending' && (
//         <View style={styles.actionButtons}>
//           <TouchableOpacity
//             style={[styles.actionButton, styles.approveButton]}
//             onPress={() => handleApprove(verification)}
//             disabled={processing === verification.id}
//           >
//             {processing === verification.id ? (
//               <ActivityIndicator size="small" color="#ffffff" />
//             ) : (
//               <Text style={styles.actionButtonText}>✅ Approve</Text>
//             )}
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={[styles.actionButton, styles.rejectButton]}
//             onPress={() => handleReject(verification)}
//             disabled={processing === verification.id}
//           >
//             <Text style={styles.actionButtonText}>❌ Reject</Text>
//           </TouchableOpacity>
//         </View>
//       )}
//     </View>
//   );
//
//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Student Verification Management</Text>
//
//       {/* Statistics */}
//       <View style={styles.statsContainer}>
//         <View style={styles.statsGrid}>
//           <View style={styles.statCard}>
//             <Text style={styles.statValue}>{stats.total}</Text>
//             <Text style={styles.statLabel}>Total</Text>
//           </View>
//           <View style={styles.statCard}>
//             <Text style={styles.statValue}>{stats.today}</Text>
//             <Text style={styles.statLabel}>Today</Text>
//           </View>
//           <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
//             <Text style={[styles.statValue, { color: '#d97706' }]}>{stats.pending}</Text>
//             <Text style={styles.statLabel}>Pending</Text>
//           </View>
//           <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
//             <Text style={[styles.statValue, { color: '#059669' }]}>{stats.approved}</Text>
//             <Text style={styles.statLabel}>Approved</Text>
//           </View>
//         </View>
//       </View>
//
//       {/* Status Filter */}
//       <View style={styles.filterContainer}>
//         <Text style={styles.filterLabel}>Filter by status:</Text>
//         <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterButtons}>
//           {[
//             { key: 'pending', label: '⏳ Pending', count: stats.pending },
//             { key: 'approved', label: '✅ Approved', count: stats.approved },
//             { key: 'rejected', label: '❌ Rejected', count: stats.rejected },
//             { key: 'all', label: '📋 All', count: stats.total },
//           ].map((filter) => (
//             <TouchableOpacity
//               key={filter.key}
//               style={[
//                 styles.filterButton,
//                 selectedStatus === filter.key && styles.filterButtonActive
//               ]}
//               onPress={() => setSelectedStatus(filter.key)}
//             >
//               <Text
//                 style={[
//                   styles.filterButtonText,
//                   selectedStatus === filter.key && styles.filterButtonTextActive
//                 ]}
//               >
//                 {filter.label} ({filter.count})
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </ScrollView>
//       </View>
//
//       {/* Verifications List */}
//       {loading ? (
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="large" color="#6366f1" />
//           <Text style={styles.loadingText}>Loading verifications...</Text>
//         </View>
//       ) : (
//         <ScrollView style={styles.verificationsList}>
//           {verifications.length === 0 ? (
//             <View style={styles.emptyContainer}>
//               <Text style={styles.emptyText}>
//                 No {selectedStatus === 'all' ? '' : selectedStatus} verifications found
//               </Text>
//             </View>
//           ) : (
//             verifications.map(renderVerificationCard)
//           )}
//         </ScrollView>
//       )}
//
//       {/* Reject Modal */}
//       <Modal
//         visible={showRejectModal}
//         animationType="slide"
//         transparent={true}
//         onRequestClose={() => setShowRejectModal(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <Text style={styles.modalTitle}>Reject Verification</Text>
//             <Text style={styles.modalSubtitle}>
//               Rejecting verification for{' '}
//               {selectedVerification?.student.firstName} {selectedVerification?.student.lastName}
//             </Text>
//
//             <Text style={styles.inputLabel}>Rejection Reason *</Text>
//             <TextInput
//               style={styles.textInput}
//               placeholder="Please provide a reason for rejection..."
//               placeholderTextColor="#9ca3af"
//               value={rejectionReason}
//               onChangeText={setRejectionReason}
//               multiline
//               numberOfLines={4}
//               textAlignVertical="top"
//             />
//
//             <View style={styles.modalButtons}>
//               <TouchableOpacity
//                 style={[styles.modalButton, styles.cancelButton]}
//                 onPress={() => setShowRejectModal(false)}
//               >
//                 <Text style={styles.cancelButtonText}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[styles.modalButton, styles.rejectModalButton]}
//                 onPress={performReject}
//                 disabled={!rejectionReason.trim() || processing === selectedVerification?.id}
//               >
//                 {processing === selectedVerification?.id ? (
//                   <ActivityIndicator size="small" color="#ffffff" />
//                 ) : (
//                   <Text style={styles.rejectModalButtonText}>Reject</Text>
//                 )}
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// };
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f5f5f5',
//     padding: 20,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#1f2937',
//     marginBottom: 20,
//   },
//   statsContainer: {
//     marginBottom: 20,
//   },
//   statsGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'space-between',
//   },
//   statCard: {
//     backgroundColor: '#ffffff',
//     borderRadius: 8,
//     padding: 16,
//     alignItems: 'center',
//     width: '23%',
//     marginBottom: 10,
//     ...Platform.select({
//       ios: {
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 1 },
//         shadowOpacity: 0.1,
//         shadowRadius: 2,
//       },
//       android: {
//         elevation: 2,
//       },
//     }),
//   },
//   statValue: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#1f2937',
//     marginBottom: 4,
//   },
//   statLabel: {
//     fontSize: 12,
//     color: '#6b7280',
//   },
//   filterContainer: {
//     marginBottom: 20,
//   },
//   filterLabel: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#374151',
//     marginBottom: 10,
//   },
//   filterButtons: {
//     flexDirection: 'row',
//   },
//   filterButton: {
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 20,
//     backgroundColor: '#e5e7eb',
//     marginRight: 10,
//   },
//   filterButtonActive: {
//     backgroundColor: '#6366f1',
//   },
//   filterButtonText: {
//     fontSize: 14,
//     fontWeight: '500',
//     color: '#374151',
//   },
//   filterButtonTextActive: {
//     color: '#ffffff',
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loadingText: {
//     marginTop: 10,
//     fontSize: 16,
//     color: '#6b7280',
//   },
//   verificationsList: {
//     flex: 1,
//   },
//   emptyContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingVertical: 40,
//   },
//   emptyText: {
//     fontSize: 16,
//     color: '#6b7280',
//     textAlign: 'center',
//   },
//   verificationCard: {
//     backgroundColor: '#ffffff',
//     borderRadius: 8,
//     padding: 16,
//     marginBottom: 16,
//     ...Platform.select({
//       ios: {
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.1,
//         shadowRadius: 4,
//       },
//       android: {
//         elevation: 2,
//       },
//     }),
//   },
//   cardHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'flex-start',
//     marginBottom: 12,
//   },
//   studentInfo: {
//     flex: 1,
//   },
//   studentName: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#1f2937',
//     marginBottom: 4,
//   },
//   studentEmail: {
//     fontSize: 14,
//     color: '#6b7280',
//   },
//   statusBadge: {
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 16,
//     marginLeft: 12,
//   },
//   statusText: {
//     fontSize: 12,
//     fontWeight: 'bold',
//     color: '#ffffff',
//   },
//   cardDetails: {
//     marginBottom: 16,
//   },
//   detailRow: {
//     flexDirection: 'row',
//     marginBottom: 8,
//   },
//   detailLabel: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#374151',
//     width: 100,
//   },
//   detailValue: {
//     fontSize: 14,
//     color: '#6b7280',
//     flex: 1,
//   },
//   rejectionContainer: {
//     backgroundColor: '#fef2f2',
//     padding: 12,
//     borderRadius: 6,
//     marginTop: 8,
//   },
//   rejectionLabel: {
//     fontSize: 12,
//     fontWeight: 'bold',
//     color: '#dc2626',
//     marginBottom: 4,
//   },
//   rejectionText: {
//     fontSize: 14,
//     color: '#7f1d1d',
//   },
//   actionButtons: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   actionButton: {
//     flex: 1,
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     borderRadius: 8,
//     alignItems: 'center',
//     marginHorizontal: 4,
//   },
//   approveButton: {
//     backgroundColor: '#10b981',
//   },
//   rejectButton: {
//     backgroundColor: '#ef4444',
//   },
//   actionButtonText: {
//     fontSize: 14,
//     fontWeight: 'bold',
//     color: '#ffffff',
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   modalContent: {
//     backgroundColor: '#ffffff',
//     borderRadius: 12,
//     padding: 24,
//     width: '100%',
//     maxWidth: 400,
//   },
//   modalTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#1f2937',
//     marginBottom: 8,
//   },
//   modalSubtitle: {
//     fontSize: 14,
//     color: '#6b7280',
//     marginBottom: 20,
//   },
//   inputLabel: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#374151',
//     marginBottom: 8,
//   },
//   textInput: {
//     borderWidth: 1,
//     borderColor: '#d1d5db',
//     borderRadius: 8,
//     padding: 12,
//     fontSize: 14,
//     color: '#1f2937',
//     backgroundColor: '#f9fafb',
//     minHeight: 100,
//     marginBottom: 20,
//   },
//   modalButtons: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   modalButton: {
//     flex: 1,
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     borderRadius: 8,
//     alignItems: 'center',
//     marginHorizontal: 4,
//   },
//   cancelButton: {
//     backgroundColor: '#e5e7eb',
//   },
//   cancelButtonText: {
//     fontSize: 14,
//     fontWeight: 'bold',
//     color: '#374151',
//   },
//   rejectModalButton: {
//     backgroundColor: '#ef4444',
//   },
// });
//
// export default VerificationManagement;