import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Modal
} from 'react-native';
import { API_BASE_URL } from '../config/api';
import PaymentModal from './payment/PaymentModal';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  school: string;
  major?: string;
  fundingGoal: number;
  amountRaised: number;
  progressPercentage: number;
  profileUrl: string;
}

interface PublicDonationFormProps {
  visible: boolean;
  student: Student;
  onClose: () => void;
  onDonationComplete: (donation: any) => void;
}

const PublicDonationForm: React.FC<PublicDonationFormProps> = ({
  visible,
  student,
  onClose,
  onDonationComplete
}) => {
  // Form state
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [donorFirstName, setDonorFirstName] = useState('');
  const [donorLastName, setDonorLastName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorMessage, setDonorMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowPublicDisplay, setAllowPublicDisplay] = useState(true);

  // Processing state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // PaymentModal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [donationData, setDonationData] = useState<any>(null);

  // Predefined donation amounts
  const predefinedAmounts = [25, 50, 100, 250, 500];

  const formatCurrency = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  const validateForm = () => {
    if (!amount && !customAmount) {
      setError('Please select or enter an amount');
      return false;
    }

    const finalAmount = amount || customAmount;
    const num = parseFloat(finalAmount);
    if (isNaN(num) || num < 5) {
      setError('Minimum donation amount is $5');
      return false;
    }
    if (num > 10000) {
      setError('Maximum donation amount is $10,000');
      return false;
    }

    if (!isAnonymous) {
      if (!donorFirstName.trim()) {
        setError('Please enter your first name');
        return false;
      }
      if (!donorLastName.trim()) {
        setError('Please enter your last name');
        return false;
      }
      if (!donorEmail.trim()) {
        setError('Please enter your email address');
        return false;
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(donorEmail)) {
        setError('Please enter a valid email address');
        return false;
      }
    }

    setError('');
    return true;
  };

  const handleAmountSelection = (selectedAmount: number) => {
    setAmount(selectedAmount.toString());
    setCustomAmount('');
    setError('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setAmount('');
    setError('');
  };

  const processDonation = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const finalAmount = amount || customAmount;
      const amountInCents = Math.round(parseFloat(finalAmount) * 100);

      console.log('🔍 Creating public donation...');

      // Create donation record
      const donationRequest = {
        studentId: student.id,
        amount: parseFloat(finalAmount), // Backend expects dollars
        donationType: 'general',
        paymentMethod: 'stripe',
        donorEmail: isAnonymous ? 'anonymous@gradvillage.org' : donorEmail,
        donorFirstName: isAnonymous ? 'Anonymous' : donorFirstName,
        donorLastName: isAnonymous ? 'Donor' : donorLastName,
        isAnonymous,
        allowPublicDisplay,
        donorMessage,
        isPublicDonation: true // Flag to indicate this is from public profile
      };

      console.log('🔍 Public donation payload:', donationRequest);

      const createResponse = await fetch(`${API_BASE_URL}/api/donations/public/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(donationRequest)
      });

      console.log('🔍 Public donation create response status:', createResponse.status);
      const createResult = await createResponse.json();
      console.log('🔍 Public donation create result:', createResult);

      if (!createResult.success) {
        setError(createResult.message || 'Failed to create donation');
        setLoading(false);
        return;
      }

      const donationInfo = {
        ...createResult.donation,
        student: {
          firstName: student.firstName,
          lastName: student.lastName,
          school: student.school
        },
        amountInDollars: parseFloat(finalAmount)
      };

      setDonationData(donationInfo);
      setShowPaymentModal(true);
      setLoading(false);
    } catch (error) {
      console.error('❌ Public donation creation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to create donation. Please try again.');
      setLoading(false);
    }
  };

  // Handle payment success from PaymentModal
  const handlePaymentSuccess = async (paymentResult: any) => {
    console.log('🔍 Public payment successful:', paymentResult);

    try {
      setShowPaymentModal(false);

      const completedDonation = {
        ...donationData,
        status: 'completed',
        paymentId: paymentResult.paymentIntent?.id || `payment_${Date.now()}`,
        paymentMethod: paymentResult.paymentMethod?.card?.brand || 'visa',
        processedAt: new Date().toISOString()
      };

      console.log('✅ Public donation completed successfully:', completedDonation);
      onDonationComplete(completedDonation);
    } catch (error) {
      console.error('❌ Error completing public donation:', error);
      setError('Payment successful but there was an issue updating the donation. Please contact support.');
    }
  };

  const handlePaymentError = (error: string) => {
    console.error('❌ Public payment error:', error);
    setShowPaymentModal(false);
    setError(error);
  };

  const resetForm = () => {
    setAmount('');
    setCustomAmount('');
    setDonorFirstName('');
    setDonorLastName('');
    setDonorEmail('');
    setDonorMessage('');
    setIsAnonymous(false);
    setAllowPublicDisplay(true);
    setError('');
    setShowPaymentModal(false);
    setDonationData(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>✕ Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Support {student.firstName}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollContainer}>
          {/* Student Info */}
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{student.firstName} {student.lastName}</Text>
            <Text style={styles.studentSchool}>{student.school}</Text>
            {student.major && <Text style={styles.studentMajor}>{student.major}</Text>}
          </View>

          {/* Amount Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Amount</Text>
            <View style={styles.amountGrid}>
              {predefinedAmounts.map((predefinedAmount) => (
                <TouchableOpacity
                  key={predefinedAmount}
                  style={[
                    styles.amountButton,
                    (amount === predefinedAmount.toString()) && styles.amountButtonSelected
                  ]}
                  onPress={() => handleAmountSelection(predefinedAmount)}
                >
                  <Text style={[
                    styles.amountButtonText,
                    (amount === predefinedAmount.toString()) && styles.amountButtonTextSelected
                  ]}>
                    ${predefinedAmount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.customAmountContainer}>
              <Text style={styles.customAmountLabel}>Or enter custom amount:</Text>
              <TextInput
                style={styles.customAmountInput}
                placeholder="$25"
                placeholderTextColor="#888"
                value={customAmount}
                onChangeText={handleCustomAmountChange}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Donor Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Information</Text>
            
            <View style={styles.privacyOption}>
              <Text style={styles.privacyLabel}>Make donation anonymous</Text>
              <Switch
                value={isAnonymous}
                onValueChange={setIsAnonymous}
                trackColor={{ false: '#767577', true: '#34A853' }}
                thumbColor={isAnonymous ? '#fff' : '#f4f3f4'}
              />
            </View>

            {!isAnonymous && (
              <>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="First Name"
                    placeholderTextColor="#888"
                    value={donorFirstName}
                    onChangeText={setDonorFirstName}
                  />
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="Last Name"
                    placeholderTextColor="#888"
                    value={donorLastName}
                    onChangeText={setDonorLastName}
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#888"
                  value={donorEmail}
                  onChangeText={setDonorEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </>
            )}

            <TextInput
              style={styles.messageInput}
              placeholder="Send an encouraging message to {student.firstName}..."
              placeholderTextColor="#888"
              value={donorMessage}
              onChangeText={setDonorMessage}
              multiline
              numberOfLines={3}
            />

            <View style={styles.privacyOption}>
              <Text style={styles.privacyLabel}>Allow public display of donation</Text>
              <Switch
                value={allowPublicDisplay}
                onValueChange={setAllowPublicDisplay}
                trackColor={{ false: '#767577', true: '#34A853' }}
                thumbColor={allowPublicDisplay ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[
              styles.donateButton,
              !(amount || customAmount) && styles.donateButtonDisabled
            ]}
            onPress={processDonation}
            disabled={!(amount || customAmount) || loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.donateButtonText}>
                Donate ${(parseFloat(amount || customAmount || '0')).toFixed(2)}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* PaymentModal */}
        {showPaymentModal && (
          <PaymentModal
            visible={showPaymentModal}
            amount={donationData?.amountInDollars || parseFloat(amount || customAmount)}
            email={isAnonymous ? 'anonymous@gradvillage.org' : donorEmail}
            donationData={donationData}
            userData={null} // No user data for public donations
            onClose={() => setShowPaymentModal(false)}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
        )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    padding: 5,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSpacer: {
    width: 60,
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
  },
  studentInfo: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  studentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  studentSchool: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  studentMajor: {
    fontSize: 14,
    color: '#888',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  amountButton: {
    flex: 1,
    minWidth: '30%',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  amountButtonSelected: {
    borderColor: '#4285F4',
    backgroundColor: '#4285F4',
  },
  amountButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  amountButtonTextSelected: {
    color: 'white',
  },
  customAmountContainer: {
    marginTop: 10,
  },
  customAmountLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  customAmountInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: 'white',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: 'white',
    flex: 1,
  },
  halfInput: {
    flex: 0.48,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  privacyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  privacyLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 10,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  donateButton: {
    backgroundColor: '#4285F4',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  donateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  donateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PublicDonationForm; 