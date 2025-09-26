// frontend/src/components/admin/AdminLoginPage.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert
} from 'react-native';
import AuthModal from '../auth/AuthModal';

interface AdminLoginPageProps {
  onAdminLogin: (userData: any) => void;
  onBackToPublic: () => void;
}

const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onAdminLogin,
  onBackToPublic
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleAuthSuccess = (userType: string, authType: string, userData: any) => {
    console.log(`[AdminLogin] User authenticated: ${authType} as ${userType}`);

    if (userType !== 'admin') {
      Alert.alert(
        'Access Denied',
        'This page is for administrators only.',
        [{ text: 'OK', onPress: () => setModalVisible(false) }]
      );
      return;
    }

    setModalVisible(false);
    onAdminLogin(userData);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackToPublic}
          >
            <Text style={styles.backButtonText}>← Back to GradVillage</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <View style={styles.logoSection}>
            <Text style={styles.logo}>🔐</Text>
            <Text style={styles.title}>Admin Portal</Text>
            <Text style={styles.subtitle}>
              Authorized Personnel Only
            </Text>
          </View>

          <View style={styles.loginSection}>
            <Text style={styles.description}>
              This area is restricted to GradVillage administrators.
              Please log in with your admin credentials.
            </Text>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.loginButtonText}>Admin Login</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.securityNotice}>
            <Text style={styles.securityText}>
              🛡️ All admin actions are logged and monitored
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            GradVillage Admin Portal • Secure Access Only
          </Text>
        </View>
      </View>

      <AuthModal
        visible={modalVisible}
        initialAuthType="login"
        initialUserType="admin"
        onClose={() => setModalVisible(false)}
        onSuccess={handleAuthSuccess}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1c',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#ef4444',
    fontWeight: '600',
    textAlign: 'center',
  },
  loginSection: {
    alignItems: 'center',
    marginBottom: 40,
    maxWidth: 400,
  },
  description: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  securityNotice: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 8,
    padding: 15,
    marginTop: 20,
  },
  securityText: {
    color: '#f59e0b',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#52525b',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default AdminLoginPage;