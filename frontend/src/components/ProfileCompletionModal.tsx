import React, { useState } from 'react';
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

interface ProfileCompletionModalProps {
  visible: boolean;
  onClose: () => void;
  userData: any;
  onProfileUpdated: (updatedProfile: any) => void;
}

const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({
  visible,
  onClose,
  userData,
  onProfileUpdated
}) => {
  const [formData, setFormData] = useState({
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const required = ['bio', 'major', 'graduationYear', 'financialNeed', 'fundingGoal'];
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

    // Validate funding goal is a number
    const goal = parseFloat(formData.fundingGoal);
    if (isNaN(goal) || goal <= 0) {
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
      console.log('[ProfileCompletionModal] Submitting profile completion with token:', userData.token);
      console.log('[ProfileCompletionModal] Token length:', userData.token?.length);

      const response = await fetch(`${API_BASE_URL}/api/students/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userData.token}`
        },
        body: JSON.stringify({
          ...formData,
          fundingGoal: parseFloat(formData.fundingGoal),
          graduationYear: parseInt(formData.graduationYear) || new Date().getFullYear() + 4
        })
      });

      const data = await response.json();
      console.log('[ProfileCompletionModal] Profile completion response:', data);

      if (data.success) {
        const successMsg = 'Profile completed successfully!';
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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Personal Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio *</Text>
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
              <Text style={styles.label}>Major *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Computer Science"
                value={formData.major}
                onChangeText={(value) => handleInputChange('major', value)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Expected Graduation Year *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 2027"
                value={formData.graduationYear}
                onChangeText={(value) => handleInputChange('graduationYear', value)}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>GPA (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 3.7"
                value={formData.gpa}
                onChangeText={(value) => handleInputChange('gpa', value)}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={styles.sectionTitle}>Financial Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Financial Need Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your financial situation and why you need support..."
                value={formData.financialNeed}
                onChangeText={(value) => handleInputChange('financialNeed', value)}
                multiline
                numberOfLines={3}
                maxLength={300}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Funding Goal *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 5000"
                value={formData.fundingGoal}
                onChangeText={(value) => handleInputChange('fundingGoal', value)}
                keyboardType="numeric"
              />
              <Text style={styles.helperText}>Amount in USD you're hoping to raise</Text>
            </View>

            <Text style={styles.sectionTitle}>Additional Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Achievements & Awards</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="List any academic achievements, scholarships, awards..."
                value={formData.achievements}
                onChangeText={(value) => handleInputChange('achievements', value)}
                multiline
                numberOfLines={3}
              />
            </View>

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
              <Text style={styles.label}>LinkedIn Profile (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://linkedin.com/in/yourprofile"
                value={formData.linkedinUrl}
                onChangeText={(value) => handleInputChange('linkedinUrl', value)}
                keyboardType="url"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Personal Statement</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Share your story, goals, and how donations will help you succeed..."
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
              {loading ? 'Saving...' : 'Complete Profile'}
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
  inputGroup: {
    marginBottom: 20,
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
  helperText: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 5,
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

export default ProfileCompletionModal;