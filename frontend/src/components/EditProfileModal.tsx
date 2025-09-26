import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform
} from 'react-native';

import { API_BASE_URL } from '../config/api';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userData: any;
  profileData?: any;
  onProfileUpdated: (updatedProfile: any) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  userData,
  profileData,
  onProfileUpdated
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    school: '',
    bio: '',
    major: '',
    graduationYear: '',
    gpa: '',
    achievements: '',
    financialNeed: '',
    fundingGoal: '',
    phoneNumber: '',
    linkedinUrl: '',
    personalStatement: ''
  });

  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(false);

  // Immediately populate form data when profileData is available
  useEffect(() => {
    console.log('[EditProfileModal] Profile data received:', profileData);
    console.log('[EditProfileModal] User data received:', userData);
    
    if (profileData) {
      const populatedData = {
        firstName: profileData.firstName || userData?.firstName || '',
        lastName: profileData.lastName || userData?.lastName || '',
        email: profileData.email || userData?.email || '',
        school: profileData.schoolName || '',
        bio: profileData.bio || '',
        major: profileData.major || '',
        graduationYear: profileData.graduationYear?.toString() || '',
        gpa: profileData.gpa?.toString() || '',
        achievements: profileData.achievements || '',
        financialNeed: profileData.financialNeed || '',
        fundingGoal: profileData.fundingGoal?.toString() || '',
        phoneNumber: profileData.phoneNumber || '',
        linkedinUrl: profileData.linkedinUrl || '',
        personalStatement: profileData.personalStatement || ''
      };
      
      console.log('[EditProfileModal] Setting form data:', populatedData);
      setFormData(populatedData);
    } else if (userData) {
      // Fallback to userData if profileData is not available
      const fallbackData = {
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        school: userData.school || '',
        bio: '',
        major: userData.major || '',
        graduationYear: '',
        gpa: '',
        achievements: '',
        financialNeed: '',
        fundingGoal: '',
        phoneNumber: '',
        linkedinUrl: '',
        personalStatement: ''
      };
      
      console.log('[EditProfileModal] Using fallback user data:', fallbackData);
      setFormData(fallbackData);
    }
  }, [profileData, userData]);

  // Use profileData if available, otherwise fetch current profile data when modal opens
  useEffect(() => {
    console.log('[EditProfileModal] useEffect triggered - visible:', visible, 'profileData:', !!profileData, 'token:', !!userData?.token);
    
    if (visible && profileData) {
      // Use the profileData passed from parent immediately
      console.log('[EditProfileModal] Using profileData from parent:', profileData);
      setFormData({
        firstName: profileData.firstName || userData.firstName || '',
        lastName: profileData.lastName || userData.lastName || '',
        email: profileData.email || userData.email || '',
        school: profileData.schoolName || '',
        bio: profileData.bio || '',
        major: profileData.major || '',
        graduationYear: profileData.graduationYear?.toString() || '',
        gpa: profileData.gpa?.toString() || '',
        achievements: profileData.achievements || '',
        financialNeed: profileData.financialNeed || '',
        fundingGoal: profileData.fundingGoal?.toString() || '',
        phoneNumber: profileData.phoneNumber || '',
        linkedinUrl: profileData.linkedinUrl || '',
        personalStatement: profileData.personalStatement || ''
      });
    } else if (visible && userData?.token && !profileData) {
      // Only fetch if profileData is not available
      console.log('[EditProfileModal] No profileData available, fetching from API...');
      fetchCurrentProfile();
    }
  }, [visible, profileData, userData?.token]);

  const fetchCurrentProfile = async () => {
    try {
      setFetchingProfile(true);
      console.log('[EditProfileModal] Starting profile fetch...');

      const response = await fetch(`${API_BASE_URL}/api/students/profile`, {
        headers: {
          'Authorization': `Bearer ${userData.token}`
        }
      });

      const data = await response.json();
      console.log('[EditProfileModal] Profile fetch response:', data);

      if (data.success && data.profile) {
        console.log('[EditProfileModal] Setting form data with profile:', data.profile);
        setFormData({
          firstName: data.profile.firstName || userData.firstName || '',
          lastName: data.profile.lastName || userData.lastName || '',
          email: data.profile.email || userData.email || '',
          school: data.profile.school || '',
          bio: data.profile.bio || '',
          major: data.profile.major || '',
          graduationYear: data.profile.graduationYear?.toString() || '',
          gpa: data.profile.gpa?.toString() || '',
          achievements: data.profile.achievements || '',
          financialNeed: data.profile.financialNeed || '',
          fundingGoal: data.profile.fundingGoal?.toString() || '',
          phoneNumber: data.profile.phoneNumber || '',
          linkedinUrl: data.profile.linkedinUrl || '',
          personalStatement: data.profile.personalStatement || ''
        });
      } else {
        console.log('[EditProfileModal] No profile found, using basic user data');
        // If no profile exists, populate with basic user data
        setFormData(prev => ({
          ...prev,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || ''
        }));
      }
    } catch (error) {
      console.error('[EditProfileModal] Error fetching profile:', error);
    } finally {
      setFetchingProfile(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const required = ['firstName', 'lastName', 'email'];
    const missing = required.filter(field => !formData[field as keyof typeof formData].trim());

    if (missing.length > 0) {
      const alertMsg = `Please fill in required fields: ${missing.join(', ')}`;
      if (Platform.OS === 'web') {
        window.alert(alertMsg);
      } else {
        Alert.alert('Missing Information', alertMsg);
      }
      return false;
    }

    // Validate funding goal if provided
    if (formData.fundingGoal && (isNaN(parseFloat(formData.fundingGoal)) || parseFloat(formData.fundingGoal) <= 0)) {
      const alertMsg = 'Please enter a valid funding goal amount';
      if (Platform.OS === 'web') {
        window.alert(alertMsg);
      } else {
        Alert.alert('Invalid Amount', alertMsg);
      }
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Debug: Log the token being used
      console.log('[EditProfileModal] Submitting profile update with token:', userData.token);
      console.log('[EditProfileModal] Token length:', userData.token?.length);

      // Only include fields that are not empty or null
      const updateData: any = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (
          value !== '' &&
          value !== null &&
          value !== undefined
        ) {
          updateData[key] = value;
        }
      });

      // Convert numbers
      if (updateData.fundingGoal) updateData.fundingGoal = parseFloat(updateData.fundingGoal);
      if (updateData.graduationYear) updateData.graduationYear = parseInt(updateData.graduationYear);
      if (updateData.gpa) updateData.gpa = parseFloat(updateData.gpa);

      const response = await fetch(`${API_BASE_URL}/api/students/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userData.token}`
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();
      console.log('[EditProfileModal] Profile update response:', data);

      if (data.success) {
        const successMsg = 'Profile updated successfully!';
        if (Platform.OS === 'web') {
          window.alert(successMsg);
        } else {
          Alert.alert('Success', successMsg);
        }
        // Ensure token is preserved when updating profile
        onProfileUpdated({ ...data.profile, token: userData.token });
        onClose();
      } else {
        // Handle token-related errors
        if (data.code === 'INVALID_TOKEN' || data.code === 'TOKEN_EXPIRED') {
          const errorMsg = 'Your session has expired. Please log in again.';
          if (Platform.OS === 'web') {
            window.alert(errorMsg);
          } else {
            Alert.alert('Session Expired', errorMsg);
          }
          // Force logout by calling onProfileUpdated with null
          onProfileUpdated(null);
          onClose();
          return;
        }
        throw new Error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to update profile';
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetchingProfile) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit Profile</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="First Name"
                  value={formData.firstName}
                  onChangeText={(value) => handleInputChange('firstName', value)}
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChangeText={(value) => handleInputChange('lastName', value)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="email@example.com"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>School</Text>
              <TextInput
                style={styles.input}
                placeholder="University or College Name"
                value={formData.school}
                onChangeText={(value) => handleInputChange('school', value)}
              />
            </View>

            <Text style={styles.sectionTitle}>Academic Information</Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Major</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Computer Science"
                  value={formData.major}
                  onChangeText={(value) => handleInputChange('major', value)}
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Graduation Year</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 2027"
                  value={formData.graduationYear}
                  onChangeText={(value) => handleInputChange('graduationYear', value)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>GPA</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 3.7"
                value={formData.gpa}
                onChangeText={(value) => handleInputChange('gpa', value)}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={styles.sectionTitle}>Profile Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell donors about yourself and your goals..."
                value={formData.bio}
                onChangeText={(value) => handleInputChange('bio', value)}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Financial Need</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your financial situation..."
                value={formData.financialNeed}
                onChangeText={(value) => handleInputChange('financialNeed', value)}
                multiline
                numberOfLines={3}
                maxLength={300}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Funding Goal (USD)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 5000"
                value={formData.fundingGoal}
                onChangeText={(value) => handleInputChange('fundingGoal', value)}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Achievements & Awards</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="List academic achievements, scholarships, awards..."
                value={formData.achievements}
                onChangeText={(value) => handleInputChange('achievements', value)}
                multiline
                numberOfLines={3}
              />
            </View>

            <Text style={styles.sectionTitle}>Contact Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="(555) 123-4567"
                value={formData.phoneNumber}
                onChangeText={(value) => handleInputChange('phoneNumber', value)}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>LinkedIn Profile</Text>
              <TextInput
                style={styles.input}
                placeholder="https://linkedin.com/in/yourprofile"
                value={formData.linkedinUrl}
                onChangeText={(value) => handleInputChange('linkedinUrl', value)}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Personal Statement</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Share your story and goals..."
                value={formData.personalStatement}
                onChangeText={(value) => handleInputChange('personalStatement', value)}
                multiline
                numberOfLines={4}
                maxLength={800}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#6c757d',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6c757d',
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputGroup: {
    marginBottom: 20,
  },
  halfWidth: {
    width: '48%',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#34495e',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#2c3e50',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#3498db',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
});

export default EditProfileModal;