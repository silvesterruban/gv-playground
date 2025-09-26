// DonationForm.tsx - Fixed to show PaymentModal directly for quick donations
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import { API_BASE_URL } from '../../config/api';
import PaymentModal from '../payment/PaymentModal';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  school: string;
  major?: string;
  fundingGoal: number;
  amountRaised: number;
  progressPercentage: number;
}

interface DonationFormProps {
  student: Student;
  token: string;
  userData: any;
  onDonationComplete: (donation: any) => void;
  onCancel: () => void;
  preSelectedAmount?: number;
}

const DonationForm: React.FC<DonationFormProps> = ({
  student,
  token,
  userData,
  onDonationComplete,
  onCancel,
  preSelectedAmount
}) => {
  // Form state
  const [amount, setAmount] = useState(preSelectedAmount ? preSelectedAmount.toString() : '');
  const [customAmount, setCustomAmount] = useState('');
  const [donationType] = useState<'general'>('general');

  // Donor message and privacy
  const [donorMessage, setDonorMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowPublicDisplay, setAllowPublicDisplay] = useState(true);

  // Processing state
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'amount' | 'payment' | 'processing'>(
    preSelectedAmount ? 'payment' : 'amount'
  );
  const [error, setError] = useState('');

  // PaymentModal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [donationData, setDonationData] = useState<any>(null);

  // Predefined donation amounts
  const predefinedAmounts = [25, 50, 100, 250, 500];

  const formatCurrency = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  const validateAmount = (amountStr: string): number | null => {
    const num = parseFloat(amountStr);
    if (isNaN(num) || num < 5) {
      setError('Minimum donation amount is $5');
      return null;
    }
    if (num > 10000) {
      setError('Maximum donation amount is $10,000');
      return null;
    }
    setError('');
    return Math.round(num * 100); // Convert to cents
  };

  const handleAmountSelection = (selectedAmount: number) => {
    setAmount(selectedAmount.toString());
    setCustomAmount('');
    setError('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setAmount('');
    if (value) {
      validateAmount(value);
    } else {
      setError('');
    }
  };

  // FIXED: Skip amount step if preSelectedAmount is provided
  useEffect(() => {
    // Debug: Log userData on mount
    console.log('DonationForm userData on mount:', userData);
    if (preSelectedAmount) {
      console.log('🔍 Debug: Pre-selected amount detected:', preSelectedAmount);
      setAmount(preSelectedAmount.toString());
      // Skip directly to payment processing for quick donations
      proceedToPayment(preSelectedAmount);
    }
  }, [preSelectedAmount]);

  const proceedToPayment = (quickAmount?: number) => {
    const finalAmount = quickAmount ? quickAmount.toString() : (amount || customAmount);
    const validatedAmount = validateAmount(finalAmount);

    if (validatedAmount) {
      console.log('🔍 Debug: Proceeding to payment with amount:', validatedAmount);
      // Skip the "Ready to Donate" step and go directly to payment modal
      processDonation(validatedAmount);
    }
  };

  // FIXED: Simplified donation processing - use real API
  const processDonation = async (amountInCents?: number) => {
    setLoading(true);
    setError('');

    // Debug: Log userData at donation time
    console.log('DonationForm userData at donation:', userData);

    try {
      const finalAmount = amount || customAmount;
      const validatedAmount = amountInCents || validateAmount(finalAmount);

      if (!validatedAmount) {
        setError('Please enter a valid amount');
        setLoading(false);
        return;
      }

      console.log('🔍 Debug: Creating donation intent...');

      // FIX: Always include required fields for backend validation
      const donationRequest = {
        studentId: student.id,
        amount: (typeof validatedAmount === 'string' ? parseFloat(validatedAmount) : validatedAmount) / 100, // Convert cents to dollars for backend
        donationType,
        paymentMethod: 'stripe', // Default to Stripe for now
        isAnonymous,
        allowPublicDisplay,
        donorMessage,
      };

      console.log('🔍 Donation payload:', donationRequest);
      const createResponse = await fetch(`${API_BASE_URL}/api/donations/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(donationRequest)
      });
      console.log('🔍 Donation create response status:', createResponse.status);
      const createResult = await createResponse.json();
      console.log('🔍 Donation create result:', createResult);
      if (!createResult.success) {
        setError(createResult.message || (createResult.errors && createResult.errors.map((e: any) => e.msg).join(', ')) || 'Failed to create donation');
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
        amountInDollars: validatedAmount / 100
      };
      setDonationData(donationInfo);
      setShowPaymentModal(true);
      setLoading(false);
    } catch (error) {
      console.error('❌ Debug: Donation creation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to create donation. Please try again.');
      setLoading(false);
    }
  };

  // Handle payment success from PaymentModal
  const handlePaymentSuccess = async (paymentResult: any) => {
    console.log('🔍 Payment successful from PaymentModal:', paymentResult);

    try {
      setShowPaymentModal(false);

      // TEMPORARY: Mock successful donation completion
      const completedDonation = {
        ...donationData,
        status: 'completed',
        paymentId: paymentResult.paymentIntent?.id || `payment_${Date.now()}`,
        paymentMethod: paymentResult.paymentMethod?.card?.brand || 'visa',
        processedAt: new Date().toISOString()
      };

      console.log('✅ Debug: Donation completed successfully:', completedDonation);
      onDonationComplete(completedDonation);

      /*
      TODO: Replace with real API call:

      const processResponse = await fetch(`${API_BASE_URL}/api/donations/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          donationId: donationData.id,
          paymentResult: paymentResult,
          paymentMethodId: paymentResult.paymentMethod?.id || paymentResult.paymentMethodId
        })
      });

      const processResult = await processResponse.json();

      if (processResult.success) {
        onDonationComplete({
          ...processResult.donation,
          student: donationData.student
        });
      } else {
        throw new Error(processResult.error || 'Payment processing failed');
      }
      */

    } catch (error) {
      console.error('Payment completion error:', error);
      setError(error instanceof Error ? error.message : 'Payment completion failed');
    }
  };

  // Handle payment error from PaymentModal
  const handlePaymentError = (error: string) => {
    console.error('❌ Payment error from PaymentModal:', error);
    setShowPaymentModal(false);
    setError(`Payment failed: ${error}`);
  };

  const renderAmountStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Choose Donation Amount</Text>

      {/* Student info summary */}
      <View style={styles.studentSummary}>
        <Text style={styles.studentName}>
          {student.firstName} {student.lastName}
        </Text>
        <Text style={styles.studentSchool}>{student.school}</Text>
        {student.major && <Text style={styles.studentMajor}>{student.major}</Text>}
        <Text style={styles.fundingProgress}>
          {formatCurrency(student.amountRaised)} raised of {formatCurrency(student.fundingGoal)} goal
        </Text>
        <Text style={styles.progressPercentage}>
          {student.progressPercentage}% funded
        </Text>
      </View>

      {/* Predefined amounts */}
      <Text style={styles.amountSectionTitle}>Quick Amounts</Text>
      <View style={styles.amountGrid}>
        {predefinedAmounts.map((presetAmount) => (
          <TouchableOpacity
            key={presetAmount}
            style={[
              styles.amountButton,
              amount === presetAmount.toString() && styles.amountButtonActive
            ]}
            onPress={() => handleAmountSelection(presetAmount)}
          >
            <Text style={[
              styles.amountButtonText,
              amount === presetAmount.toString() && styles.amountButtonActiveText
            ]}>
              ${presetAmount}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom amount */}
      <Text style={styles.amountSectionTitle}>Custom Amount</Text>
      <TextInput
        style={styles.customAmountInput}
        placeholder="Enter amount (minimum $5)"
        placeholderTextColor="#888"
        value={customAmount}
        onChangeText={handleCustomAmountChange}
        keyboardType="numeric"
      />

      {/* Optional message */}
      <Text style={styles.amountSectionTitle}>Message (Optional)</Text>
      <TextInput
        style={styles.messageInput}
        placeholder="Send an encouraging message to the student..."
        placeholderTextColor="#888"
        value={donorMessage}
        onChangeText={setDonorMessage}
        multiline
        numberOfLines={3}
      />

      {/* Privacy settings */}
      <View style={styles.privacyContainer}>
        <View style={styles.privacyOption}>
          <Text style={styles.privacyLabel}>Make donation anonymous</Text>
          <Switch
            value={isAnonymous}
            onValueChange={setIsAnonymous}
            trackColor={{ false: '#767577', true: '#34A853' }}
            thumbColor={isAnonymous ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.privacyOption}>
          <Text style={styles.privacyLabel}>Allow public display</Text>
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
          styles.proceedButton,
          !(amount || customAmount) && styles.proceedButtonDisabled
        ]}
        onPress={() => proceedToPayment()}
        disabled={!(amount || customAmount)}
      >
        <Text style={styles.proceedButtonText}>Continue to Payment</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPaymentStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Ready to Donate</Text>

      {/* Donation summary */}
      <View style={styles.donationSummary}>
        <Text style={styles.summaryTitle}>Donation Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Amount:</Text>
          <Text style={styles.summaryValue}>
            ${(parseFloat(amount || customAmount)).toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>To:</Text>
          <Text style={styles.summaryValue}>
            {student.firstName} {student.lastName}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>School:</Text>
          <Text style={styles.summaryValue}>{student.school}</Text>
        </View>
        {donorMessage && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Message:</Text>
            <Text style={styles.summaryValue}>{donorMessage}</Text>
          </View>
        )}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.proceedButton, styles.backButton]}
          onPress={() => setStep('amount')}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.proceedButton,
            loading && styles.proceedButtonDisabled
          ]}
          onPress={() => processDonation()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.proceedButtonText}>
              Donate ${(parseFloat(amount || customAmount)).toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // FIXED: Don't render the form UI if we're showing payment modal for quick donations
  if (preSelectedAmount && showPaymentModal) {
    return (
      <PaymentModal
        visible={showPaymentModal}
        amount={donationData?.amountInDollars || preSelectedAmount}
        email={userData.email}
        donationData={donationData} // Pass as donationData prop
        userData={userData}
        onClose={() => {
          setShowPaymentModal(false);
          onCancel(); // Go back to student browser
        }}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
      />
    );
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>✕ Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Make a Donation</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollContainer}>
          {step === 'amount' && renderAmountStep()}
          {step === 'payment' && renderPaymentStep()}
        </ScrollView>
      </View>

      {/* PaymentModal for regular donation flow */}
      {showPaymentModal && !preSelectedAmount && (
        <PaymentModal
          visible={showPaymentModal}
          amount={donationData?.amountInDollars || parseFloat(amount || customAmount)}
          email={userData.email}
          donationData={donationData} // Pass as donationData prop
          userData={userData}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121824',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: 'rgba(25, 26, 45, 0.9)',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
  },
  cancelButtonText: {
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
    width: 80,
  },
  scrollContainer: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  studentSummary: {
    backgroundColor: 'rgba(25, 26, 45, 0.8)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  studentSchool: {
    fontSize: 14,
    color: '#a3b3ff',
    marginTop: 4,
  },
  studentMajor: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  fundingProgress: {
    fontSize: 14,
    color: '#34A853',
    marginTop: 8,
    fontWeight: 'bold',
  },
  progressPercentage: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  amountSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    marginTop: 16,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  amountButton: {
    width: '30%',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountButtonActive: {
    borderColor: '#34A853',
    backgroundColor: 'rgba(52, 168, 83, 0.2)',
  },
  amountButtonText: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  amountButtonActiveText: {
    color: '#34A853',
  },
  customAmountInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  messageInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  privacyContainer: {
    marginBottom: 20,
  },
  privacyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  privacyLabel: {
    color: '#ccc',
    fontSize: 16,
    flex: 1,
  },
  donationSummary: {
    backgroundColor: 'rgba(25, 26, 45, 0.8)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    color: '#888',
    fontSize: 14,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  proceedButton: {
    backgroundColor: '#34A853',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  proceedButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 8,
  },
});

export default DonationForm;