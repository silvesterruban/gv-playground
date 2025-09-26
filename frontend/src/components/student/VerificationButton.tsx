// frontend/src/components/student/VerificationButton.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import StudentVerificationForm from './StudentVerificationForm';
import { API_BASE_URL } from '../../config/api';

interface VerificationButtonProps {
  studentData: any;
}

const VerificationButton: React.FC<VerificationButtonProps> = ({ studentData }) => {
  console.log('🎯 [VerificationButton] Component rendered with studentData:', studentData);

  const [showModal, setShowModal] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Check verification status
  const checkVerificationStatus = async () => {
    console.log('🔍 [VerificationButton] checkVerificationStatus called');
    console.log('🔍 [VerificationButton] studentData in checkStatus:', studentData);
    console.log('🔍 [VerificationButton] token:', studentData?.token);

    try {
      console.log('🌐 [VerificationButton] Making request to:', `${API_BASE_URL}/api/students/verification-status`);

      const response = await fetch(`${API_BASE_URL}/api/students/verification-status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${studentData?.token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 [VerificationButton] Response received:', response.status, response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [VerificationButton] Verification status data:', data);
        setVerificationStatus(data.verification || { status: 'not_submitted' });
      } else {
        const errorText = await response.text();
        console.error('❌ [VerificationButton] Response error:', response.status, errorText);
        setVerificationStatus({ status: 'not_submitted' });
      }
    } catch (error) {
      console.error('💥 [VerificationButton] Error checking status:', error);
      setVerificationStatus({ status: 'not_submitted' });
    } finally {
      console.log('🏁 [VerificationButton] Setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 [VerificationButton] useEffect triggered');
    console.log('🔄 [VerificationButton] studentData?.token exists:', !!studentData?.token);

    if (studentData?.token) {
      console.log('✅ [VerificationButton] Token found, calling checkVerificationStatus');
      checkVerificationStatus();
    } else {
      console.log('❌ [VerificationButton] No token found, setting loading to false');
      setLoading(false);
    }
  }, [studentData?.token]);

  const handleButtonPress = () => {
    console.log('🎯 [VerificationButton] Button pressed!');
    console.log('🎯 [VerificationButton] Current status:', verificationStatus?.status);
    console.log('🎯 [VerificationButton] Can open modal:', canOpenModal);

    if (canOpenModal) {
      console.log('✅ [VerificationButton] Opening modal...');
      setShowModal(true);
    } else {
      console.log('❌ [VerificationButton] Cannot open modal - status:', verificationStatus?.status);
    }
  };

  const handleModalClose = () => {
    console.log('🔍 [VerificationButton] Modal closing...');
    setShowModal(false);
  };

  const handleSuccess = () => {
    console.log('🎉 [VerificationButton] Verification success!');
    setShowModal(false);
    checkVerificationStatus(); // Refresh status
    Alert.alert(
      'Success!',
      'Your verification has been submitted and is under review.'
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'rejected': return '#ef4444';
      default: return '#6366f1';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return '✅ Verified';
      case 'pending': return '⏳ Under Review';
      case 'rejected': return '❌ Rejected';
      default: return '🎓 Verify Your Account';
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'approved': return 'Your student status has been verified';
      case 'pending': return 'Your verification is being reviewed';
      case 'rejected': return 'Your verification was rejected - tap to resubmit';
      default: return 'Verify your student status to access all features';
    }
  };

  if (loading) {
    console.log('⏳ [VerificationButton] Rendering loading state');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#6366f1" />
        <Text style={styles.loadingText}>Checking verification status...</Text>
      </View>
    );
  }

  const status = verificationStatus?.status || 'not_submitted';
  const canOpenModal = status === 'not_submitted' || status === 'rejected' || status === 'pending';

  console.log('🎨 [VerificationButton] Rendering with status:', status);
  console.log('🎨 [VerificationButton] Can open modal:', canOpenModal);

  return (
    <View style={styles.container}>
      {/* Debug Info */}
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>
          Status: {status} | Can Open: {canOpenModal ? 'Yes' : 'No'} | Modal: {showModal ? 'Open' : 'Closed'}
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.verificationButton,
          { backgroundColor: getStatusColor(status) },
          !canOpenModal && styles.disabledButton
        ]}
        onPress={handleButtonPress}
        activeOpacity={0.7}
      >
        <Text style={styles.statusText}>{getStatusText(status)}</Text>
        <Text style={styles.statusDescription}>{getStatusDescription(status)}</Text>

        {status === 'pending' && verificationStatus?.school && (
          <Text style={styles.schoolText}>
            School: {verificationStatus.school.name}
          </Text>
        )}

        {status === 'pending' && verificationStatus?.createdAt && (
          <Text style={styles.dateText}>
            Submitted: {new Date(verificationStatus.createdAt).toLocaleDateString()}
          </Text>
        )}

        {canOpenModal && (
          <Text style={styles.actionText}>
            👆 Tap to {status === 'rejected' ? 'resubmit' : status === 'pending' ? 'view details' : 'start verification'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Rejection reason */}
      {status === 'rejected' && verificationStatus?.rejectionReason && (
        <View style={styles.rejectionContainer}>
          <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
          <Text style={styles.rejectionText}>{verificationStatus.rejectionReason}</Text>
        </View>
      )}

      {/* Test Modal Button */}
      <TouchableOpacity
        style={styles.testButton}
        onPress={() => {
          console.log('🧪 [VerificationButton] Test button pressed!');
          setShowModal(true);
        }}
      >
        <Text style={styles.testButtonText}>🧪 Test Modal (Debug)</Text>
      </TouchableOpacity>

      {/* Verification Form Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        onRequestClose={handleModalClose}
        transparent={false}
      >
        <View style={styles.modalContainer}>
          <StudentVerificationForm
            studentData={studentData}
            onClose={handleModalClose}
            onSuccess={handleSuccess}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
    marginLeft: 8,
  },
  debugContainer: {
    backgroundColor: '#1e293b',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  debugText: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  verificationButton: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 100,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  disabledButton: {
    opacity: 0.8,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  statusDescription: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 8,
  },
  schoolText: {
    color: '#ffffff',
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 2,
  },
  dateText: {
    color: '#ffffff',
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 8,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
  },
  rejectionContainer: {
    backgroundColor: '#7f1d1d',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  rejectionLabel: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  rejectionText: {
    color: '#fecaca',
    fontSize: 14,
  },
  testButton: {
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
});

export default VerificationButton;