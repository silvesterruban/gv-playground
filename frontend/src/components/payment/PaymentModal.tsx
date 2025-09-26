// PaymentModal.tsx - Fixed version without syntax errors
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform
} from 'react-native';
import StripeCreditCardForm from './StripeCreditCardForm';
import { API_BASE_URL } from '../../config/api';

interface PaymentModalProps {
  visible: boolean;
  amount: number;
  email: string;
  registrationData?: any; // For registration payments
  donationData?: any; // Add separate prop for donation data
  userData?: any;
  onClose: () => void;
  onPaymentSuccess: (result: any) => void;
  onPaymentError: (error: string) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  amount,
  email,
  registrationData,
  donationData, // Add donation data parameter
  userData,
  onClose,
  onPaymentSuccess,
  onPaymentError
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | ''>('');
  const [showCreditCardForm, setShowCreditCardForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Determine if this is a registration payment or donation
  const isRegistrationPayment = !!registrationData;
  const isDonationPayment = !!donationData;

  console.log('🔍 PaymentModal Debug:', {
    registrationData: !!registrationData,
    donationData: !!donationData,
    isRegistrationPayment,
    isDonationPayment
  });

  const handlePaymentMethodSelect = (method: 'stripe' | 'paypal') => {
    console.log('🔍 Payment method selected:', method);
    Alert.alert('Debug', `Payment method selected: ${method}`);
    setPaymentMethod(method);

    if (method === 'stripe') {
      Alert.alert('Debug', 'About to show credit card form...');
      console.log('🔍 About to show credit card form');
      console.log('🔍 Current props:', {
        amount,
        email,
        isRegistrationPayment,
        isDonationPayment,
        donationData,
        registrationData
      });
      setShowCreditCardForm(true);
      Alert.alert('Debug', 'setShowCreditCardForm(true) called');
    } else if (method === 'paypal') {
      handlePayPalPayment();
    }
  };

  const handlePayPalPayment = async () => {
    setLoading(true);
    try {
      console.log('🔍 Processing PayPal payment...');

      // Use different endpoints for registration vs donation
      const endpoint = isRegistrationPayment
        ? '/api/registration-payment/paypal/create'
        : '/api/donations/paypal/create';

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth token if available
          ...(userData?.token && { 'Authorization': `Bearer ${userData.token}` })
        },
        body: JSON.stringify({
          amount,
          email,
          ...(isRegistrationPayment && { registrationData }),
          // For donations, include donation-specific data
          ...(!isRegistrationPayment && {
            paymentType: 'donation'
          })
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ PayPal payment successful');
        onPaymentSuccess(result);
      } else {
        throw new Error(result.message || 'PayPal payment failed');
      }
    } catch (error: any) {
      console.error('❌ PayPal payment error:', error);
      onPaymentError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStripePaymentSuccess = async (stripeResult: any) => {
    console.log('🔍 Stripe payment successful:', stripeResult);
    console.log('🔍 Registration data available:', registrationData);
    setShowCreditCardForm(false);
    onPaymentSuccess(stripeResult);
  };

  const handleStripePaymentError = (error: string) => {
    console.error('❌ Stripe payment error:', error);
    setShowCreditCardForm(false);
    onPaymentError(error);
  };

  const resetModal = () => {
    setPaymentMethod('');
    setShowCreditCardForm(false);
    setLoading(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {showCreditCardForm ? (
            <View style={styles.creditCardContainer}>
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    Alert.alert('Debug', 'Back button pressed');
                    setShowCreditCardForm(false);
                  }}
                >
                  <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.debugContainer}>
                <Text style={styles.debugText}>🔍 StripeCreditCardForm Props:</Text>
                <Text style={styles.debugText}>Amount: ${amount}</Text>
                <Text style={styles.debugText}>Email: {email}</Text>
                <Text style={styles.debugText}>IsRegistration: {isRegistrationPayment ? 'Yes' : 'No'}</Text>
                <Text style={styles.debugText}>HasDonationData: {!!donationData ? 'Yes' : 'No'}</Text>
                <Text style={styles.debugText}>AuthToken: {userData?.token ? 'Available' : 'Missing'}</Text>
              </View>

              <StripeCreditCardForm
                amount={amount}
                email={email}
                registrationData={isRegistrationPayment ? registrationData : null}
                isRegistrationPayment={isRegistrationPayment}
                authToken={userData?.token || null}
                donationData={isDonationPayment ? donationData : null}
                onPaymentSuccess={handleStripePaymentSuccess}
                onPaymentError={handleStripePaymentError}
              />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View style={styles.header}>
                <Text style={styles.title}>
                  {isRegistrationPayment ? 'Complete Registration' : 'Complete Your Donation'}
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.debugContainer}>
                <Text style={styles.debugText}>🔍 Debug Info:</Text>
                <Text style={styles.debugText}>Auth Token: {userData?.token ? '✅ Available' : '❌ Missing'}</Text>
                <Text style={styles.debugText}>User Data: {userData ? '✅ Available' : '❌ Missing'}</Text>
                <Text style={styles.debugText}>Payment Type: {isRegistrationPayment ? 'Registration' : 'Donation'}</Text>
                <Text style={styles.debugText}>Email: {email}</Text>
              </View>

              <View style={styles.paymentInfo}>
                <Text style={styles.paymentTitle}>
                  {isRegistrationPayment ? 'Registration Fee' : 'Donation Amount'}
                </Text>
                <Text style={styles.paymentAmount}>${amount.toFixed(2)}</Text>
                <Text style={styles.paymentDescription}>
                  {isRegistrationPayment
                    ? 'A one-time registration fee is required to complete your student account setup.'
                    : 'Your generous donation will help support a student\'s educational journey.'
                  }
                </Text>
              </View>

              <View style={styles.paymentMethodsContainer}>
                <Text style={styles.paymentMethodsTitle}>Select Payment Method</Text>

                {/* Debug Test Button */}
                <TouchableOpacity
                  style={styles.testButton}
                  onPress={() => {
                    Alert.alert('Debug', 'RED TEST BUTTON WORKS!');
                    console.log('🔍 Red test button works!');
                  }}
                >
                  <Text style={styles.testButtonText}>
                    🚨 TEST BUTTON - CLICK ME 🚨
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === 'stripe' && styles.paymentMethodSelected
                  ]}
                  onPress={() => {
                    console.log('🔍 Credit card button pressed!');
                    Alert.alert('Debug', 'Credit card button was pressed!');
                    handlePaymentMethodSelect('stripe');
                  }}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <View style={styles.paymentMethodContent}>
                    <Text style={styles.paymentMethodText}>💳 Credit/Debit Card</Text>
                    <Text style={styles.paymentMethodSubtext}>Visa, MasterCard, American Express</Text>
                  </View>
                  <Text style={styles.arrow}>→</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === 'paypal' && styles.paymentMethodSelected
                  ]}
                  onPress={() => handlePaymentMethodSelect('paypal')}
                  disabled={loading}
                >
                  <View style={styles.paymentMethodContent}>
                    <Text style={styles.paymentMethodText}>🅿️ PayPal</Text>
                    <Text style={styles.paymentMethodSubtext}>Pay with your PayPal account</Text>
                  </View>
                  {loading && paymentMethod === 'paypal' ? (
                    <ActivityIndicator color="#4285F4" size="small" />
                  ) : (
                    <Text style={styles.arrow}>→</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.securityInfo}>
                <Text style={styles.securityTitle}>🔒 Secure Payment</Text>
                <Text style={styles.securityText}>
                  Your payment information is encrypted and secure. We use industry-standard security measures to protect your data.
                </Text>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  By proceeding with payment, you agree to our Terms of Service and Privacy Policy.
                </Text>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1F38',
    borderRadius: 12,
    width: Platform.OS === 'web' ? 500 : '92%',
    maxWidth: 600,
    maxHeight: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  creditCardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
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
    color: '#fff',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  debugContainer: {
    backgroundColor: 'rgba(255, 255, 0, 0.1)',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 0, 0.3)',
  },
  debugText: {
    color: '#ffeb3b',
    fontSize: 12,
    marginBottom: 2,
  },
  paymentInfo: {
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(66, 133, 244, 0.3)',
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
    marginBottom: 8,
  },
  paymentAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  paymentDescription: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
  },
  paymentMethodsContainer: {
    marginBottom: 25,
  },
  paymentMethodsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  testButton: {
    backgroundColor: 'red',
    padding: 20,
    marginBottom: 10,
    borderRadius: 8,
  },
  testButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  paymentMethodButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
  },
  paymentMethodSelected: {
    borderColor: '#4285F4',
    backgroundColor: 'rgba(66, 133, 244, 0.15)',
  },
  paymentMethodContent: {
    flex: 1,
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  paymentMethodSubtext: {
    fontSize: 12,
    color: '#ccc',
  },
  arrow: {
    fontSize: 20,
    color: '#4285F4',
    fontWeight: 'bold',
  },
  securityInfo: {
    backgroundColor: 'rgba(52, 168, 83, 0.1)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(52, 168, 83, 0.3)',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34A853',
    marginBottom: 6,
  },
  securityText: {
    fontSize: 12,
    color: '#ccc',
    lineHeight: 16,
  },
  footer: {
    marginTop: 10,
  },
  footerText: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default PaymentModal;