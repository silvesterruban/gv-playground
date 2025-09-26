// frontend/src/components/student/StudentVerificationForm.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { API_BASE_URL } from '../../config/api';

interface StudentVerificationFormProps {
  studentData: any;
  onClose: () => void;
  onSuccess: () => void;
}

interface School {
  id: string;
  name: string;
  domain?: string;
  verificationMethods: string[];
}

interface VerificationStatus {
  id?: string;
  status: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt?: string;
  verifiedAt?: string;
  school?: {
    name: string;
    domain?: string;
  };
  verificationMethod?: string;
  verified?: boolean;
}

const StudentVerificationForm: React.FC<StudentVerificationFormProps> = ({
  studentData,
  onClose,
  onSuccess
}) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<string>('');
  const [verificationEmail, setVerificationEmail] = useState<string>('');
  const [verificationDocument, setVerificationDocument] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    status: 'not_submitted'
  });



  // Verification method options
  const verificationMethods = [
    {
      value: 'email',
      label: 'School Email Verification',
      description: 'Use your official school email address',
      icon: '📧'
    },
    {
      value: 'id_card',
      label: 'Student ID Card',
      description: 'Upload photo of your student ID card',
      icon: '🆔'
    },
    {
      value: 'transcript',
      label: 'Official Transcript',
      description: 'Upload official academic transcript',
      icon: '📄'
    },
    {
      value: 'document',
      label: 'Other Document',
      description: 'Upload other official school document',
      icon: '📋'
    }
  ];

  // Fetch available schools
  const fetchSchools = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/students/schools`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${studentData?.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📚 [VerificationForm] Schools response:', data);
        setSchools(data.schools || []);

        // Auto-select school if student has schoolName
        if (studentData?.schoolName) {
          const matchingSchool = data.schools.find((school: School) =>
            school.name.toLowerCase().includes(studentData.schoolName.toLowerCase())
          );
          if (matchingSchool) {
            setSelectedSchool(matchingSchool);
          }
        }
      } else {
        console.error('❌ [VerificationForm] Failed to fetch schools:', response.status);
      }
    } catch (error) {
      console.error('💥 [VerificationForm] Error fetching schools:', error);
      // Create a fallback school option
      setSchools([{
        id: 'custom',
        name: studentData?.schoolName || 'My School',
        verificationMethods: ['email', 'id_card', 'transcript', 'document']
      }]);
    } finally {
      setSchoolsLoading(false);
    }
  };

  // Check existing verification status
  const checkVerificationStatus = async () => {
    console.log('🔍 [VerificationForm] checkVerificationStatus called');

    try {
      setStatusLoading(true);
      console.log('🌐 [VerificationForm] Making request to:', `${API_BASE_URL}/api/students/verification-status`);

      const response = await fetch(`${API_BASE_URL}/api/students/verification-status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${studentData?.token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 [VerificationForm] Response received:', response.status, response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [VerificationForm] Response data:', data);

        if (data.verification) {
          console.log('✅ [VerificationForm] Setting verification status:', data.verification);
          setVerificationStatus(data.verification);
        } else {
          console.log('⚠️ [VerificationForm] No verification data, setting default');
          setVerificationStatus({ status: 'not_submitted' });
        }
      } else {
        const errorText = await response.text();
        console.error('❌ [VerificationForm] Response error:', response.status, errorText);
        // Set default status on error
        setVerificationStatus({ status: 'not_submitted' });
      }
    } catch (error) {
      console.error('💥 [VerificationForm] Network/fetch error:', error);
      // Set default status on error
      setVerificationStatus({ status: 'not_submitted' });
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    const initializeForm = async () => {
      await Promise.all([
        fetchSchools(),
        checkVerificationStatus()
      ]);
    };

    initializeForm();
  }, []);

  // Handle school selection
  const handleSchoolSelect = (school: School) => {
    setSelectedSchool(school);
    setVerificationMethod(''); // Reset method when school changes
    setVerificationEmail('');

    // Auto-populate email domain if available
    if (school.domain) {
      setVerificationEmail(`@${school.domain}`);
    }
  };

  // Handle verification method selection
  const handleMethodSelect = (method: string) => {
    setVerificationMethod(method);

    // Auto-populate email for email method
    if (method === 'email' && selectedSchool?.domain) {
      const emailPrefix = studentData?.firstName?.toLowerCase() + '.' + studentData?.lastName?.toLowerCase();
      setVerificationEmail(`${emailPrefix}@${selectedSchool.domain}`);
    }
  };

  // Simulate file upload (replace with actual file upload logic)
  const handleDocumentUpload = () => {
    Alert.alert(
      'Document Upload',
      'In a real app, this would open a file picker to upload your verification document.',
      [
        { text: 'Cancel' },
        {
          text: 'Simulate Upload',
          onPress: () => {
            setVerificationDocument(`https://example.com/verification-docs/${verificationMethod}-${Date.now()}.pdf`);
            Alert.alert('Success', 'Document uploaded successfully!');
          }
        }
      ]
    );
  };

  // Submit verification
  const handleSubmitVerification = async () => {
    // Validation
    if (!selectedSchool) {
      Alert.alert('Error', 'Please select your school');
      return;
    }

    if (!verificationMethod) {
      Alert.alert('Error', 'Please select a verification method');
      return;
    }

    if (verificationMethod === 'email' && !verificationEmail.trim()) {
      Alert.alert('Error', 'Please enter your school email address');
      return;
    }

    if (verificationMethod !== 'email' && !verificationDocument) {
      Alert.alert('Error', 'Please upload your verification document');
      return;
    }

    // Email validation for email method
    if (verificationMethod === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(verificationEmail)) {
        Alert.alert('Error', 'Please enter a valid email address');
        return;
      }

      // Check if email domain matches school domain (if available)
      if (selectedSchool.domain) {
        const emailDomain = verificationEmail.split('@')[1];
        if (emailDomain !== selectedSchool.domain) {
          Alert.alert(
            'Domain Mismatch',
            `Please use an email address from ${selectedSchool.domain}`,
            [
              { text: 'Cancel' },
              { text: 'Continue Anyway', onPress: () => submitVerification() }
            ]
          );
          return;
        }
      }
    }

    await submitVerification();
  };

  const submitVerification = async () => {
    try {
      setLoading(true);

      const verificationData = {
        schoolId: selectedSchool!.id,
        verificationMethod,
        ...(verificationMethod === 'email' && { verificationEmail }),
        ...(verificationMethod !== 'email' && { verificationDocument }),
      };

      console.log('[StudentVerification] Submitting verification:', verificationData);

      const response = await fetch(`${API_BASE_URL}/api/students/submit-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${studentData?.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const result = await response.json();
      console.log('[StudentVerification] Verification submitted:', result);

      // Update local state to reflect the new status
      setVerificationStatus({
        status: 'pending',
        verificationMethod: verificationMethod,
        school: selectedSchool ? { name: selectedSchool.name, domain: selectedSchool.domain } : undefined,
        createdAt: new Date().toISOString()
      });

      Alert.alert(
        'Verification Submitted!',
        'Your school verification has been submitted for review. You will be notified once it\'s processed.',
        [{ text: 'OK', onPress: () => {
          onSuccess();
          onClose();
        }}]
      );

    } catch (error) {
      console.error('[StudentVerification] Error submitting verification:', error);
      Alert.alert(
        'Submission Failed',
        error instanceof Error ? error.message : 'Failed to submit verification. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Render verification status
  const renderVerificationStatus = () => {
    if (statusLoading) {
      return (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" color="#6366f1" />
          <Text style={styles.loadingText}>Checking verification status...</Text>
        </View>
      );
    }

    const { status, rejectionReason, createdAt, verifiedAt, school } = verificationStatus;

    if (status === 'not_submitted') {
      return null;
    }

    const statusColors = {
      pending: '#f59e0b',
      approved: '#10b981',
      rejected: '#ef4444'
    };

    const statusLabels = {
      pending: 'Under Review',
      approved: 'Verified',
      rejected: 'Rejected'
    };

    const statusIcons = {
      pending: '⏳',
      approved: '✅',
      rejected: '❌'
    };

    return (
      <View style={[styles.statusContainer, { borderLeftColor: statusColors[status] }]}>
        <Text style={styles.statusTitle}>Current Verification Status</Text>
        <View style={styles.statusBadge}>
          <Text style={[styles.statusText, { color: statusColors[status] }]}>
            {statusIcons[status]} {statusLabels[status]}
          </Text>
        </View>

        {school && (
          <Text style={styles.statusSchool}>
            School: {school.name}
          </Text>
        )}

        {createdAt && (
          <Text style={styles.statusDate}>
            Submitted: {new Date(createdAt).toLocaleDateString()}
          </Text>
        )}

        {verifiedAt && (
          <Text style={styles.statusDate}>
            Processed: {new Date(verifiedAt).toLocaleDateString()}
          </Text>
        )}

        {rejectionReason && (
          <View style={styles.rejectionContainer}>
            <Text style={styles.rejectionLabel}>Reason for rejection:</Text>
            <Text style={styles.rejectionText}>{rejectionReason}</Text>
            <Text style={styles.resubmitText}>You can submit a new verification below.</Text>
          </View>
        )}
      </View>
    );
  };

  if (schoolsLoading || statusLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading verification form...</Text>
      </View>
    );
  }

  const canSubmit = verificationStatus.status === 'not_submitted' || verificationStatus.status === 'rejected';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>School Verification</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        Verify your student status to access all platform features
      </Text>

      {renderVerificationStatus()}

      {!canSubmit && verificationStatus.status === 'pending' && (
        <View style={styles.pendingContainer}>
          <Text style={styles.pendingText}>
            ⏳ Your verification is currently under review. Please wait for admin approval.
          </Text>
          <Text style={styles.pendingSubtext}>
            We'll notify you once your verification has been processed.
          </Text>

          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => {
              Alert.alert(
                'Verification Details',
                `School: ${verificationStatus.school?.name || 'Unknown'}\nMethod: ${verificationStatus.verificationMethod || 'Unknown'}\nSubmitted: ${verificationStatus.createdAt ? new Date(verificationStatus.createdAt).toLocaleDateString() : 'Unknown'}`,
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
          </TouchableOpacity>
        </View>
      )}

      {!canSubmit && verificationStatus.status === 'approved' && (
        <View style={styles.approvedContainer}>
          <Text style={styles.approvedText}>
            ✅ Your account is already verified! You have access to all platform features.
          </Text>
        </View>
      )}

      {canSubmit && (
        <>
          {/* School Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Select Your School</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.schoolList}>
              {schools.map((school) => (
                <TouchableOpacity
                  key={school.id}
                  style={[
                    styles.schoolCard,
                    selectedSchool?.id === school.id && styles.selectedSchoolCard
                  ]}
                  onPress={() => handleSchoolSelect(school)}
                >
                  <Text style={[
                    styles.schoolName,
                    selectedSchool?.id === school.id && styles.selectedSchoolName
                  ]}>
                    {school.name}
                  </Text>
                  {school.domain && (
                    <Text style={styles.schoolDomain}>@{school.domain}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Verification Method Selection */}
          {selectedSchool && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Choose Verification Method</Text>
              {verificationMethods
                .filter(method => selectedSchool.verificationMethods.includes(method.value))
                .map((method) => (
                  <TouchableOpacity
                    key={method.value}
                    style={[
                      styles.methodCard,
                      verificationMethod === method.value && styles.selectedMethodCard
                    ]}
                    onPress={() => handleMethodSelect(method.value)}
                  >
                    <Text style={styles.methodIcon}>{method.icon}</Text>
                    <View style={styles.methodInfo}>
                      <Text style={[
                        styles.methodLabel,
                        verificationMethod === method.value && styles.selectedMethodLabel
                      ]}>
                        {method.label}
                      </Text>
                      <Text style={styles.methodDescription}>{method.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          )}

          {/* Verification Details */}
          {verificationMethod && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Verification Details</Text>

              {verificationMethod === 'email' ? (
                <View style={styles.emailSection}>
                  <Text style={styles.inputLabel}>School Email Address</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={`your.name@${selectedSchool?.domain || 'school.edu'}`}
                    placeholderTextColor="#64748b"
                    value={verificationEmail}
                    onChangeText={setVerificationEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Text style={styles.inputHelp}>
                    Enter your official school email address. We'll send a verification link to confirm your enrollment.
                  </Text>
                </View>
              ) : (
                <View style={styles.documentSection}>
                  <Text style={styles.inputLabel}>Upload Verification Document</Text>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={handleDocumentUpload}
                  >
                    <Text style={styles.uploadIcon}>📎</Text>
                    <Text style={styles.uploadButtonText}>
                      {verificationDocument ? 'Document Uploaded' : 'Choose File'}
                    </Text>
                  </TouchableOpacity>
                  {verificationDocument && (
                    <Text style={styles.uploadedFileName}>
                      ✅ Document ready for upload
                    </Text>
                  )}
                  <Text style={styles.inputHelp}>
                    Upload a clear photo or scan of your {verificationMethod === 'id_card' ? 'student ID card' :
                    verificationMethod === 'transcript' ? 'official transcript' : 'verification document'}.
                    Supported formats: JPG, PNG, PDF
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Submit Button */}
          {verificationMethod && (
            <View style={styles.submitSection}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!selectedSchool || !verificationMethod || loading) && styles.disabledButton
                ]}
                onPress={handleSubmitVerification}
                disabled={!selectedSchool || !verificationMethod || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit for Verification</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.submitHelp}>
                Your verification will be reviewed by our team within 24-48 hours. You'll receive a notification once processed.
              </Text>
            </View>
          )}
        </>
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
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 20,
  },
  statusContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  statusBadge: {
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusSchool: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  statusDate: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  rejectionContainer: {
    backgroundColor: '#7f1d1d',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  rejectionLabel: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  rejectionText: {
    color: '#fecaca',
    fontSize: 14,
    marginBottom: 8,
  },
  resubmitText: {
    color: '#fed7d7',
    fontSize: 12,
    fontStyle: 'italic',
  },
  pendingContainer: {
    backgroundColor: '#451a03',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  pendingText: {
    color: '#fbbf24',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  pendingSubtext: {
    color: '#fcd34d',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  viewDetailsButton: {
    backgroundColor: '#92400e',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'center',
  },
  viewDetailsText: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '600',
  },
  approvedContainer: {
    backgroundColor: '#064e3b',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  approvedText: {
    color: '#34d399',
    fontSize: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  schoolList: {
    flexDirection: 'row',
  },
  schoolCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#334155',
    minWidth: 200,
  },
  selectedSchoolCard: {
    borderColor: '#6366f1',
    backgroundColor: '#312e81',
  },
  schoolName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  selectedSchoolName: {
    color: '#a5b4fc',
  },
  schoolDomain: {
    fontSize: 14,
    color: '#94a3b8',
  },
  methodCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedMethodCard: {
    borderColor: '#6366f1',
    backgroundColor: '#312e81',
  },
  methodIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  selectedMethodLabel: {
    color: '#a5b4fc',
  },
  methodDescription: {
    fontSize: 14,
    color: '#94a3b8',
  },
  emailSection: {
    marginBottom: 16,
  },
  documentSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1e293b',
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 16,
    marginBottom: 8,
  },
  inputHelp: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  uploadButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: '#4b5563',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadButtonText: {
    color: '#d1d5db',
    fontSize: 16,
    fontWeight: '500',
  },
  uploadedFileName: {
    color: '#10b981',
    fontSize: 14,
    marginBottom: 8,
  },
  submitSection: {
    marginTop: 20,
    marginBottom: 40,
  },
  submitButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: '#64748b',
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  submitHelp: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default StudentVerificationForm;