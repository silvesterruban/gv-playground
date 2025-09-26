// frontend/src/components/admin/StudentVerification.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
  Linking
} from 'react-native';

interface StudentVerificationProps {
  token: string;
}

interface Verification {
  id: string;
  studentId: string;
  schoolId: string;
  verificationMethod: string;
  verificationEmail?: string;
  verificationDocument?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    schoolName?: string;
  };
  school: {
    id: string;
    name: string;
    domain?: string;
  };
  verifiedBy?: string;
  verifiedAt?: string;
}

const StudentVerification: React.FC<StudentVerificationProps> = ({ token }) => {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('pending');

  const API_BASE_URL = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' ? window.location.origin + '/api' : 'https://api-dev2.gradvillage.com/api');

  // Fetch verifications
  const fetchVerifications = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      console.log('[StudentVerification] Fetching verifications with status:', filterStatus);
      console.log('[StudentVerification] Using token:', token ? 'Present' : 'Missing');

      // Use the correct API endpoint with status filter
      const url = filterStatus === 'all'
        ? `${API_BASE_URL}/admin/verification/verifications`
        : `${API_BASE_URL}/admin/verification/verifications?status=${filterStatus}`;

      console.log('[StudentVerification] Request URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[StudentVerification] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[StudentVerification] API Error:', response.status, errorText);
        throw new Error(`Failed to fetch verifications: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[StudentVerification] Verifications data received:', data);

      setVerifications(data.verifications || []);

    } catch (error) {
      console.error('[StudentVerification] Error fetching verifications:', error);
      Alert.alert('Error', `Failed to load verifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch stats for filter counts
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/verification/verifications/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[StudentVerification] Stats:', data);
        setStats(data.stats || { pending: 0, approved: 0, rejected: 0, total: 0 });
      }
    } catch (error) {
      console.error('[StudentVerification] Error fetching stats:', error);
    }
  };

  // Load verifications on component mount and when filter changes
  useEffect(() => {
    fetchVerifications();
    fetchStats();
  }, [filterStatus]);

  // Handle verification approval
  const handleApprove = async (verification: Verification) => {
    try {
      setActionLoading(verification.id);

      console.log(`[StudentVerification] Approving verification ${verification.id}`);

      const response = await fetch(`${API_BASE_URL}/admin/verification/verifications/${verification.id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: approvalNotes,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[StudentVerification] Approval failed:', response.status, errorText);
        throw new Error(`Failed to approve verification: ${response.status}`);
      }

      const result = await response.json();
      console.log('[StudentVerification] Verification approved:', result);

      Alert.alert(
        'Success',
        `Verification for ${verification.student.firstName} ${verification.student.lastName} has been approved!`,
        [{ text: 'OK', onPress: () => {
          setSelectedVerification(null);
          setApprovalNotes('');
          fetchVerifications(true);
          fetchStats();
        }}]
      );

    } catch (error) {
      console.error('[StudentVerification] Error approving verification:', error);
      Alert.alert('Error', `Failed to approve verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle verification rejection
  const handleReject = async (verification: Verification) => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection.');
      return;
    }

    try {
      setActionLoading(verification.id);

      console.log(`[StudentVerification] Rejecting verification ${verification.id}`);

      const response = await fetch(`${API_BASE_URL}/admin/verification/verifications/${verification.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejectionReason: rejectionReason.trim(), // Use correct field name
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[StudentVerification] Rejection failed:', response.status, errorText);
        throw new Error(`Failed to reject verification: ${response.status}`);
      }

      const result = await response.json();
      console.log('[StudentVerification] Verification rejected:', result);

      Alert.alert(
        'Success',
        `Verification for ${verification.student.firstName} ${verification.student.lastName} has been rejected.`,
        [{ text: 'OK', onPress: () => {
          setSelectedVerification(null);
          setRejectionReason('');
          fetchVerifications(true);
          fetchStats();
        }}]
      );

    } catch (error) {
      console.error('[StudentVerification] Error rejecting verification:', error);
      Alert.alert('Error', `Failed to reject verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter verifications by status - FIXED
  const filteredVerifications = React.useMemo(() => {
    console.log('[StudentVerification] Filtering verifications:', {
      allVerifications: verifications.length,
      filterStatus,
      verifications: verifications.map(v => ({ id: v.id, status: v.status }))
    });

    if (filterStatus === 'all') {
      return verifications;
    }

    const filtered = verifications.filter(v => v.status === filterStatus);
    console.log('[StudentVerification] Filtered result:', filtered.length);
    return filtered;
  }, [verifications, filterStatus]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status badge style
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return styles.pendingBadge;
      case 'approved':
        return styles.approvedBadge;
      case 'rejected':
        return styles.rejectedBadge;
      default:
        return styles.defaultBadge;
    }
  };

  // Get verification method icon
  const getVerificationMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'email':
        return '📧';
      case 'id_card':
        return '🆔';
      case 'transcript':
        return '📄';
      case 'document':
        return '📋';
      default:
        return '📝';
    }
  };

  // Open document in browser
  const openDocument = (documentUrl: string) => {
    if (documentUrl) {
      Linking.openURL(documentUrl).catch(() => {
        Alert.alert('Error', 'Could not open document');
      });
    }
  };

  // Create test verification function
  const createTestVerification = async () => {
    Alert.alert(
      'Create Test Verification',
      'This will create a test verification for debugging. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async () => {
            try {
              // This is just for debugging - in real app, students create verifications
              const response = await fetch(`${API_BASE_URL}/debug/create-test-verification`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (response.ok) {
                Alert.alert('Success', 'Test verification created!');
                fetchVerifications(true);
                fetchStats();
              } else {
                Alert.alert('Error', 'Failed to create test verification');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to create test verification');
            }
          }
        }
      ]
    );
  };

  // Render verification card
  const renderVerificationCard = (verification: Verification) => (
    <View key={verification.id} style={styles.verificationCard}>
      {/* Header */}
      <View style={styles.verificationHeader}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>
            {verification.student.firstName} {verification.student.lastName}
          </Text>
          <Text style={styles.studentEmail}>{verification.student.email}</Text>
          <Text style={styles.schoolName}>🏫 {verification.school.name}</Text>
        </View>
        <View style={[styles.statusBadge, getStatusBadgeStyle(verification.status)]}>
          <Text style={styles.badgeText}>{verification.status}</Text>
        </View>
      </View>

      {/* Verification Details */}
      <View style={styles.verificationDetails}>
        <Text style={styles.detailText}>
          {getVerificationMethodIcon(verification.verificationMethod)} Method: {verification.verificationMethod.replace('_', ' ')}
        </Text>

        {verification.verificationEmail && (
          <Text style={styles.detailText}>
            📧 Email: {verification.verificationEmail}
          </Text>
        )}

        {verification.school.domain && (
          <Text style={styles.detailText}>
            🌐 School Domain: {verification.school.domain}
          </Text>
        )}

        <Text style={styles.detailText}>
          📅 Submitted: {formatDate(verification.createdAt)}
        </Text>

        {verification.rejectionReason && (
          <View style={styles.rejectionReasonContainer}>
            <Text style={styles.rejectionReasonLabel}>❌ Rejection Reason:</Text>
            <Text style={styles.rejectionReasonText}>{verification.rejectionReason}</Text>
          </View>
        )}
      </View>

      {/* Document */}
      {verification.verificationDocument && (
        <View style={styles.documentSection}>
          <Text style={styles.documentLabel}>📎 Verification Document:</Text>
          <TouchableOpacity
            style={styles.documentButton}
            onPress={() => openDocument(verification.verificationDocument!)}
          >
            <Text style={styles.documentButtonText}>View Document</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Actions for pending verifications */}
      {verification.status === 'pending' && (
        <View style={styles.verificationActions}>
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={() => setSelectedVerification(verification)}
          >
            <Text style={styles.buttonText}>Review</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickApproveButton}
            onPress={() => handleApprove(verification)}
            disabled={actionLoading === verification.id}
          >
            {actionLoading === verification.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Quick Approve</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading verifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Debug Info */}
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>
          Status: {filterStatus} | Count: {verifications.length} | Filtered: {filteredVerifications.length} | Stats: P:{stats.pending} A:{stats.approved} R:{stats.rejected}
        </Text>
        <TouchableOpacity style={styles.debugButton} onPress={createTestVerification}>
          <Text style={styles.debugButtonText}>🧪 Test</Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Student Verification</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => {
            fetchVerifications(true);
            fetchStats();
          }}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.refreshButtonText}>↻ Refresh</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by Status:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterButtons}>
          {[
            { key: 'pending', label: 'Pending', count: stats.pending },
            { key: 'approved', label: 'Approved', count: stats.approved },
            { key: 'rejected', label: 'Rejected', count: stats.rejected },
            { key: 'all', label: 'All', count: stats.total },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                filterStatus === filter.key && styles.activeFilterButton
              ]}
              onPress={() => setFilterStatus(filter.key)}
            >
              <Text style={[
                styles.filterButtonText,
                filterStatus === filter.key && styles.activeFilterButtonText
              ]}>
                {filter.label} ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Showing {filteredVerifications.length} of {verifications.length} verifications
        </Text>
        <TouchableOpacity
          style={styles.debugButton}
          onPress={() => {
            console.log('[DEBUG] Current state:', {
              verifications,
              filteredVerifications,
              filterStatus,
              stats
            });
          }}
        >
          <Text style={styles.debugButtonText}>🐛 Log State</Text>
        </TouchableOpacity>
      </View>

      {/* Verification List */}
      <ScrollView style={styles.verificationList}>
        {filteredVerifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {filterStatus === 'pending' ? 'No Pending Verifications' :
               filterStatus === 'all' ? 'No Verifications Found' : `No ${filterStatus} Verifications`}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {verifications.length === 0
                ? 'No verifications in database. Students need to submit verifications first.'
                : `${verifications.length} total verifications exist, but none match the current filter "${filterStatus}"`
              }
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => {
                console.log('[DEBUG] Manual refresh triggered');
                fetchVerifications(true);
                fetchStats();
              }}
            >
              <Text style={styles.refreshButtonText}>🔄 Force Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredVerifications.map(renderVerificationCard)
        )}
      </ScrollView>

      {/* Review Modal */}
      {selectedVerification && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Review Verification</Text>

            <View style={styles.modalStudentInfo}>
              <Text style={styles.modalStudentName}>
                {selectedVerification.student.firstName} {selectedVerification.student.lastName}
              </Text>
              <Text style={styles.modalStudentEmail}>{selectedVerification.student.email}</Text>
              <Text style={styles.modalSchoolName}>🏫 {selectedVerification.school.name}</Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Verification Details</Text>
              <Text style={styles.modalDetailText}>
                Method: {selectedVerification.verificationMethod.replace('_', ' ')}
              </Text>
              {selectedVerification.verificationEmail && (
                <Text style={styles.modalDetailText}>
                  Email: {selectedVerification.verificationEmail}
                </Text>
              )}
              <Text style={styles.modalDetailText}>
                Submitted: {formatDate(selectedVerification.createdAt)}
              </Text>
            </View>

            {selectedVerification.verificationDocument && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Document</Text>
                <TouchableOpacity
                  style={styles.modalDocumentButton}
                  onPress={() => openDocument(selectedVerification.verificationDocument!)}
                >
                  <Text style={styles.modalDocumentButtonText}>📄 View Verification Document</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Approval Notes */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Approval Notes (Optional)</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Add notes for approval..."
                placeholderTextColor="#64748b"
                value={approvalNotes}
                onChangeText={setApprovalNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Rejection Reason */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Rejection Reason</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Enter reason for rejection..."
                placeholderTextColor="#64748b"
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setSelectedVerification(null);
                  setRejectionReason('');
                  setApprovalNotes('');
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalRejectButton}
                onPress={() => handleReject(selectedVerification)}
                disabled={!rejectionReason.trim() || actionLoading === selectedVerification.id}
              >
                {actionLoading === selectedVerification.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalRejectButtonText}>Reject</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalApproveButton}
                onPress={() => handleApprove(selectedVerification)}
                disabled={actionLoading === selectedVerification.id}
              >
                {actionLoading === selectedVerification.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalApproveButtonText}>Approve</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // ... (keeping all existing styles and adding new ones)
  debugContainer: {
    backgroundColor: '#1e293b',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debugText: {
    color: '#94a3b8',
    fontSize: 12,
    flex: 1,
  },
  debugButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  debugButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
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
  filterContainer: {
    marginBottom: 20,
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
  statsContainer: {
    marginBottom: 15,
  },
  statsText: {
    color: '#64748b',
    fontSize: 14,
  },
  verificationList: {
    flex: 1,
  },
  verificationCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  verificationHeader: {
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
    color: '#ffffff',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  schoolName: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pendingBadge: {
    backgroundColor: '#f59e0b',
  },
  approvedBadge: {
    backgroundColor: '#10b981',
  },
  rejectedBadge: {
    backgroundColor: '#ef4444',
  },
  defaultBadge: {
    backgroundColor: '#64748b',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  verificationDetails: {
    marginBottom: 12,
  },
  detailText: {
    color: '#cbd5e1',
    fontSize: 14,
    marginBottom: 4,
  },
  rejectionReasonContainer: {
    backgroundColor: '#7f1d1d',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  rejectionReasonLabel: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  rejectionReasonText: {
    color: '#fecaca',
    fontSize: 14,
  },
  documentSection: {
    marginBottom: 12,
  },
  documentLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    marginBottom: 8,
  },
  documentButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  documentButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  verificationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  reviewButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  quickApproveButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
    lineHeight: 20,
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
    maxWidth: 500,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalStudentInfo: {
    backgroundColor: '#334155',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  modalStudentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  modalStudentEmail: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  modalSchoolName: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  modalDetailText: {
    color: '#cbd5e1',
    fontSize: 14,
    marginBottom: 4,
  },
  modalDocumentButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  modalDocumentButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalTextInput: {
    backgroundColor: '#334155',
    color: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#475569',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalCancelButton: {
    backgroundColor: '#64748b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    flex: 1,
    marginRight: 8,
  },
  modalCancelButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
  modalRejectButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    flex: 1,
    marginRight: 8,
  },
  modalRejectButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
  modalApproveButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    flex: 1,
  },
  modalApproveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default StudentVerification;








// // frontend/src/components/admin/StudentVerification.tsx
// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
//   Alert,
//   TextInput,
//   Image,
//   Linking
// } from 'react-native';
//
// interface StudentVerificationProps {
//   token: string;
// }
//
// interface Verification {
//   id: string;
//   studentId: string;
//   schoolId: string;
//   verificationMethod: string;
//   verificationEmail?: string;
//   verificationDocument?: string;
//   status: 'pending' | 'approved' | 'rejected';
//   rejectionReason?: string;
//   createdAt: string;
//   updatedAt: string;
//   student: {
//     id: string;
//     email: string;
//     firstName: string;
//     lastName: string;
//     schoolName?: string;
//   };
//   school: {
//     id: string;
//     name: string;
//     domain?: string;
//   };
//   verifiedBy?: string;
//   verifiedAt?: string;
// }
//
// const StudentVerification: React.FC<StudentVerificationProps> = ({ token }) => {
//   const [verifications, setVerifications] = useState<Verification[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
//   const [actionLoading, setActionLoading] = useState<string | null>(null);
//   const [rejectionReason, setRejectionReason] = useState('');
//   const [approvalNotes, setApprovalNotes] = useState('');
//   const [filterStatus, setFilterStatus] = useState<string>('pending');
//
//   const API_BASE_URL = 'http://3.234.140.112:3001/api';
//
//   // Fetch verifications
//   const fetchVerifications = async (showRefreshIndicator = false) => {
//     try {
//       if (showRefreshIndicator) {
//         setRefreshing(true);
//       } else {
//         setLoading(true);
//       }
//
//       console.log('[StudentVerification] Fetching verifications...');
//
//       const response = await fetch(`${API_BASE_URL}/admin/verifications`, {
//         method: 'GET',
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//       });
//
//       if (!response.ok) {
//         throw new Error(`Failed to fetch verifications: ${response.status}`);
//       }
//
//       const data = await response.json();
//       console.log('[StudentVerification] Verifications data received:', data);
//
//       setVerifications(data.verifications || []);
//
//     } catch (error) {
//       console.error('[StudentVerification] Error fetching verifications:', error);
//       Alert.alert('Error', 'Failed to load verifications. Please try again.');
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };
//
//   // Load verifications on component mount
//   useEffect(() => {
//     fetchVerifications();
//   }, []);
//
//   // Handle verification approval
//   const handleApprove = async (verification: Verification) => {
//     try {
//       setActionLoading(verification.id);
//
//       console.log(`[StudentVerification] Approving verification ${verification.id}`);
//
//       const response = await fetch(`${API_BASE_URL}/admin/verifications/${verification.id}/approve`, {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           notes: approvalNotes,
//         }),
//       });
//
//       if (!response.ok) {
//         throw new Error(`Failed to approve verification: ${response.status}`);
//       }
//
//       const result = await response.json();
//       console.log('[StudentVerification] Verification approved:', result);
//
//       Alert.alert(
//         'Success',
//         `Verification for ${verification.student.firstName} ${verification.student.lastName} has been approved!`,
//         [{ text: 'OK', onPress: () => {
//           setSelectedVerification(null);
//           setApprovalNotes('');
//           fetchVerifications(true);
//         }}]
//       );
//
//     } catch (error) {
//       console.error('[StudentVerification] Error approving verification:', error);
//       Alert.alert('Error', 'Failed to approve verification. Please try again.');
//     } finally {
//       setActionLoading(null);
//     }
//   };
//
//   // Handle verification rejection
//   const handleReject = async (verification: Verification) => {
//     if (!rejectionReason.trim()) {
//       Alert.alert('Error', 'Please provide a reason for rejection.');
//       return;
//     }
//
//     try {
//       setActionLoading(verification.id);
//
//       console.log(`[StudentVerification] Rejecting verification ${verification.id}`);
//
//       const response = await fetch(`${API_BASE_URL}/admin/verifications/${verification.id}/reject`, {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           reason: rejectionReason,
//         }),
//       });
//
//       if (!response.ok) {
//         throw new Error(`Failed to reject verification: ${response.status}`);
//       }
//
//       const result = await response.json();
//       console.log('[StudentVerification] Verification rejected:', result);
//
//       Alert.alert(
//         'Success',
//         `Verification for ${verification.student.firstName} ${verification.student.lastName} has been rejected.`,
//         [{ text: 'OK', onPress: () => {
//           setSelectedVerification(null);
//           setRejectionReason('');
//           fetchVerifications(true);
//         }}]
//       );
//
//     } catch (error) {
//       console.error('[StudentVerification] Error rejecting verification:', error);
//       Alert.alert('Error', 'Failed to reject verification. Please try again.');
//     } finally {
//       setActionLoading(null);
//     }
//   };
//
//   // Filter verifications by status
//   const filteredVerifications = verifications.filter(v => {
//     if (filterStatus === 'all') return true;
//     return v.status === filterStatus;
//   });
//
//   // Format date
//   const formatDate = (dateString: string) => {
//     return new Date(dateString).toLocaleDateString('en-US', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//     });
//   };
//
//   // Get status badge style
//   const getStatusBadgeStyle = (status: string) => {
//     switch (status) {
//       case 'pending':
//         return styles.pendingBadge;
//       case 'approved':
//         return styles.approvedBadge;
//       case 'rejected':
//         return styles.rejectedBadge;
//       default:
//         return styles.defaultBadge;
//     }
//   };
//
//   // Get verification method icon
//   const getVerificationMethodIcon = (method: string) => {
//     switch (method.toLowerCase()) {
//       case 'email':
//         return '📧';
//       case 'id_card':
//         return '🆔';
//       case 'transcript':
//         return '📄';
//       case 'document':
//         return '📋';
//       default:
//         return '📝';
//     }
//   };
//
//   // Open document in browser
//   const openDocument = (documentUrl: string) => {
//     if (documentUrl) {
//       Linking.openURL(documentUrl).catch(() => {
//         Alert.alert('Error', 'Could not open document');
//       });
//     }
//   };
//
//   // Render verification card
//   const renderVerificationCard = (verification: Verification) => (
//     <View key={verification.id} style={styles.verificationCard}>
//       {/* Header */}
//       <View style={styles.verificationHeader}>
//         <View style={styles.studentInfo}>
//           <Text style={styles.studentName}>
//             {verification.student.firstName} {verification.student.lastName}
//           </Text>
//           <Text style={styles.studentEmail}>{verification.student.email}</Text>
//           <Text style={styles.schoolName}>🏫 {verification.school.name}</Text>
//         </View>
//         <View style={[styles.statusBadge, getStatusBadgeStyle(verification.status)]}>
//           <Text style={styles.badgeText}>{verification.status}</Text>
//         </View>
//       </View>
//
//       {/* Verification Details */}
//       <View style={styles.verificationDetails}>
//         <Text style={styles.detailText}>
//           {getVerificationMethodIcon(verification.verificationMethod)} Method: {verification.verificationMethod.replace('_', ' ')}
//         </Text>
//
//         {verification.verificationEmail && (
//           <Text style={styles.detailText}>
//             📧 Email: {verification.verificationEmail}
//           </Text>
//         )}
//
//         {verification.school.domain && (
//           <Text style={styles.detailText}>
//             🌐 School Domain: {verification.school.domain}
//           </Text>
//         )}
//
//         <Text style={styles.detailText}>
//           📅 Submitted: {formatDate(verification.createdAt)}
//         </Text>
//
//         {verification.rejectionReason && (
//           <View style={styles.rejectionReasonContainer}>
//             <Text style={styles.rejectionReasonLabel}>❌ Rejection Reason:</Text>
//             <Text style={styles.rejectionReasonText}>{verification.rejectionReason}</Text>
//           </View>
//         )}
//       </View>
//
//       {/* Document */}
//       {verification.verificationDocument && (
//         <View style={styles.documentSection}>
//           <Text style={styles.documentLabel}>📎 Verification Document:</Text>
//           <TouchableOpacity
//             style={styles.documentButton}
//             onPress={() => openDocument(verification.verificationDocument!)}
//           >
//             <Text style={styles.documentButtonText}>View Document</Text>
//           </TouchableOpacity>
//         </View>
//       )}
//
//       {/* Actions for pending verifications */}
//       {verification.status === 'pending' && (
//         <View style={styles.verificationActions}>
//           <TouchableOpacity
//             style={styles.reviewButton}
//             onPress={() => setSelectedVerification(verification)}
//           >
//             <Text style={styles.buttonText}>Review</Text>
//           </TouchableOpacity>
//
//           <TouchableOpacity
//             style={styles.quickApproveButton}
//             onPress={() => handleApprove(verification)}
//             disabled={actionLoading === verification.id}
//           >
//             {actionLoading === verification.id ? (
//               <ActivityIndicator size="small" color="#fff" />
//             ) : (
//               <Text style={styles.buttonText}>Quick Approve</Text>
//             )}
//           </TouchableOpacity>
//         </View>
//       )}
//     </View>
//   );
//
//   if (loading && !refreshing) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#6366f1" />
//         <Text style={styles.loadingText}>Loading verifications...</Text>
//       </View>
//     );
//   }
//
//   return (
//     <View style={styles.container}>
//       {/* Header */}
//       <View style={styles.header}>
//         <Text style={styles.title}>Student Verification</Text>
//         <TouchableOpacity
//           style={styles.refreshButton}
//           onPress={() => fetchVerifications(true)}
//           disabled={refreshing}
//         >
//           {refreshing ? (
//             <ActivityIndicator size="small" color="#fff" />
//           ) : (
//             <Text style={styles.refreshButtonText}>↻ Refresh</Text>
//           )}
//         </TouchableOpacity>
//       </View>
//
//       {/* Status Filter */}
//       <View style={styles.filterContainer}>
//         <Text style={styles.filterLabel}>Filter by Status:</Text>
//         <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterButtons}>
//           {[
//             { key: 'pending', label: 'Pending', count: verifications.filter(v => v.status === 'pending').length },
//             { key: 'approved', label: 'Approved', count: verifications.filter(v => v.status === 'approved').length },
//             { key: 'rejected', label: 'Rejected', count: verifications.filter(v => v.status === 'rejected').length },
//             { key: 'all', label: 'All', count: verifications.length },
//           ].map((filter) => (
//             <TouchableOpacity
//               key={filter.key}
//               style={[
//                 styles.filterButton,
//                 filterStatus === filter.key && styles.activeFilterButton
//               ]}
//               onPress={() => setFilterStatus(filter.key)}
//             >
//               <Text style={[
//                 styles.filterButtonText,
//                 filterStatus === filter.key && styles.activeFilterButtonText
//               ]}>
//                 {filter.label} ({filter.count})
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </ScrollView>
//       </View>
//
//       {/* Stats */}
//       <View style={styles.statsContainer}>
//         <Text style={styles.statsText}>
//           Showing {filteredVerifications.length} of {verifications.length} verifications
//         </Text>
//       </View>
//
//       {/* Verification List */}
//       <ScrollView style={styles.verificationList}>
//         {filteredVerifications.length === 0 ? (
//           <View style={styles.emptyState}>
//             <Text style={styles.emptyStateText}>
//               {filterStatus === 'pending' ? 'No Pending Verifications' : `No ${filterStatus} Verifications`}
//             </Text>
//             <Text style={styles.emptyStateSubtext}>
//               {filterStatus === 'pending'
//                 ? 'All student verifications have been processed'
//                 : `No verifications with ${filterStatus} status found`
//               }
//             </Text>
//           </View>
//         ) : (
//           filteredVerifications.map(renderVerificationCard)
//         )}
//       </ScrollView>
//
//       {/* Review Modal */}
//       {selectedVerification && (
//         <View style={styles.modalOverlay}>
//           <View style={styles.modal}>
//             <Text style={styles.modalTitle}>Review Verification</Text>
//
//             <View style={styles.modalStudentInfo}>
//               <Text style={styles.modalStudentName}>
//                 {selectedVerification.student.firstName} {selectedVerification.student.lastName}
//               </Text>
//               <Text style={styles.modalStudentEmail}>{selectedVerification.student.email}</Text>
//               <Text style={styles.modalSchoolName}>🏫 {selectedVerification.school.name}</Text>
//             </View>
//
//             <View style={styles.modalSection}>
//               <Text style={styles.modalSectionTitle}>Verification Details</Text>
//               <Text style={styles.modalDetailText}>
//                 Method: {selectedVerification.verificationMethod.replace('_', ' ')}
//               </Text>
//               {selectedVerification.verificationEmail && (
//                 <Text style={styles.modalDetailText}>
//                   Email: {selectedVerification.verificationEmail}
//                 </Text>
//               )}
//               <Text style={styles.modalDetailText}>
//                 Submitted: {formatDate(selectedVerification.createdAt)}
//               </Text>
//             </View>
//
//             {selectedVerification.verificationDocument && (
//               <View style={styles.modalSection}>
//                 <Text style={styles.modalSectionTitle}>Document</Text>
//                 <TouchableOpacity
//                   style={styles.modalDocumentButton}
//                   onPress={() => openDocument(selectedVerification.verificationDocument!)}
//                 >
//                   <Text style={styles.modalDocumentButtonText}>📄 View Verification Document</Text>
//                 </TouchableOpacity>
//               </View>
//             )}
//
//             {/* Approval Notes */}
//             <View style={styles.modalSection}>
//               <Text style={styles.modalSectionTitle}>Approval Notes (Optional)</Text>
//               <TextInput
//                 style={styles.modalTextInput}
//                 placeholder="Add notes for approval..."
//                 placeholderTextColor="#64748b"
//                 value={approvalNotes}
//                 onChangeText={setApprovalNotes}
//                 multiline
//                 numberOfLines={3}
//               />
//             </View>
//
//             {/* Rejection Reason */}
//             <View style={styles.modalSection}>
//               <Text style={styles.modalSectionTitle}>Rejection Reason</Text>
//               <TextInput
//                 style={styles.modalTextInput}
//                 placeholder="Enter reason for rejection..."
//                 placeholderTextColor="#64748b"
//                 value={rejectionReason}
//                 onChangeText={setRejectionReason}
//                 multiline
//                 numberOfLines={3}
//               />
//             </View>
//
//             {/* Actions */}
//             <View style={styles.modalActions}>
//               <TouchableOpacity
//                 style={styles.modalCancelButton}
//                 onPress={() => {
//                   setSelectedVerification(null);
//                   setRejectionReason('');
//                   setApprovalNotes('');
//                 }}
//               >
//                 <Text style={styles.modalCancelButtonText}>Cancel</Text>
//               </TouchableOpacity>
//
//               <TouchableOpacity
//                 style={styles.modalRejectButton}
//                 onPress={() => handleReject(selectedVerification)}
//                 disabled={!rejectionReason.trim() || actionLoading === selectedVerification.id}
//               >
//                 {actionLoading === selectedVerification.id ? (
//                   <ActivityIndicator size="small" color="#fff" />
//                 ) : (
//                   <Text style={styles.modalRejectButtonText}>Reject</Text>
//                 )}
//               </TouchableOpacity>
//
//               <TouchableOpacity
//                 style={styles.modalApproveButton}
//                 onPress={() => handleApprove(selectedVerification)}
//                 disabled={actionLoading === selectedVerification.id}
//               >
//                 {actionLoading === selectedVerification.id ? (
//                   <ActivityIndicator size="small" color="#fff" />
//                 ) : (
//                   <Text style={styles.modalApproveButtonText}>Approve</Text>
//                 )}
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       )}
//     </View>
//   );
// };
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#0f172a',
//     padding: 20,
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#0f172a',
//   },
//   loadingText: {
//     color: '#94a3b8',
//     marginTop: 10,
//     fontSize: 16,
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#ffffff',
//   },
//   refreshButton: {
//     backgroundColor: '#6366f1',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 6,
//     minWidth: 80,
//     alignItems: 'center',
//   },
//   refreshButtonText: {
//     color: '#ffffff',
//     fontSize: 12,
//     fontWeight: '600',
//   },
//   filterContainer: {
//     marginBottom: 20,
//   },
//   filterLabel: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#ffffff',
//     marginBottom: 8,
//   },
//   filterButtons: {
//     flexDirection: 'row',
//   },
//   filterButton: {
//     backgroundColor: '#1e293b',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 6,
//     marginRight: 8,
//     borderWidth: 1,
//     borderColor: '#334155',
//   },
//   activeFilterButton: {
//     backgroundColor: '#6366f1',
//     borderColor: '#6366f1',
//   },
//   filterButtonText: {
//     color: '#94a3b8',
//     fontSize: 14,
//     fontWeight: '500',
//   },
//   activeFilterButtonText: {
//     color: '#ffffff',
//   },
//   statsContainer: {
//     marginBottom: 15,
//   },
//   statsText: {
//     color: '#64748b',
//     fontSize: 14,
//   },
//   verificationList: {
//     flex: 1,
//   },
//   verificationCard: {
//     backgroundColor: '#1e293b',
//     borderRadius: 8,
//     padding: 16,
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: '#334155',
//   },
//   verificationHeader: {
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
//     color: '#ffffff',
//     marginBottom: 4,
//   },
//   studentEmail: {
//     fontSize: 14,
//     color: '#94a3b8',
//     marginBottom: 4,
//   },
//   schoolName: {
//     fontSize: 14,
//     color: '#cbd5e1',
//   },
//   statusBadge: {
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 4,
//   },
//   pendingBadge: {
//     backgroundColor: '#f59e0b',
//   },
//   approvedBadge: {
//     backgroundColor: '#10b981',
//   },
//   rejectedBadge: {
//     backgroundColor: '#ef4444',
//   },
//   defaultBadge: {
//     backgroundColor: '#64748b',
//   },
//   badgeText: {
//     color: '#ffffff',
//     fontSize: 12,
//     fontWeight: 'bold',
//     textTransform: 'capitalize',
//   },
//   verificationDetails: {
//     marginBottom: 12,
//   },
//   detailText: {
//     color: '#cbd5e1',
//     fontSize: 14,
//     marginBottom: 4,
//   },
//   rejectionReasonContainer: {
//     backgroundColor: '#7f1d1d',
//     padding: 8,
//     borderRadius: 4,
//     marginTop: 8,
//   },
//   rejectionReasonLabel: {
//     color: '#fca5a5',
//     fontSize: 12,
//     fontWeight: 'bold',
//     marginBottom: 4,
//   },
//   rejectionReasonText: {
//     color: '#fecaca',
//     fontSize: 14,
//   },
//   documentSection: {
//     marginBottom: 12,
//   },
//   documentLabel: {
//     color: '#cbd5e1',
//     fontSize: 14,
//     marginBottom: 8,
//   },
//   documentButton: {
//     backgroundColor: '#3b82f6',
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 6,
//     alignSelf: 'flex-start',
//   },
//   documentButtonText: {
//     color: '#ffffff',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   verificationActions: {
//     flexDirection: 'row',
//     justifyContent: 'flex-end',
//   },
//   reviewButton: {
//     backgroundColor: '#6366f1',
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 4,
//     marginRight: 8,
//   },
//   quickApproveButton: {
//     backgroundColor: '#10b981',
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 4,
//   },
//   buttonText: {
//     color: '#ffffff',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   emptyState: {
//     alignItems: 'center',
//     paddingVertical: 40,
//   },
//   emptyStateText: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#64748b',
//     marginBottom: 8,
//   },
//   emptyStateSubtext: {
//     fontSize: 14,
//     color: '#64748b',
//     textAlign: 'center',
//   },
//   modalOverlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: 'rgba(0, 0, 0, 0.8)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   modal: {
//     backgroundColor: '#1e293b',
//     borderRadius: 8,
//     padding: 20,
//     margin: 20,
//     maxWidth: 500,
//     width: '90%',
//     maxHeight: '80%',
//   },
//   modalTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#ffffff',
//     marginBottom: 16,
//     textAlign: 'center',
//   },
//   modalStudentInfo: {
//     backgroundColor: '#334155',
//     padding: 12,
//     borderRadius: 6,
//     marginBottom: 16,
//   },
//   modalStudentName: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#ffffff',
//     marginBottom: 4,
//   },
//   modalStudentEmail: {
//     fontSize: 14,
//     color: '#94a3b8',
//     marginBottom: 4,
//   },
//   modalSchoolName: {
//     fontSize: 14,
//     color: '#cbd5e1',
//   },
//   modalSection: {
//     marginBottom: 16,
//   },
//   modalSectionTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#ffffff',
//     marginBottom: 8,
//   },
//   modalDetailText: {
//     color: '#cbd5e1',
//     fontSize: 14,
//     marginBottom: 4,
//   },
//   modalDocumentButton: {
//     backgroundColor: '#3b82f6',
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 6,
//     alignSelf: 'flex-start',
//   },
//   modalDocumentButtonText: {
//     color: '#ffffff',
//     fontSize: 14,
//     fontWeight: '600',
//   },
//   modalTextInput: {
//     backgroundColor: '#334155',
//     color: '#ffffff',
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 6,
//     borderWidth: 1,
//     borderColor: '#475569',
//     fontSize: 14,
//     textAlignVertical: 'top',
//   },
//   modalActions: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: 20,
//   },
//   modalCancelButton: {
//     backgroundColor: '#64748b',
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     borderRadius: 6,
//     flex: 1,
//     marginRight: 8,
//   },
//   modalCancelButtonText: {
//     color: '#ffffff',
//     fontWeight: '600',
//     textAlign: 'center',
//   },
//   modalRejectButton: {
//     backgroundColor: '#ef4444',
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     borderRadius: 6,
//     flex: 1,
//     marginRight: 8,
//   },
//   modalRejectButtonText: {
//     color: '#ffffff',
//     fontWeight: '600',
//     textAlign: 'center',
//   },
//   modalApproveButton: {
//     backgroundColor: '#10b981',
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     borderRadius: 6,
//     flex: 1,
//   },
//   modalApproveButtonText: {
//     color: '#ffffff',
//     fontWeight: '600',
//     textAlign: 'center',
//   },
// });
//
// export default StudentVerification;
//
//
//
