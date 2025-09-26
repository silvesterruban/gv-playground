// AuthModal.tsx - Fixed with proper registration data flow
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { API_BASE_URL } from '../../config/api';
import PaymentModal from '../payment/PaymentModal'; // Import the new PaymentModal

interface AuthModalProps {
  visible: boolean;
  initialAuthType?: 'login' | 'signup';
  initialUserType?: 'student' | 'donor' | 'admin';
  onClose: () => void;
  onSuccess?: (userType: string, authType: string, userData: any) => void;
}

const AuthModal: React.FC<AuthModalProps> = (props) => {
  const {
    visible,
    initialAuthType,
    initialUserType,
    onClose,
    onSuccess
  } = props;

  console.log("🔍 Debug: AuthModal rendered with props:", JSON.stringify(props));

  const safeInitialAuthType = initialAuthType || 'login';
  const safeInitialUserType = initialUserType || 'student';

  // Form state
  const [authType, setAuthType] = useState<'login' | 'signup'>(safeInitialAuthType);
  const [userType, setUserType] = useState<'student' | 'donor' | 'admin'>(safeInitialUserType);

  // Update state when props change
  useEffect(() => {
    console.log('🔍 Debug: AuthModal useEffect triggered');
    if (initialAuthType) {
      setAuthType(initialAuthType);
    }
    if (initialUserType) {
      setUserType(initialUserType);
    }
    resetForm();
  }, [initialAuthType, initialUserType]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [school, setSchool] = useState('');
  const [major, setMajor] = useState('');
  const [phone, setPhone] = useState('');

  // Registration state
  const [verificationStep, setVerificationStep] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [registrationData, setRegistrationData] = useState<any>(null);

  // Payment state - UPDATED to use PaymentModal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount] = useState(25.00); // Registration fee

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const otpInputRefs: React.RefObject<TextInput | null>[] = Array.from({ length: 6 }, () => useRef<TextInput | null>(null));

  // Email validation
  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Password validation
  const validatePassword = (password: string): boolean => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;
    if (!passwordRegex.test(password)) {
      setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setSchool('');
    setMajor('');
    setPhone('');
    setError('');
    setSuccessMessage('');
    setVerificationStep(false);
    setOtpCode(['', '', '', '', '', '']);
    setShowPaymentModal(false);
    setRegistrationData(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🔍 Debug: Starting form submission');

      if (authType === 'signup' && userType === 'student') {
        console.log('🔍 Debug: Processing student registration');

        // Validate required fields
        if (!email || !password || !confirmPassword || !firstName || !lastName || !school) {
          setError('Please fill in all required fields');
          setLoading(false);
          return;
        }

        if (!validateEmail(email)) {
          setError('Please enter a valid email address');
          setLoading(false);
          return;
        }

        if (!validatePassword(password)) {
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        console.log('🔍 Debug: Making student registration API call');
        const response = await fetch(`${API_BASE_URL}/api/auth/register/student`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            firstName,
            lastName,
            school,
            major: major || undefined,
          }),
        });

        const data = await response.json();
        console.log('🔍 Debug: Student registration response:', data);

        if (!response.ok) {
          console.error('❌ Debug: Student registration failed:', data);
          if (data.errors && Array.isArray(data.errors)) {
            const errorMessage = data.errors.map((err: any) => `${err.field}: ${err.message}`).join(', ');
            throw new Error(errorMessage);
          }
          throw new Error(data.message || 'Registration failed');
        }

        if (data.success) {
          console.log('✅ Debug: Student registration successful, requires payment:', data.requiresPayment);
          setSuccessMessage(data.message);

          if (data.requiresPayment) {
            // FIXED: Create complete registration data from form fields
            const completeRegistrationData = {
              email,
              firstName,
              lastName,
              school, // ← This is the key field that was missing!
              major: major || '',
              password,
              // Include any backend data as well
              ...data.registrationData
            };

            console.log('🔍 Debug: Setting complete registration data:', completeRegistrationData);
            setRegistrationData(completeRegistrationData);
            setVerificationStep(true);
            console.log('🔍 Debug: Moving to verification step');
          } else {
            if (onSuccess) {
              onSuccess(userType, authType, {
                token: data.token,
                refreshToken: data.refreshToken,
                ...data.user
              });
            }
            setTimeout(() => {
              onClose();
              resetForm();
            }, 2000);
          }
        } else {
          throw new Error(data.message || 'Registration failed');
        }

      } else if (authType === 'signup' && userType === 'donor') {
        console.log('🔍 Debug: Processing donor registration');

        // Validate required fields for donor
        if (!email || !password || !confirmPassword || !firstName || !lastName) {
          setError('Please fill in all required fields');
          setLoading(false);
          return;
        }

        if (!validateEmail(email)) {
          setError('Please enter a valid email address');
          setLoading(false);
          return;
        }

        if (!validatePassword(password)) {
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        console.log('🔍 Debug: Making donor registration API call');
        const response = await fetch(`${API_BASE_URL}/api/donors/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            firstName,
            lastName,
            phone: phone || undefined,
          }),
        });

        const data = await response.json();
        console.log('🔍 Debug: Donor registration response:', data);

        if (!response.ok) {
          console.error('❌ Debug: Donor registration failed:', data);
          if (data.errors && Array.isArray(data.errors)) {
            const errorMessage = data.errors.map((err: any) => `${err.field}: ${err.message}`).join(', ');
            throw new Error(errorMessage);
          }
          throw new Error(data.message || 'Registration failed');
        }

        if (data.success) {
          console.log('✅ Debug: Donor registration successful');
          setSuccessMessage('Donor account created successfully!');

          if (onSuccess) {
            onSuccess(userType, authType, {
              token: data.data.token,
              ...data.data.donor
            });
          }

          setTimeout(() => {
            onClose();
            resetForm();
          }, 2000);
        } else {
          throw new Error(data.message || 'Donor registration failed');
        }

      } else if (authType === 'login') {
        console.log('🔍 Debug: Processing login for userType:', userType);

        if (!email || !password) {
          setError('Please enter your email and password');
          setLoading(false);
          return;
        }

        const loginEndpoint = userType === 'admin'
          ? `${API_BASE_URL}/api/auth/login/admin`
          : `${API_BASE_URL}/api/auth/login`;

        console.log('🔍 Debug: Using login endpoint:', loginEndpoint);
        console.log('🔍 Debug: Login request body:', { email, password, userType });

        const response = await fetch(loginEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            userType
          }),
        });

        const data = await response.json();
        console.log('🔍 Debug: Login response status:', response.status);
        console.log('🔍 Debug: Login response:', data);

        if (!response.ok) {
          console.error('❌ Debug: Login failed with status:', response.status);
          console.error('❌ Debug: Login error data:', data);
          throw new Error(data.message || 'Login failed');
        }

        if (data.success) {
          setSuccessMessage('Login successful!');
          if (onSuccess) {
            onSuccess(userType, authType, {
              token: data.token || data.data?.token,
              refreshToken: data.refreshToken || data.data?.refreshToken,
              ...(data.user || data.data?.user)
            });
          }
          setTimeout(() => {
            onClose();
            resetForm();
          }, 1000);
        } else {
          throw new Error(data.message || 'Login failed');
        }
      }
    } catch (error: unknown) {
      console.error('❌ Debug: Form submission error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP verification
  const handleVerifyOtp = async () => {
    console.log('🔍 Debug: handleVerifyOtp called');
    setLoading(true);
    setError('');

    try {
      const otpString = otpCode.join('');
      console.log('🔍 Debug: OTP code:', otpString);

      if (otpString.length !== 6) {
        throw new Error('Please enter a valid 6-digit code');
      }

      console.log('🔍 Debug: Verifying OTP...');
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp: otpString,
          userType
        }),
      });

      const responseText = await response.text();
      console.log('🔍 Debug: Raw verification response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('🔍 Debug: Parsed verification response:', data);
      } catch (parseError) {
        console.error('❌ Debug: Failed to parse verification response:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      console.log('✅ Debug: Email verified successfully');

      if (data.requiresPayment) {
        console.log('🔍 Debug: Payment required, showing payment modal');
        console.log('🔍 Debug: Available registration data for payment:', registrationData);
        console.log('🔍 Debug: Auth token received:', !!data.token);
        
        // Store the auth token in registrationData for payment
        if (data.token) {
          const updatedRegistrationData = {
            ...registrationData,
            token: data.token
          };
          setRegistrationData(updatedRegistrationData);
          console.log('🔍 Debug: Updated registration data with token');
        }
        
        setSuccessMessage('Email verified successfully! Please complete payment to finish registration.');
        setVerificationStep(false);
        setShowPaymentModal(true); // Show the new PaymentModal
        setLoading(false);
      } else {
        console.log('🔍 Debug: No payment required, completing registration');
        setSuccessMessage('Email verified successfully!');

        setTimeout(() => {
          console.log('🔍 Debug: Closing modal after successful verification');
          onClose();
          resetForm();
        }, 1500);
      }
    } catch (error: unknown) {
      console.error('❌ Debug: Verification error:', error);
      setLoading(false);
      setError(error instanceof Error ? error.message : 'Verification failed. Please try again.');
    }
  };

  const handleResendVerification = async () => {
    console.log('🔍 Debug: handleResendVerification called');
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          userType
        }),
      });

      const responseText = await response.text();
      console.log('🔍 Debug: Raw response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('🔍 Debug: Parsed response data:', data);
      } catch (parseError) {
        console.error('❌ Debug: Failed to parse response as JSON:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Could not resend code');
      }

      console.log('✅ Debug: Verification code resent successfully');
      setSuccessMessage('Verification code resent!');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error: unknown) {
      console.error('❌ Debug: Resend verification error:', error);
      setError(error instanceof Error ? error.message : 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // UPDATED: Handle payment success from PaymentModal
  const handlePaymentSuccess = async (paymentResult: any) => {
    console.log('🔍 Debug: Payment successful from PaymentModal:', paymentResult);

    try {
      setShowPaymentModal(false);
      setSuccessMessage('Payment completed successfully! Registration complete!');

      // UPDATED: Use the user data and token from the payment result directly
      // The payment endpoint now handles registration completion
      if (paymentResult.user && paymentResult.token) {
        console.log('✅ Debug: Registration completed via payment endpoint');

        // Call success callback with user data from payment result
        if (onSuccess) {
          console.log('🔍 Debug: Calling onSuccess with payment result user data');
          // Combine user data with token for proper authentication
          const userDataWithToken = {
            ...paymentResult.user,
            token: paymentResult.token
          };
          console.log('🔍 Debug: User data with token:', userDataWithToken);
          console.log('🔍 Debug: Token present:', !!userDataWithToken.token);
          console.log('🔍 Debug: User ID present:', !!userDataWithToken.id);
          onSuccess(userType, authType, userDataWithToken);
        }

        // Close the modal after delay
        setTimeout(() => {
          onClose();
          resetForm();
        }, 2000);
      } else {
        // Fallback: try the old completion endpoint
        if (registrationData) {
          console.log('🔍 Debug: Completing registration with backend fallback');
          const completeResponse = await fetch(`${API_BASE_URL}/api/auth/complete-registration`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              registrationData,
              paymentResult
            }),
          });

          const completeData = await completeResponse.json();
          console.log('🔍 Debug: Complete registration response:', completeData);

          if (completeResponse.ok && completeData.success) {
            console.log('✅ Debug: Registration completed successfully');

            if (onSuccess) {
              const userDataWithToken = {
                ...completeData.user,
                token: completeData.token
              };
              console.log('🔍 Debug: Calling onSuccess with user data:', userDataWithToken);
              onSuccess(userType, authType, userDataWithToken);
            }

            setTimeout(() => {
              onClose();
              resetForm();
            }, 2000);
          } else {
            throw new Error(completeData.message || 'Failed to complete registration');
          }
        } else {
          throw new Error('Registration data not found');
        }
      }
    } catch (error: unknown) {
      console.error('❌ Debug: Payment completion error:', error);
      setError(error instanceof Error ? error.message : 'Failed to complete registration');
    }
  };

  // UPDATED: Handle payment error from PaymentModal
  const handlePaymentError = (error: string) => {
    console.error('❌ Debug: Payment error from PaymentModal:', error);
    setShowPaymentModal(false);
    setError(`Payment failed: ${error}`);
  };

  const handleOtpChange = (index: number, value: string) => {
    console.log('🔍 Debug: OTP input changed:', { index, value });
    if (value.length > 1) {
      if (value.length === 6 && /^\d+$/.test(value)) {
        console.log('🔍 Debug: Pasting full OTP code');
        const digits = value.split('');
        setOtpCode(digits);
        otpInputRefs[5].current?.focus();
      }
      return;
    }

    if (value && !/^\d$/.test(value)) {
      console.log('❌ Debug: Invalid OTP character entered');
      return;
    }

    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);
    console.log('🔍 Debug: Updated OTP state:', newOtp);

    if (value && index < 5) {
      // Move to next input
      otpInputRefs[index + 1].current?.focus();
    } else if (!value && index > 0) {
      // Move to previous input on delete
      otpInputRefs[index - 1].current?.focus();
    }
  };

  const renderOtpVerification = () => {
    if (!verificationStep) return null;

    return (
      <View style={styles.verificationContainer}>
        <Text style={styles.verificationTitle}>Email Verification</Text>
        <Text style={styles.verificationText}>
          Please enter the 6-digit code sent to {email}
        </Text>

        <View style={styles.otpContainer}>
          {otpCode.map((digit, index) => (
            <TextInput
              key={index}
              ref={otpInputRefs[index]}
              style={styles.otpInput}
              value={digit}
              onChangeText={(value) => handleOtpChange(index, value)}
              keyboardType="number-pad"
              maxLength={1}
              returnKeyType={index === 5 ? 'done' : 'next'}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Backspace' && !otpCode[index] && index > 0) {
                  otpInputRefs[index - 1].current?.focus();
                }
              }}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            loading ? styles.submitButtonDisabled : null,
            userType === 'student' ? styles.studentButton :
            userType === 'donor' ? styles.donorButton : styles.adminButton
          ]}
          onPress={handleVerifyOtp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.resendLink} onPress={handleResendVerification}>
          <Text style={styles.resendText}>Didn't receive a code? Resend</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Decide which content to show based on current step
  const renderContent = () => {
    console.log('🔍 Debug: renderContent - verificationStep:', verificationStep, 'showPaymentModal:', showPaymentModal);

    if (verificationStep) {
      console.log('🔍 Debug: Rendering OTP verification');
      return renderOtpVerification();
    } else {
      console.log('🔍 Debug: Rendering main form');
      return (
        <>
          <Text style={styles.modalTitle}>
            {authType === 'login' ? 'Login' : 'Sign Up'} as {userType ? userType.charAt(0).toUpperCase() + userType.slice(1) : ''}
          </Text>

          {error ? (
            <View style={styles.messageContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.messageContainer}>
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {authType === 'signup' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="First Name"
                placeholderTextColor="#888"
                value={firstName}
                onChangeText={setFirstName}
              />
              <TextInput
                style={styles.input}
                placeholder="Last Name"
                placeholderTextColor="#888"
                value={lastName}
                onChangeText={setLastName}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#888"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />

              {/* Student-specific fields */}
              {userType === 'student' && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="School"
                    placeholderTextColor="#888"
                    value={school}
                    onChangeText={setSchool}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Major (optional)"
                    placeholderTextColor="#888"
                    value={major}
                    onChangeText={setMajor}
                  />
                </>
              )}

              {/* Donor-specific fields */}
              {userType === 'donor' && (
                <TextInput
                  style={styles.input}
                  placeholder="Phone (optional)"
                  placeholderTextColor="#888"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              )}
            </>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              loading ? styles.submitButtonDisabled : null,
              userType === 'student' ? styles.studentButton :
              userType === 'donor' ? styles.donorButton : styles.adminButton
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {authType === 'login' ? 'Login' : 'Sign Up'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchAuthType}
            onPress={() => {
              setAuthType(authType === 'login' ? 'signup' : 'login');
              setError('');
              setSuccessMessage('');
            }}
          >
            <Text style={styles.switchAuthTypeText}>
              {authType === 'login'
                ? `Don't have an account? Sign Up`
                : 'Already have an account? Login'}
            </Text>
          </TouchableOpacity>
        </>
      );
    }
  };

  return (
    <>
      {/* Main Auth Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={visible && !showPaymentModal}
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContainer}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.modalContent}>
              {renderContent()}

              {!loading && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    onClose();
                    resetForm();
                  }}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Payment Modal - UPDATED to use new PaymentModal component */}
      <PaymentModal
        visible={showPaymentModal}
        amount={paymentAmount}
        email={email}
        registrationData={registrationData}
        userData={registrationData} // Pass registration data as userData (contains token)
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
      />
    </>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 40,
  },
  modalContent: {
    backgroundColor: '#1E1F38',
    borderRadius: 10,
    padding: 25,
    width: Platform.OS === 'web' ? 450 : '90%',
    maxWidth: 500,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  messageContainer: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
  },
  successText: {
    color: '#4BB543',
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    color: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  submitButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 15,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  studentButton: {
    backgroundColor: '#4285F4',
  },
  donorButton: {
    backgroundColor: '#34A853',
  },
  adminButton: {
    backgroundColor: '#9C27B0',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  switchAuthType: {
    marginVertical: 15,
    alignItems: 'center',
  },
  switchAuthTypeText: {
    color: '#a3b3ff',
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  // OTP verification styles
  verificationContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  verificationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  verificationText: {
    color: '#a3b3ff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    color: 'white',
    fontSize: 22,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  resendLink: {
    marginTop: 20,
  },
  resendText: {
    color: '#a3b3ff',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default AuthModal;







// // AuthModal.tsx - Updated with PaymentModal integration
// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Modal,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
//   ActivityIndicator,
//   Alert
// } from 'react-native';
// import { API_BASE_URL } from '../../config/api';
// import PaymentModal from '../payment/PaymentModal'; // Import the new PaymentModal
//
// interface AuthModalProps {
//   visible: boolean;
//   initialAuthType?: 'login' | 'signup';
//   initialUserType?: 'student' | 'donor' | 'admin';
//   onClose: () => void;
//   onSuccess?: (userType: string, authType: string, userData: any) => void;
// }
//
// const AuthModal: React.FC<AuthModalProps> = (props) => {
//   const {
//     visible,
//     initialAuthType,
//     initialUserType,
//     onClose,
//     onSuccess
//   } = props;
//
//   console.log("🔍 Debug: AuthModal rendered with props:", JSON.stringify(props));
//
//   const safeInitialAuthType = initialAuthType || 'login';
//   const safeInitialUserType = initialUserType || 'student';
//
//   // Form state
//   const [authType, setAuthType] = useState<'login' | 'signup'>(safeInitialAuthType);
//   const [userType, setUserType] = useState<'student' | 'donor' | 'admin'>(safeInitialUserType);
//
//   // Update state when props change
//   useEffect(() => {
//     console.log('🔍 Debug: AuthModal useEffect triggered');
//     if (initialAuthType) {
//       setAuthType(initialAuthType);
//     }
//     if (initialUserType) {
//       setUserType(initialUserType);
//     }
//     resetForm();
//   }, [initialAuthType, initialUserType]);
//
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [confirmPassword, setConfirmPassword] = useState('');
//   const [firstName, setFirstName] = useState('');
//   const [lastName, setLastName] = useState('');
//   const [school, setSchool] = useState('');
//   const [major, setMajor] = useState('');
//   const [phone, setPhone] = useState('');
//
//   // Registration state
//   const [verificationStep, setVerificationStep] = useState(false);
//   const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
//   const [registrationData, setRegistrationData] = useState<any>(null);
//
//   // Payment state - UPDATED to use PaymentModal
//   const [showPaymentModal, setShowPaymentModal] = useState(false);
//   const [paymentAmount] = useState(25.00); // Registration fee
//
//   // UI state
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [successMessage, setSuccessMessage] = useState('');
//
//   const otpInputRefs: React.RefObject<TextInput | null>[] = Array.from({ length: 6 }, () => useRef<TextInput | null>(null));
//
//   // Email validation
//   const validateEmail = (email: string): boolean => {
//     const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     return re.test(email);
//   };
//
//   // Password validation
//   const validatePassword = (password: string): boolean => {
//     if (password.length < 8) {
//       setError('Password must be at least 8 characters long');
//       return false;
//     }
//
//     const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;
//     if (!passwordRegex.test(password)) {
//       setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
//       return false;
//     }
//     return true;
//   };
//
//   const resetForm = () => {
//     setEmail('');
//     setPassword('');
//     setConfirmPassword('');
//     setFirstName('');
//     setLastName('');
//     setSchool('');
//     setMajor('');
//     setPhone('');
//     setError('');
//     setSuccessMessage('');
//     setVerificationStep(false);
//     setOtpCode(['', '', '', '', '', '']);
//     setShowPaymentModal(false);
//     setRegistrationData(null);
//   };
//
//   const handleSubmit = async () => {
//     setLoading(true);
//     setError('');
//
//     try {
//       console.log('🔍 Debug: Starting form submission');
//
//       if (authType === 'signup' && userType === 'student') {
//         console.log('🔍 Debug: Processing student registration');
//
//         // Validate required fields
//         if (!email || !password || !confirmPassword || !firstName || !lastName || !school) {
//           setError('Please fill in all required fields');
//           setLoading(false);
//           return;
//         }
//
//         if (!validateEmail(email)) {
//           setError('Please enter a valid email address');
//           setLoading(false);
//           return;
//         }
//
//         if (!validatePassword(password)) {
//           setLoading(false);
//           return;
//         }
//
//         if (password !== confirmPassword) {
//           setError('Passwords do not match');
//           setLoading(false);
//           return;
//         }
//
//         console.log('🔍 Debug: Making student registration API call');
//         const response = await fetch(`${API_BASE_URL}/api/auth/register/student`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             email,
//             password,
//             firstName,
//             lastName,
//             school,
//             major: major || undefined,
//           }),
//         });
//
//         const data = await response.json();
//         console.log('🔍 Debug: Student registration response:', data);
//
//         if (!response.ok) {
//           console.error('❌ Debug: Student registration failed:', data);
//           if (data.errors && Array.isArray(data.errors)) {
//             const errorMessage = data.errors.map((err: any) => `${err.field}: ${err.message}`).join(', ');
//             throw new Error(errorMessage);
//           }
//           throw new Error(data.message || 'Registration failed');
//         }
//
//         if (data.success) {
//           console.log('✅ Debug: Student registration successful, requires payment:', data.requiresPayment);
//           setSuccessMessage(data.message);
//
//           if (data.requiresPayment) {
//             setRegistrationData(data.registrationData);
//             setVerificationStep(true);
//             console.log('🔍 Debug: Moving to verification step');
//           } else {
//             if (onSuccess) {
//               onSuccess(userType, authType, {
//                 token: data.token,
//                 refreshToken: data.refreshToken,
//                 ...data.user
//               });
//             }
//             setTimeout(() => {
//               onClose();
//               resetForm();
//             }, 2000);
//           }
//         } else {
//           throw new Error(data.message || 'Registration failed');
//         }
//
//       } else if (authType === 'signup' && userType === 'donor') {
//         console.log('🔍 Debug: Processing donor registration');
//
//         // Validate required fields for donor
//         if (!email || !password || !confirmPassword || !firstName || !lastName) {
//           setError('Please fill in all required fields');
//           setLoading(false);
//           return;
//         }
//
//         if (!validateEmail(email)) {
//           setError('Please enter a valid email address');
//           setLoading(false);
//           return;
//         }
//
//         if (!validatePassword(password)) {
//           setLoading(false);
//           return;
//         }
//
//         if (password !== confirmPassword) {
//           setError('Passwords do not match');
//           setLoading(false);
//           return;
//         }
//
//         console.log('🔍 Debug: Making donor registration API call');
//         const response = await fetch(`${API_BASE_URL}/api/donors/register`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             email,
//             password,
//             firstName,
//             lastName,
//             phone: phone || undefined,
//           }),
//         });
//
//         const data = await response.json();
//         console.log('🔍 Debug: Donor registration response:', data);
//
//         if (!response.ok) {
//           console.error('❌ Debug: Donor registration failed:', data);
//           if (data.errors && Array.isArray(data.errors)) {
//             const errorMessage = data.errors.map((err: any) => `${err.field}: ${err.message}`).join(', ');
//             throw new Error(errorMessage);
//           }
//           throw new Error(data.message || 'Registration failed');
//         }
//
//         if (data.success) {
//           console.log('✅ Debug: Donor registration successful');
//           setSuccessMessage('Donor account created successfully!');
//
//           if (onSuccess) {
//             onSuccess(userType, authType, {
//               token: data.data.token,
//               ...data.data.donor
//             });
//           }
//
//           setTimeout(() => {
//             onClose();
//             resetForm();
//           }, 2000);
//         } else {
//           throw new Error(data.message || 'Donor registration failed');
//         }
//
//       } else if (authType === 'login') {
//         console.log('🔍 Debug: Processing login for userType:', userType);
//
//         if (!email || !password) {
//           setError('Please enter your email and password');
//           setLoading(false);
//           return;
//         }
//
//         const loginEndpoint = userType === 'admin'
//           ? `${API_BASE_URL}/api/auth/login/admin`
//           : `${API_BASE_URL}/api/auth/login`;
//
//         console.log('🔍 Debug: Using login endpoint:', loginEndpoint);
//
//         const response = await fetch(loginEndpoint, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             email,
//             password,
//             ...(userType !== 'admin' && { userType })
//           }),
//         });
//
//         const data = await response.json();
//         console.log('🔍 Debug: Login response:', data);
//
//         if (!response.ok) {
//           throw new Error(data.message || 'Login failed');
//         }
//
//         if (data.success) {
//           setSuccessMessage('Login successful!');
//           if (onSuccess) {
//             onSuccess(userType, authType, {
//               token: data.token || data.data?.token,
//               refreshToken: data.refreshToken || data.data?.refreshToken,
//               ...(data.user || data.data?.user)
//             });
//           }
//           setTimeout(() => {
//             onClose();
//             resetForm();
//           }, 1000);
//         } else {
//           throw new Error(data.message || 'Login failed');
//         }
//       }
//     } catch (error: unknown) {
//       console.error('❌ Debug: Form submission error:', error);
//       setError(error instanceof Error ? error.message : 'An error occurred');
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   // Handle OTP verification
//   const handleVerifyOtp = async () => {
//     console.log('🔍 Debug: handleVerifyOtp called');
//     setLoading(true);
//     setError('');
//
//     try {
//       const otpString = otpCode.join('');
//       console.log('🔍 Debug: OTP code:', otpString);
//
//       if (otpString.length !== 6) {
//         throw new Error('Please enter a valid 6-digit code');
//       }
//
//       console.log('🔍 Debug: Verifying OTP...');
//       const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           email,
//           otp: otpString,
//           userType
//         }),
//       });
//
//       const responseText = await response.text();
//       console.log('🔍 Debug: Raw verification response:', responseText);
//
//       let data;
//       try {
//         data = JSON.parse(responseText);
//         console.log('🔍 Debug: Parsed verification response:', data);
//       } catch (parseError) {
//         console.error('❌ Debug: Failed to parse verification response:', parseError);
//         throw new Error('Invalid response from server');
//       }
//
//       if (!response.ok) {
//         throw new Error(data.message || 'Verification failed');
//       }
//
//       console.log('✅ Debug: Email verified successfully');
//
//       if (data.requiresPayment) {
//         console.log('🔍 Debug: Payment required, showing payment modal');
//         setSuccessMessage('Email verified successfully! Please complete payment to finish registration.');
//         setVerificationStep(false);
//         setShowPaymentModal(true); // Show the new PaymentModal
//         setLoading(false);
//       } else {
//         console.log('🔍 Debug: No payment required, completing registration');
//         setSuccessMessage('Email verified successfully!');
//
//         setTimeout(() => {
//           console.log('🔍 Debug: Closing modal after successful verification');
//           onClose();
//           resetForm();
//         }, 1500);
//       }
//     } catch (error: unknown) {
//       console.error('❌ Debug: Verification error:', error);
//       setLoading(false);
//       setError(error instanceof Error ? error.message : 'Verification failed. Please try again.');
//     }
//   };
//
//   const handleResendVerification = async () => {
//     console.log('🔍 Debug: handleResendVerification called');
//     setLoading(true);
//     try {
//       const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           email,
//           userType
//         }),
//       });
//
//       const responseText = await response.text();
//       console.log('🔍 Debug: Raw response text:', responseText);
//
//       let data;
//       try {
//         data = JSON.parse(responseText);
//         console.log('🔍 Debug: Parsed response data:', data);
//       } catch (parseError) {
//         console.error('❌ Debug: Failed to parse response as JSON:', parseError);
//         throw new Error('Invalid response from server');
//       }
//
//       if (!response.ok) {
//         throw new Error(data.message || 'Could not resend code');
//       }
//
//       console.log('✅ Debug: Verification code resent successfully');
//       setSuccessMessage('Verification code resent!');
//       setTimeout(() => {
//         setSuccessMessage('');
//       }, 3000);
//     } catch (error: unknown) {
//       console.error('❌ Debug: Resend verification error:', error);
//       setError(error instanceof Error ? error.message : 'Failed to resend code. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   // UPDATED: Handle payment success from PaymentModal
//   const handlePaymentSuccess = async (paymentResult: any) => {
//     console.log('🔍 Debug: Payment successful from PaymentModal:', paymentResult);
//
//     try {
//       setShowPaymentModal(false);
//       setSuccessMessage('Payment completed successfully! Finalizing registration...');
//
//       // Complete registration with backend
//       if (registrationData) {
//         console.log('🔍 Debug: Completing registration with backend');
//         const completeResponse = await fetch(`${API_BASE_URL}/api/auth/complete-registration`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             registrationData,
//             paymentResult
//           }),
//         });
//
//         const completeData = await completeResponse.json();
//         console.log('🔍 Debug: Complete registration response:', completeData);
//
//         if (completeResponse.ok && completeData.success) {
//           console.log('✅ Debug: Registration completed successfully');
//           setSuccessMessage('Registration completed successfully!');
//
//           // Call success callback with user data
//           if (onSuccess) {
//             const userDataWithToken = {
//               ...completeData.user,
//               token: completeData.token
//             };
//             console.log('🔍 Debug: Calling onSuccess with user data:', userDataWithToken);
//             onSuccess(userType, authType, userDataWithToken);
//           }
//
//           // Close the modal after delay
//           setTimeout(() => {
//             onClose();
//             resetForm();
//           }, 2000);
//         } else {
//           throw new Error(completeData.message || 'Failed to complete registration');
//         }
//       } else {
//         throw new Error('Registration data not found');
//       }
//     } catch (error: unknown) {
//       console.error('❌ Debug: Payment completion error:', error);
//       setError(error instanceof Error ? error.message : 'Failed to complete registration');
//     }
//   };
//
//   // UPDATED: Handle payment error from PaymentModal
//   const handlePaymentError = (error: string) => {
//     console.error('❌ Debug: Payment error from PaymentModal:', error);
//     setShowPaymentModal(false);
//     setError(`Payment failed: ${error}`);
//   };
//
//   const handleOtpChange = (index: number, value: string) => {
//     console.log('🔍 Debug: OTP input changed:', { index, value });
//     if (value.length > 1) {
//       if (value.length === 6 && /^\d+$/.test(value)) {
//         console.log('🔍 Debug: Pasting full OTP code');
//         const digits = value.split('');
//         setOtpCode(digits);
//         otpInputRefs[5].current?.focus();
//       }
//       return;
//     }
//
//     if (value && !/^\d$/.test(value)) {
//       console.log('❌ Debug: Invalid OTP character entered');
//       return;
//     }
//
//     const newOtp = [...otpCode];
//     newOtp[index] = value;
//     setOtpCode(newOtp);
//     console.log('🔍 Debug: Updated OTP state:', newOtp);
//
//     if (value && index < 5) {
//       // Move to next input
//       otpInputRefs[index + 1].current?.focus();
//     } else if (!value && index > 0) {
//       // Move to previous input on delete
//       otpInputRefs[index - 1].current?.focus();
//     }
//   };
//
//   const renderOtpVerification = () => {
//     if (!verificationStep) return null;
//
//     return (
//       <View style={styles.verificationContainer}>
//         <Text style={styles.verificationTitle}>Email Verification</Text>
//         <Text style={styles.verificationText}>
//           Please enter the 6-digit code sent to {email}
//         </Text>
//
//         <View style={styles.otpContainer}>
//           {otpCode.map((digit, index) => (
//             <TextInput
//               key={index}
//               ref={otpInputRefs[index]}
//               style={styles.otpInput}
//               value={digit}
//               onChangeText={(value) => handleOtpChange(index, value)}
//               keyboardType="number-pad"
//               maxLength={1}
//               returnKeyType={index === 5 ? 'done' : 'next'}
//               onKeyPress={({ nativeEvent }) => {
//                 if (nativeEvent.key === 'Backspace' && !otpCode[index] && index > 0) {
//                   otpInputRefs[index - 1].current?.focus();
//                 }
//               }}
//             />
//           ))}
//         </View>
//
//         <TouchableOpacity
//           style={[
//             styles.submitButton,
//             loading ? styles.submitButtonDisabled : null,
//             userType === 'student' ? styles.studentButton :
//             userType === 'donor' ? styles.donorButton : styles.adminButton
//           ]}
//           onPress={handleVerifyOtp}
//           disabled={loading}
//         >
//           {loading ? (
//             <ActivityIndicator color="#ffffff" size="small" />
//           ) : (
//             <Text style={styles.submitButtonText}>Verify</Text>
//           )}
//         </TouchableOpacity>
//
//         <TouchableOpacity style={styles.resendLink} onPress={handleResendVerification}>
//           <Text style={styles.resendText}>Didn't receive a code? Resend</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   };
//
//   // Decide which content to show based on current step
//   const renderContent = () => {
//     console.log('🔍 Debug: renderContent - verificationStep:', verificationStep, 'showPaymentModal:', showPaymentModal);
//
//     if (verificationStep) {
//       console.log('🔍 Debug: Rendering OTP verification');
//       return renderOtpVerification();
//     } else {
//       console.log('🔍 Debug: Rendering main form');
//       return (
//         <>
//           <Text style={styles.modalTitle}>
//             {authType === 'login' ? 'Login' : 'Sign Up'} as {userType ? userType.charAt(0).toUpperCase() + userType.slice(1) : ''}
//           </Text>
//
//           {error ? (
//             <View style={styles.messageContainer}>
//               <Text style={styles.errorText}>{error}</Text>
//             </View>
//           ) : null}
//
//           {successMessage ? (
//             <View style={styles.messageContainer}>
//               <Text style={styles.successText}>{successMessage}</Text>
//             </View>
//           ) : null}
//
//           <TextInput
//             style={styles.input}
//             placeholder="Email"
//             placeholderTextColor="#888"
//             value={email}
//             onChangeText={setEmail}
//             keyboardType="email-address"
//             autoCapitalize="none"
//           />
//
//           <TextInput
//             style={styles.input}
//             placeholder="Password"
//             placeholderTextColor="#888"
//             value={password}
//             onChangeText={setPassword}
//             secureTextEntry
//           />
//
//           {authType === 'signup' && (
//             <>
//               <TextInput
//                 style={styles.input}
//                 placeholder="First Name"
//                 placeholderTextColor="#888"
//                 value={firstName}
//                 onChangeText={setFirstName}
//               />
//               <TextInput
//                 style={styles.input}
//                 placeholder="Last Name"
//                 placeholderTextColor="#888"
//                 value={lastName}
//                 onChangeText={setLastName}
//               />
//               <TextInput
//                 style={styles.input}
//                 placeholder="Confirm Password"
//                 placeholderTextColor="#888"
//                 value={confirmPassword}
//                 onChangeText={setConfirmPassword}
//                 secureTextEntry
//               />
//
//               {/* Student-specific fields */}
//               {userType === 'student' && (
//                 <>
//                   <TextInput
//                     style={styles.input}
//                     placeholder="School"
//                     placeholderTextColor="#888"
//                     value={school}
//                     onChangeText={setSchool}
//                   />
//                   <TextInput
//                     style={styles.input}
//                     placeholder="Major (optional)"
//                     placeholderTextColor="#888"
//                     value={major}
//                     onChangeText={setMajor}
//                   />
//                 </>
//               )}
//
//               {/* Donor-specific fields */}
//               {userType === 'donor' && (
//                 <TextInput
//                   style={styles.input}
//                   placeholder="Phone (optional)"
//                   placeholderTextColor="#888"
//                   value={phone}
//                   onChangeText={setPhone}
//                   keyboardType="phone-pad"
//                 />
//               )}
//             </>
//           )}
//
//           <TouchableOpacity
//             style={[
//               styles.submitButton,
//               loading ? styles.submitButtonDisabled : null,
//               userType === 'student' ? styles.studentButton :
//               userType === 'donor' ? styles.donorButton : styles.adminButton
//             ]}
//             onPress={handleSubmit}
//             disabled={loading}
//           >
//             {loading ? (
//               <ActivityIndicator color="#ffffff" size="small" />
//             ) : (
//               <Text style={styles.submitButtonText}>
//                 {authType === 'login' ? 'Login' : 'Sign Up'}
//               </Text>
//             )}
//           </TouchableOpacity>
//
//           <TouchableOpacity
//             style={styles.switchAuthType}
//             onPress={() => {
//               setAuthType(authType === 'login' ? 'signup' : 'login');
//               setError('');
//               setSuccessMessage('');
//             }}
//           >
//             <Text style={styles.switchAuthTypeText}>
//               {authType === 'login'
//                 ? `Don't have an account? Sign Up`
//                 : 'Already have an account? Login'}
//             </Text>
//           </TouchableOpacity>
//         </>
//       );
//     }
//   };
//
//   return (
//     <>
//       {/* Main Auth Modal */}
//       <Modal
//         animationType="fade"
//         transparent={true}
//         visible={visible && !showPaymentModal}
//         onRequestClose={onClose}
//       >
//         <KeyboardAvoidingView
//           behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//           style={styles.modalContainer}
//         >
//           <ScrollView contentContainerStyle={styles.scrollContent}>
//             <View style={styles.modalContent}>
//               {renderContent()}
//
//               {!loading && (
//                 <TouchableOpacity
//                   style={styles.closeButton}
//                   onPress={() => {
//                     onClose();
//                     resetForm();
//                   }}
//                 >
//                   <Text style={styles.closeButtonText}>Close</Text>
//                 </TouchableOpacity>
//               )}
//             </View>
//           </ScrollView>
//         </KeyboardAvoidingView>
//       </Modal>
//
//       {/* Payment Modal - UPDATED to use new PaymentModal component */}
//       <PaymentModal
//         visible={showPaymentModal}
//         amount={paymentAmount}
//         email={email}
//         registrationData={registrationData}
//         onClose={() => setShowPaymentModal(false)}
//         onPaymentSuccess={handlePaymentSuccess}
//         onPaymentError={handlePaymentError}
//       />
//     </>
//   );
// };
//
// const styles = StyleSheet.create({
//   modalContainer: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.6)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   scrollContent: {
//     flexGrow: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     width: '100%',
//     paddingVertical: 40,
//   },
//   modalContent: {
//     backgroundColor: '#1E1F38',
//     borderRadius: 10,
//     padding: 25,
//     width: Platform.OS === 'web' ? 450 : '90%',
//     maxWidth: 500,
//     elevation: 5,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//   },
//   modalTitle: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: 'white',
//     marginBottom: 20,
//     textAlign: 'center',
//   },
//   messageContainer: {
//     padding: 10,
//     borderRadius: 5,
//     marginBottom: 15,
//   },
//   errorText: {
//     color: '#ff6b6b',
//     textAlign: 'center',
//   },
//   successText: {
//     color: '#4BB543',
//     textAlign: 'center',
//   },
//   input: {
//     backgroundColor: 'rgba(255, 255, 255, 0.08)',
//     borderRadius: 8,
//     padding: 15,
//     marginBottom: 15,
//     color: 'white',
//     borderWidth: 1,
//     borderColor: 'rgba(255, 255, 255, 0.1)',
//   },
//   submitButton: {
//     padding: 15,
//     borderRadius: 8,
//     alignItems: 'center',
//     marginVertical: 15,
//   },
//   submitButtonDisabled: {
//     opacity: 0.7,
//   },
//   studentButton: {
//     backgroundColor: '#4285F4',
//   },
//   donorButton: {
//     backgroundColor: '#34A853',
//   },
//   adminButton: {
//     backgroundColor: '#9C27B0',
//   },
//   submitButtonText: {
//     color: 'white',
//     fontWeight: 'bold',
//     fontSize: 16,
//   },
//   switchAuthType: {
//     marginVertical: 15,
//     alignItems: 'center',
//   },
//   switchAuthTypeText: {
//     color: '#a3b3ff',
//     fontSize: 14,
//   },
//   closeButton: {
//     backgroundColor: 'rgba(255, 255, 255, 0.1)',
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//     marginTop: 10,
//   },
//   closeButtonText: {
//     color: 'white',
//     fontWeight: 'bold',
//   },
//   // OTP verification styles
//   verificationContainer: {
//     alignItems: 'center',
//     paddingVertical: 10,
//   },
//   verificationTitle: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: 'white',
//     marginBottom: 10,
//     textAlign: 'center',
//   },
//   verificationText: {
//     color: '#a3b3ff',
//     fontSize: 16,
//     marginBottom: 20,
//     textAlign: 'center',
//   },
//   otpContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     width: '100%',
//     marginBottom: 20,
//   },
//   otpInput: {
//     width: 45,
//     height: 55,
//     borderRadius: 8,
//     backgroundColor: 'rgba(255, 255, 255, 0.08)',
//     color: 'white',
//     fontSize: 22,
//     textAlign: 'center',
//     borderWidth: 1,
//     borderColor: 'rgba(255, 255, 255, 0.2)',
//   },
//   resendLink: {
//     marginTop: 20,
//   },
//   resendText: {
//     color: '#a3b3ff',
//     fontSize: 14,
//     textDecorationLine: 'underline',
//   },
// });
//
// export default AuthModal;





// import React, { useState, useEffect, useRef } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   Modal,
//   KeyboardAvoidingView,
//   Platform,
//   ScrollView,
//   ActivityIndicator,
//   Alert
// } from 'react-native';
// import { API_BASE_URL } from '../../config/api';
//
// // Add debug log to verify environment variable
// console.log('🔍 Debug: Environment check:', {
//   EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
//   API_BASE_URL: API_BASE_URL
// });
//
// interface AuthModalProps {
//   visible: boolean;
//   initialAuthType?: 'login' | 'signup';
//   initialUserType?: 'student' | 'donor' | 'admin';
//   onClose: () => void;
//   onSuccess?: (userType: string, authType: string, userData: any) => void;
// }
//
// const AuthModal: React.FC<AuthModalProps> = (props) => {
//   const {
//     visible,
//     initialAuthType,
//     initialUserType,
//     onClose,
//     onSuccess
//   } = props;
//
//   console.log("🔍 Debug: AuthModal rendered with props:", JSON.stringify(props));
//   // Ensure initial values have defaults
//   const safeInitialAuthType = initialAuthType || 'login';
//   const safeInitialUserType = initialUserType || 'student';
//
//   // Form state
//   const [authType, setAuthType] = useState<'login' | 'signup'>(safeInitialAuthType);
//   const [userType, setUserType] = useState<'student' | 'donor' | 'admin'>(safeInitialUserType);
//
//   // Update state when props change
//   useEffect(() => {
//     console.log('🔍 Debug: AuthModal useEffect triggered');
//     console.log('🔍 Debug: Setting initial values:', { initialAuthType, initialUserType });
//     if (initialAuthType) {
//       console.log('🔍 Debug: Setting authType to:', initialAuthType);
//       setAuthType(initialAuthType);
//     }
//     if (initialUserType) {
//       console.log('🔍 Debug: Setting userType to:', initialUserType);
//       setUserType(initialUserType);
//     }
//
//     // Reset form fields when auth type or user type changes
//     setEmail('');
//     setPassword('');
//     setConfirmPassword('');
//     setFirstName('');
//     setLastName('');
//     setSchool('');
//     setMajor('');
//     setPhone('');
//     setError('');
//     setSuccessMessage('');
//   }, [initialAuthType, initialUserType]);
//
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [confirmPassword, setConfirmPassword] = useState('');
//   const [firstName, setFirstName] = useState('');
//   const [lastName, setLastName] = useState('');
//   const [school, setSchool] = useState('');
//   const [major, setMajor] = useState('');
//   const [phone, setPhone] = useState('');
//
//   // Registration state
//   const [verificationStep, setVerificationStep] = useState(false);
//   const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
//   const [registrationComplete, setRegistrationComplete] = useState(false);
//   const [registrationData, setRegistrationData] = useState<any>(null);
//
//   // Payment
//   const [showPayment, setShowPayment] = useState(false);
//   const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | ''>('');
//   const [paymentComplete, setPaymentComplete] = useState(false);
//
//   // UI state
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [successMessage, setSuccessMessage] = useState('');
//
//   // Add refs for OTP inputs, typed for TextInput (null allowed)
//   const otpInputRefs: React.RefObject<TextInput | null>[] = Array.from({ length: 6 }, () => useRef<TextInput | null>(null));
//
//   // Email validation
//   const validateEmail = (email: string): boolean => {
//     const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     return re.test(email);
//   };
//
//   // Password validation
//   const validatePassword = (password: string): boolean => {
//     if (password.length < 8) {
//       setError('Password must be at least 8 characters long');
//       return false;
//     }
//
//     // Match backend validation exactly
//     const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;
//     if (!passwordRegex.test(password)) {
//       setError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
//       return false;
//     }
//
//     return true;
//   };
//
//   const resetForm = () => {
//     setEmail('');
//     setPassword('');
//     setConfirmPassword('');
//     setFirstName('');
//     setLastName('');
//     setSchool('');
//     setMajor('');
//     setPhone('');
//     setError('');
//     setSuccessMessage('');
//     setVerificationStep(false);
//     setOtpCode(['', '', '', '', '', '']);
//     setRegistrationComplete(false);
//     setShowPayment(false);
//     setPaymentMethod('');
//     setPaymentComplete(false);
//   };
//
// // Handle initial form submit
// // Add this to your AuthModal.tsx handleSubmit function
// // Replace the existing handleSubmit function with this updated version:
//
// const handleSubmit = async () => {
//   setLoading(true);
//   setError('');
//
//   try {
//     console.log('🔍 Debug: Starting form submission');
//     console.log('🔍 Debug: Form data:', {
//       email,
//       firstName,
//       lastName,
//       school,
//       major,
//       phone,
//       userType,
//       authType
//     });
//
//     if (authType === 'signup' && userType === 'student') {
//       console.log('🔍 Debug: Processing student registration');
//
//       // Validate required fields
//       if (!email || !password || !confirmPassword || !firstName || !lastName || !school) {
//         setError('Please fill in all required fields');
//         setLoading(false);
//         return;
//       }
//
//       if (!validateEmail(email)) {
//         setError('Please enter a valid email address');
//         setLoading(false);
//         return;
//       }
//
//       if (!validatePassword(password)) {
//         setLoading(false);
//         return;
//       }
//
//       if (password !== confirmPassword) {
//         setError('Passwords do not match');
//         setLoading(false);
//         return;
//       }
//
//       console.log('🔍 Debug: Making student registration API call');
//       const response = await fetch(`${API_BASE_URL}/api/auth/register/student`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           email,
//           password,
//           firstName,
//           lastName,
//           school,
//           major: major || undefined,
//         }),
//       });
//
//       const data = await response.json();
//       console.log('🔍 Debug: Student registration response:', data);
//
//       if (!response.ok) {
//         console.error('❌ Debug: Student registration failed:', data);
//         if (data.errors && Array.isArray(data.errors)) {
//           console.error('❌ Debug: Validation errors:', data.errors);
//           const errorMessage = data.errors.map((err: any) => `${err.field}: ${err.message}`).join(', ');
//           throw new Error(errorMessage);
//         }
//         throw new Error(data.message || 'Registration failed');
//       }
//
//       if (data.success) {
//         console.log('✅ Debug: Student registration successful, requires payment:', data.requiresPayment);
//         setSuccessMessage(data.message);
//
//         if (data.requiresPayment) {
//           // Store registration data for payment completion
//           setRegistrationData(data.registrationData);
//           setVerificationStep(true);
//           console.log('🔍 Debug: Moving to verification step');
//         } else {
//           // Direct success (shouldn't happen with new flow)
//           if (onSuccess) {
//             onSuccess(userType, authType, {
//               token: data.token,
//               refreshToken: data.refreshToken,
//               ...data.user
//             });
//           }
//           setTimeout(() => {
//             onClose();
//             resetForm();
//           }, 2000);
//         }
//       } else {
//         throw new Error(data.message || 'Registration failed');
//       }
//     } else if (authType === 'signup' && userType === 'donor') {
//       // *** NEW: Add donor registration logic ***
//       console.log('🔍 Debug: Processing donor registration');
//
//       // Validate required fields for donor
//       if (!email || !password || !confirmPassword || !firstName || !lastName) {
//         setError('Please fill in all required fields');
//         setLoading(false);
//         return;
//       }
//
//       if (!validateEmail(email)) {
//         setError('Please enter a valid email address');
//         setLoading(false);
//         return;
//       }
//
//       if (!validatePassword(password)) {
//         setLoading(false);
//         return;
//       }
//
//       if (password !== confirmPassword) {
//         setError('Passwords do not match');
//         setLoading(false);
//         return;
//       }
//
//       console.log('🔍 Debug: Making donor registration API call');
//       const response = await fetch(`${API_BASE_URL}/api/donors/register`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           email,
//           password,
//           firstName,
//           lastName,
//           phone: phone || undefined,
//         }),
//       });
//
//       const data = await response.json();
//       console.log('🔍 Debug: Donor registration response:', data);
//
//       if (!response.ok) {
//         console.error('❌ Debug: Donor registration failed:', data);
//         if (data.errors && Array.isArray(data.errors)) {
//           console.error('❌ Debug: Validation errors:', data.errors);
//           const errorMessage = data.errors.map((err: any) => `${err.field}: ${err.message}`).join(', ');
//           throw new Error(errorMessage);
//         }
//         throw new Error(data.message || 'Registration failed');
//       }
//
//       if (data.success) {
//         console.log('✅ Debug: Donor registration successful');
//         setSuccessMessage('Donor account created successfully!');
//
//         if (onSuccess) {
//           onSuccess(userType, authType, {
//             token: data.data.token,
//             ...data.data.donor
//           });
//         }
//
//         setTimeout(() => {
//           onClose();
//           resetForm();
//         }, 2000);
//       } else {
//         throw new Error(data.message || 'Donor registration failed');
//       }
//         } else if (authType === 'login') {
//           console.log('🔍 Debug: Processing login for userType:', userType);
//
//           if (!email || !password) {
//             setError('Please enter your email and password');
//             setLoading(false);
//             return;
//           }
//
//           // Choose the correct login endpoint based on userType
//           const loginEndpoint = userType === 'admin'
//             ? `${API_BASE_URL}/api/auth/login/admin`
//             : `${API_BASE_URL}/api/auth/login`;
//
//           console.log('🔍 Debug: Using login endpoint:', loginEndpoint);
//
//           const response = await fetch(loginEndpoint, {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//               email,
//               password,
//               ...(userType !== 'admin' && { userType }) // Only include userType for non-admin
//             }),
//           });
//
//           const data = await response.json();
//           console.log('🔍 Debug: Login response:', data);
//
//           if (!response.ok) {
//             throw new Error(data.message || 'Login failed');
//           }
//
//           if (data.success) {
//             setSuccessMessage('Login successful!');
//             if (onSuccess) {
//               onSuccess(userType, authType, {
//                 token: data.token || data.data?.token,
//                 refreshToken: data.refreshToken || data.data?.refreshToken,
//                 ...(data.user || data.data?.user)
//               });
//             }
//             setTimeout(() => {
//               onClose();
//               resetForm();
//             }, 1000);
//           } else {
//             throw new Error(data.message || 'Login failed');
//           }
//         }
//   } catch (error: unknown) {
//     console.error('❌ Debug: Form submission error:', error);
//     console.error('🔍 Debug: process.env.EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
//     console.error('🔍 Debug: API_BASE_URL:', `${API_BASE_URL}`);
//     console.error('🔍 Debug: Full URL being called:', `${API_BASE_URL}/api/donors/register`);
//     setError(error instanceof Error ? error.message : 'An error occurred');
//   } finally {
//     setLoading(false);
//   }
// };
//
//   // Handle OTP verification
//   const handleVerifyOtp = async () => {
//     console.log('🔍 Debug: handleVerifyOtp called');
//     setLoading(true);
//     setError('');
//
//     try {
//       const otpString = otpCode.join('');
//       console.log('🔍 Debug: OTP code:', otpString);
//
//       if (otpString.length !== 6) {
//         throw new Error('Please enter a valid 6-digit code');
//       }
//
//       console.log('🔍 Debug: Verifying OTP...');
//       // FIXED: Removed duplicate const response declaration and fixed quote
//       const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           email,
//           otp: otpString,
//           userType
//         }),
//       });
//
//       console.log('🔍 Debug: Verification response status:', response.status);
//       const responseText = await response.text();
//       console.log('🔍 Debug: Raw verification response:', responseText);
//
//       let data;
//       try {
//         data = JSON.parse(responseText);
//         console.log('🔍 Debug: Parsed verification response:', data);
//       } catch (parseError) {
//         console.error('❌ Debug: Failed to parse verification response:', parseError);
//         throw new Error('Invalid response from server');
//       }
//
//       if (!response.ok) {
//         throw new Error(data.message || 'Verification failed');
//       }
//
//       console.log('✅ Debug: Email verified successfully');
//       console.log('🔍 Debug: Verification response data:', data);
//
//       if (data.requiresPayment) {
//         console.log('🔍 Debug: Payment required, showing payment form');
//         console.log('🔍 Debug: Setting showPayment to true');
//         setSuccessMessage('Email verified successfully! Please complete payment to finish registration.');
//         setShowPayment(true);
//         setVerificationStep(false);
//         setLoading(false);
//         // Do NOT clear registrationData here; keep it for payment step
//         // setRegistrationData(null);
//         console.log('🔍 Debug: State after setting showPayment - showPayment:', true, 'verificationStep:', false, 'loading:', false);
//       } else {
//         console.log('🔍 Debug: No payment required, completing registration');
//         setSuccessMessage('Email verified successfully!');
//         setRegistrationComplete(true);
//
//         setTimeout(() => {
//           console.log('🔍 Debug: Closing modal after successful verification');
//           onClose();
//           resetForm();
//         }, 1500);
//       }
//     } catch (error: unknown) {
//       console.error('❌ Debug: Verification error:', error);
//       setLoading(false);
//       setError(error instanceof Error ? error.message : 'Verification failed. Please try again.');
//     }
//   };
//
//   // Add debug logs to resend verification
//   const handleResendVerification = async () => {
//     console.log('🔍 Debug: handleResendVerification called');
//     console.log('🔍 Debug: Current state:', { email, userType });
//     setLoading(true);
//     try {
//       console.log('🔍 Debug: Preparing to send request to /api/auth/resend-verification');
//       console.log('🔍 Debug: Request payload:', { email, userType });
//
//       // FIXED: Fixed quote
//       const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           email,
//           userType
//         }),
//       });
//
//       console.log('🔍 Debug: Response status:', response.status);
//       console.log('🔍 Debug: Response headers:', Object.fromEntries(response.headers.entries()));
//
//       const responseText = await response.text();
//       console.log('🔍 Debug: Raw response text:', responseText);
//
//       let data;
//       try {
//         data = JSON.parse(responseText);
//         console.log('🔍 Debug: Parsed response data:', data);
//       } catch (parseError) {
//         console.error('❌ Debug: Failed to parse response as JSON:', parseError);
//         throw new Error('Invalid response from server');
//       }
//
//       if (!response.ok) {
//         throw new Error(data.message || 'Could not resend code');
//       }
//
//       console.log('✅ Debug: Verification code resent successfully');
//       setSuccessMessage('Verification code resent!');
//       setTimeout(() => {
//         setSuccessMessage('');
//       }, 3000);
//     } catch (error: unknown) {
//       console.error('❌ Debug: Resend verification error:', error);
//       setError(error instanceof Error ? error.message : 'Failed to resend code. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   // Handle payment processing
//   const handlePayment = async () => {
//     console.log('🔍 Debug: handlePayment called');
//     setLoading(true);
//     setError('');
//
//     if (!paymentMethod) {
//       console.log('❌ Debug: No payment method selected');
//       setError('Please select a payment method');
//       setLoading(false);
//       return;
//     }
//
//     try {
//       console.log("Simulating payment processing...");
//       // Debug: print registrationData before proceeding
//       console.log('🔍 Debug: registrationData before payment:', registrationData);
//
//       // For development, simulate payment intent creation
//       // Uncomment the real API call when backend is ready
//       /*
//       // Call real payment intent creation API
//       const intentResponse = await fetch('/api/registration-payment/create-intent', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           email,
//           paymentMethod,
//         }),
//       });
//
//       const intentData = await intentResponse.json();
//
//       if (!intentResponse.ok) {
//         throw new Error(intentData.message || 'Payment initialization failed');
//       }
//       */
//
//       // Simulate successful intent creation
//       const intentData = {
//         success: true,
//         paymentIntentId: 'sim_intent_' + Date.now(),
//         message: 'Payment intent created successfully'
//       };
//
//       console.log('🔍 Debug: Payment intent created:', intentData);
//
//       // Simulate processing the payment (in a real app, this would use Stripe or PayPal SDK)
//       console.log('🔍 Debug: Starting payment simulation timeout...');
//       setTimeout(async () => {
//         try {
//           console.log('🔍 Debug: Payment simulation timeout completed, processing payment...');
//           // For development, simulate payment processing
//           // Uncomment the real API call when backend is ready
//           /*
//           // Call real payment processing API
//           const processResponse = await fetch('/api/registration-payment/process', {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json',
//             },
//             body: JSON.stringify({
//               paymentIntentId: intentData.paymentIntentId,
//             }),
//           });
//
//           const processData = await processResponse.json();
//
//           if (!processResponse.ok) {
//             throw new Error(processData.message || 'Payment processing failed');
//           }
//           */
//
//           // Simulate successful payment processing
//           const processData = {
//             success: true,
//             message: 'Payment processed successfully',
//             user: {
//               id: 'student_' + Date.now(),
//               email,
//               firstName,
//               lastName,
//               school,
//               major: major || undefined,
//               userType: 'student',
//               emailVerified: true,
//               paymentComplete: true,
//               token: 'sim_token_' + Date.now() // Add simulated token for development
//             }
//           };
//
//           console.log('🔍 Debug: Payment processing simulated successfully:', processData);
//
//           // Complete registration with backend
//           if (registrationData) {
//             console.log('🔍 Debug: Completing registration with backend');
//             const completeResponse = await fetch(`${API_BASE_URL}/api/auth/complete-registration`, {
//               method: 'POST',
//               headers: {
//                 'Content-Type': 'application/json',
//               },
//               body: JSON.stringify({
//                 registrationData
//               }),
//             });
//
//             const completeData = await completeResponse.json();
//             console.log('🔍 Debug: Complete registration response:', completeData);
//
//             if (completeResponse.ok && completeData.success) {
//               console.log('✅ Debug: Registration completed successfully');
//               setLoading(false);
//               setSuccessMessage('Registration completed successfully!');
//               setPaymentComplete(true);
//
//               // Call success callback with actual user data including the real token
//               if (onSuccess) {
//                 const userDataWithToken = {
//                   ...completeData.user,
//                   token: completeData.token // Pass the real token from backend
//                 };
//                 console.log('🔍 Debug: Calling onSuccess with user data:', userDataWithToken);
//                 onSuccess(userType, authType, userDataWithToken);
//               }
//
//               // Close the modal after a delay
//               setTimeout(() => {
//                 onClose();
//                 resetForm();
//                 // Now clear registrationData after full flow is complete
//                 setRegistrationData(null);
//               }, 2000);
//             } else {
//               throw new Error(completeData.message || 'Failed to complete registration');
//             }
//           } else {
//             throw new Error('Registration data not found');
//           }
//         } catch (error: unknown) {
//           console.error('❌ Debug: Payment simulation error:', error);
//           setLoading(false);
//           setError(error instanceof Error ? error.message : 'Payment failed. Please try again.');
//         }
//       }, 2000);
//     } catch (error: unknown) {
//       console.error('❌ Debug: handlePayment error:', error);
//       setLoading(false);
//       setError(error instanceof Error ? error.message : 'Payment failed. Please try again.');
//     }
//   };
//
//   const handleOtpChange = (index: number, value: string) => {
//     console.log('🔍 Debug: OTP input changed:', { index, value });
//     if (value.length > 1) {
//       if (value.length === 6 && /^\d+$/.test(value)) {
//         console.log('🔍 Debug: Pasting full OTP code');
//         const digits = value.split('');
//         setOtpCode(digits);
//         // Focus last input
//         otpInputRefs[5].current?.focus();
//       }
//       return;
//     }
//
//     if (value && !/^\d$/.test(value)) {
//       console.log('❌ Debug: Invalid OTP character entered');
//       return;
//     }
//
//     const newOtp = [...otpCode];
//     newOtp[index] = value;
//     setOtpCode(newOtp);
//     console.log('🔍 Debug: Updated OTP state:', newOtp);
//
//     if (value && index < 5) {
//       // Move to next input
//       otpInputRefs[index + 1].current?.focus();
//     } else if (!value && index > 0) {
//       // Move to previous input on delete
//       otpInputRefs[index - 1].current?.focus();
//     }
//   };
//
//   const renderOtpVerification = () => {
//     if (!verificationStep) return null;
//
//     return (
//       <View style={styles.verificationContainer}>
//         <Text style={styles.verificationTitle}>Email Verification</Text>
//         <Text style={styles.verificationText}>
//           Please enter the 6-digit code sent to {email}
//         </Text>
//
//         <View style={styles.otpContainer}>
//           {otpCode.map((digit, index) => (
//             <TextInput
//               key={index}
//               ref={otpInputRefs[index]}
//               style={styles.otpInput}
//               value={digit}
//               onChangeText={(value) => handleOtpChange(index, value)}
//               keyboardType="number-pad"
//               maxLength={1}
//               returnKeyType={index === 5 ? 'done' : 'next'}
//               onKeyPress={({ nativeEvent }) => {
//                 if (nativeEvent.key === 'Backspace' && !otpCode[index] && index > 0) {
//                   otpInputRefs[index - 1].current?.focus();
//                 }
//               }}
//             />
//           ))}
//         </View>
//
//         <TouchableOpacity
//           style={[
//             styles.submitButton,
//             loading ? styles.submitButtonDisabled : null,
//             userType === 'student' ? styles.studentButton :
//             userType === 'donor' ? styles.donorButton : styles.adminButton
//           ]}
//           onPress={handleVerifyOtp}
//           disabled={loading}
//         >
//           {loading ? (
//             <ActivityIndicator color="#ffffff" size="small" />
//           ) : (
//             <Text style={styles.submitButtonText}>Verify</Text>
//           )}
//         </TouchableOpacity>
//
//         <TouchableOpacity style={styles.resendLink} onPress={handleResendVerification}>
//           <Text style={styles.resendText}>Didn't receive a code? Resend</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   };
//
//   const renderPayment = () => {
//     if (!showPayment) return null;
//
//     console.log('🔍 Debug: renderPayment - paymentMethod:', paymentMethod, 'loading:', loading);
//
//     return (
//       <View style={styles.paymentContainer}>
//         <Text style={styles.paymentTitle}>Registration Fee</Text>
//         <Text style={styles.paymentText}>
//           A one-time $25 registration fee is required to complete your student account setup.
//         </Text>
//
//         <View style={styles.paymentMethodContainer}>
//           <Text style={styles.paymentMethodTitle}>Select Payment Method</Text>
//
//           <TouchableOpacity
//             style={[
//               styles.paymentMethodButton,
//               paymentMethod === 'stripe' && styles.paymentMethodSelected
//             ]}
//             onPress={() => {
//               console.log('🔍 Debug: Credit Card selected');
//               setPaymentMethod('stripe');
//             }}
//           >
//             <Text style={styles.paymentMethodText}>Credit Card</Text>
//           </TouchableOpacity>
//
//           <TouchableOpacity
//             style={[
//               styles.paymentMethodButton,
//               paymentMethod === 'paypal' && styles.paymentMethodSelected
//             ]}
//             onPress={() => {
//               console.log('🔍 Debug: PayPal selected');
//               setPaymentMethod('paypal');
//             }}
//           >
//             <Text style={styles.paymentMethodText}>PayPal</Text>
//           </TouchableOpacity>
//         </View>
//
//         {/* Debug info for payment form */}
//         <View style={{padding: 10, marginTop: 10, marginBottom: 10, backgroundColor: 'rgba(255,255,0,0.2)', borderRadius: 5}}>
//           <Text style={{color: 'yellow'}}>Debug - paymentMethod: {paymentMethod}</Text>
//           <Text style={{color: 'yellow'}}>Debug - loading: {loading.toString()}</Text>
//           <Text style={{color: 'yellow'}}>Debug - button disabled: {(loading || !paymentMethod).toString()}</Text>
//         </View>
//
//         <TouchableOpacity
//           style={[
//             styles.submitButton,
//             loading ? styles.submitButtonDisabled : null,
//             !paymentMethod ? styles.submitButtonDisabled : null,
//             styles.studentButton,
//             { borderWidth: 3, borderColor: 'red' } // Make button more visible for debugging
//           ]}
//           onPress={() => {
//             console.log('🔍 Debug: Pay $25 button clicked');
//             handlePayment();
//           }}
//           disabled={loading || !paymentMethod}
//         >
//           {loading ? (
//             <ActivityIndicator color="#ffffff" size="small" />
//           ) : (
//             <Text style={styles.submitButtonText}>Pay $25</Text>
//           )}
//         </TouchableOpacity>
//       </View>
//     );
//   };
//
//   const renderStudentFields = () => {
//     if (userType !== 'student' || authType !== 'signup') return null;
//
//     return (
//       <>
//         <TextInput
//           style={styles.input}
//           placeholder="School"
//           placeholderTextColor="#888"
//           value={school}
//           onChangeText={setSchool}
//         />
//         <TextInput
//           style={styles.input}
//           placeholder="Major (optional)"
//           placeholderTextColor="#888"
//           value={major}
//           onChangeText={setMajor}
//         />
//       </>
//     );
//   };
//
//   const renderDonorFields = () => {
//     if (userType !== 'donor' || authType !== 'signup') return null;
//
//     return (
//       <TextInput
//         style={styles.input}
//         placeholder="Phone (optional)"
//         placeholderTextColor="#888"
//         value={phone}
//         onChangeText={setPhone}
//         keyboardType="phone-pad"
//       />
//     );
//   };
//
//   const renderSignupFields = () => {
//     if (authType !== 'signup') {
//       console.log("Not rendering signup fields because authType is not signup");
//       return null;
//     }
//
//     console.log("Rendering signup fields for authType: signup");
//     return (
//       <>
//         <TextInput
//           style={styles.input}
//           placeholder="First Name"
//           placeholderTextColor="#888"
//           value={firstName}
//           onChangeText={setFirstName}
//         />
//         <TextInput
//           style={styles.input}
//           placeholder="Last Name"
//           placeholderTextColor="#888"
//           value={lastName}
//           onChangeText={setLastName}
//         />
//         <TextInput
//           style={styles.input}
//           placeholder="Confirm Password"
//           placeholderTextColor="#888"
//           value={confirmPassword}
//           onChangeText={setConfirmPassword}
//           secureTextEntry
//         />
//       </>
//     );
//   };
//
//   // Decide which content to show based on current step
//   const renderContent = () => {
//     console.log('🔍 Debug: renderContent - verificationStep:', verificationStep, 'showPayment:', showPayment, 'registrationData:', !!registrationData);
//
//     if (verificationStep) {
//       console.log('🔍 Debug: Rendering OTP verification');
//       return renderOtpVerification();
//     } else if (showPayment) {
//       console.log('🔍 Debug: Rendering payment form');
//       return renderPayment();
//     } else {
//       console.log('🔍 Debug: Rendering main form');
//       return (
//         <>
//           <Text style={styles.modalTitle}>
//             {authType === 'login' ? 'Login' : 'Sign Up'} as {userType ? userType.charAt(0).toUpperCase() + userType.slice(1) : ''}
//           </Text>
//
//           {error ? (
//             <View style={styles.messageContainer}>
//               <Text style={styles.errorText}>{error}</Text>
//             </View>
//           ) : null}
//
//           {successMessage ? (
//             <View style={styles.messageContainer}>
//               <Text style={styles.successText}>{successMessage}</Text>
//             </View>
//           ) : null}
//
//           <TextInput
//             style={styles.input}
//             placeholder="Email"
//             placeholderTextColor="#888"
//             value={email}
//             onChangeText={setEmail}
//             keyboardType="email-address"
//             autoCapitalize="none"
//           />
//
//           <TextInput
//             style={styles.input}
//             placeholder="Password"
//             placeholderTextColor="#888"
//             value={password}
//             onChangeText={setPassword}
//             secureTextEntry
//           />
//
//           {/* Debug info */}
//           <View style={{padding: 10, marginTop: 10, marginBottom: 10, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 5}}>
//             <Text style={{color: 'white'}}>Debug - authType: {authType}</Text>
//             <Text style={{color: 'white'}}>Debug - userType: {userType}</Text>
//             <Text style={{color: 'white'}}>Debug - API_BASE_URL: {API_BASE_URL}</Text>
//           </View>
//
//           {/* Always render these fields when in signup mode, regardless of conditions */}
//           {authType === 'signup' && (
//             <>
//               <TextInput
//                 style={styles.input}
//                 placeholder="First Name"
//                 placeholderTextColor="#888"
//                 value={firstName}
//                 onChangeText={setFirstName}
//               />
//               <TextInput
//                 style={styles.input}
//                 placeholder="Last Name"
//                 placeholderTextColor="#888"
//                 value={lastName}
//                 onChangeText={setLastName}
//               />
//               <TextInput
//                 style={styles.input}
//                 placeholder="Confirm Password"
//                 placeholderTextColor="#888"
//                 value={confirmPassword}
//                 onChangeText={setConfirmPassword}
//                 secureTextEntry
//               />
//
//               {/* Student-specific fields */}
//               {userType === 'student' && (
//                 <>
//                   <TextInput
//                     style={styles.input}
//                     placeholder="School"
//                     placeholderTextColor="#888"
//                     value={school}
//                     onChangeText={setSchool}
//                   />
//                   <TextInput
//                     style={styles.input}
//                     placeholder="Major (optional)"
//                     placeholderTextColor="#888"
//                     value={major}
//                     onChangeText={setMajor}
//                   />
//                 </>
//               )}
//
//               {/* Donor-specific fields */}
//               {userType === 'donor' && (
//                 <TextInput
//                   style={styles.input}
//                   placeholder="Phone (optional)"
//                   placeholderTextColor="#888"
//                   value={phone}
//                   onChangeText={setPhone}
//                   keyboardType="phone-pad"
//                 />
//               )}
//             </>
//           )}
//
//           <TouchableOpacity
//             style={[
//               styles.submitButton,
//               loading ? styles.submitButtonDisabled : null,
//               userType === 'student' ? styles.studentButton :
//               userType === 'donor' ? styles.donorButton : styles.adminButton
//             ]}
//             onPress={handleSubmit}
//             disabled={loading}
//           >
//             {loading ? (
//               <ActivityIndicator color="#ffffff" size="small" />
//             ) : (
//               <Text style={styles.submitButtonText}>
//                 {authType === 'login' ? 'Login' : 'Sign Up'}
//               </Text>
//             )}
//           </TouchableOpacity>
//
//           <TouchableOpacity
//             style={styles.switchAuthType}
//             onPress={() => {
//               setAuthType(authType === 'login' ? 'signup' : 'login');
//               setError('');
//               setSuccessMessage('');
//             }}
//           >
//             <Text style={styles.switchAuthTypeText}>
//               {authType === 'login'
//                 ? `Don't have an account? Sign Up`
//                 : 'Already have an account? Login'}
//             </Text>
//           </TouchableOpacity>
//         </>
//       );
//     }
//   };
//
//   return (
//     <Modal
//       animationType="fade"
//       transparent={true}
//       visible={visible}
//       onRequestClose={onClose}
//     >
//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//         style={styles.modalContainer}
//       >
//         <ScrollView contentContainerStyle={styles.scrollContent}>
//           <View style={styles.modalContent}>
//             {renderContent()}
//
//             {!loading && (
//               <TouchableOpacity
//                 style={styles.closeButton}
//                 onPress={() => {
//                   onClose();
//                   resetForm();
//                 }}
//               >
//                 <Text style={styles.closeButtonText}>Close</Text>
//               </TouchableOpacity>
//             )}
//           </View>
//         </ScrollView>
//       </KeyboardAvoidingView>
//     </Modal>
//   );
// };
//
// const styles = StyleSheet.create({
//   modalContainer: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.6)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   scrollContent: {
//     flexGrow: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     width: '100%',
//     paddingVertical: 40,
//   },
//   modalContent: {
//     backgroundColor: '#1E1F38',
//     borderRadius: 10,
//     padding: 25,
//     width: Platform.OS === 'web' ? 450 : '90%',
//     maxWidth: 500,
//     elevation: 5,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//   },
//   modalTitle: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: 'white',
//     marginBottom: 20,
//     textAlign: 'center',
//   },
//   messageContainer: {
//     padding: 10,
//     borderRadius: 5,
//     marginBottom: 15,
//   },
//   errorText: {
//     color: '#ff6b6b',
//     textAlign: 'center',
//   },
//   successText: {
//     color: '#4BB543',
//     textAlign: 'center',
//   },
//   input: {
//     backgroundColor: 'rgba(255, 255, 255, 0.08)',
//     borderRadius: 8,
//     padding: 15,
//     marginBottom: 15,
//     color: 'white',
//     borderWidth: 1,
//     borderColor: 'rgba(255, 255, 255, 0.1)',
//   },
//   submitButton: {
//     padding: 15,
//     borderRadius: 8,
//     alignItems: 'center',
//     marginVertical: 15,
//   },
//   submitButtonDisabled: {
//     opacity: 0.7,
//   },
//   studentButton: {
//     backgroundColor: '#4285F4',
//   },
//   donorButton: {
//     backgroundColor: '#34A853',
//   },
//   adminButton: {
//     backgroundColor: '#9C27B0',
//   },
//   submitButtonText: {
//     color: 'white',
//     fontWeight: 'bold',
//     fontSize: 16,
//   },
//   switchAuthType: {
//     marginVertical: 15,
//     alignItems: 'center',
//   },
//   switchAuthTypeText: {
//     color: '#a3b3ff',
//     fontSize: 14,
//   },
//   closeButton: {
//     backgroundColor: 'rgba(255, 255, 255, 0.1)',
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//     marginTop: 10,
//   },
//   closeButtonText: {
//     color: 'white',
//     fontWeight: 'bold',
//   },
//   // OTP verification styles
//   verificationContainer: {
//     alignItems: 'center',
//     paddingVertical: 10,
//   },
//   verificationTitle: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: 'white',
//     marginBottom: 10,
//     textAlign: 'center',
//   },
//   verificationText: {
//     color: '#a3b3ff',
//     fontSize: 16,
//     marginBottom: 20,
//     textAlign: 'center',
//   },
//   otpContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     width: '100%',
//     marginBottom: 20,
//   },
//   otpInput: {
//     width: 45,
//     height: 55,
//     borderRadius: 8,
//     backgroundColor: 'rgba(255, 255, 255, 0.08)',
//     color: 'white',
//     fontSize: 22,
//     textAlign: 'center',
//     borderWidth: 1,
//     borderColor: 'rgba(255, 255, 255, 0.2)',
//   },
//   resendLink: {
//     marginTop: 20,
//   },
//   resendText: {
//     color: '#a3b3ff',
//     fontSize: 14,
//     textDecorationLine: 'underline',
//   },
//   // Payment styles
//   paymentContainer: {
//     alignItems: 'center',
//     paddingVertical: 10,
//   },
//   paymentTitle: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: 'white',
//     marginBottom: 10,
//     textAlign: 'center',
//   },
//   paymentText: {
//     color: '#a3b3ff',
//     fontSize: 16,
//     marginBottom: 20,
//     textAlign: 'center',
//   },
//   paymentMethodContainer: {
//     width: '100%',
//     marginBottom: 20,
//   },
//   paymentMethodTitle: {
//     color: 'white',
//     fontSize: 16,
//     marginBottom: 10,
//     textAlign: 'center',
//   },
//   paymentMethodButton: {
//     backgroundColor: 'rgba(255, 255, 255, 0.08)',
//     padding: 15,
//     borderRadius: 8,
//     marginBottom: 10,
//     borderWidth: 1,
//     borderColor: 'rgba(255, 255, 255, 0.1)',
//   },
//   paymentMethodSelected: {
//     borderColor: '#4285F4',
//     backgroundColor: 'rgba(66, 133, 244, 0.2)',
//   },
//   paymentMethodText: {
//     color: 'white',
//     textAlign: 'center',
//     fontSize: 16,
//   }
// });
//
// export default AuthModal;