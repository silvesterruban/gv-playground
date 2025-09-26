import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform, Dimensions } from 'react-native';
import AuthModal from './src/components/auth/AuthModal';
import StudentDashboard from './src/components/StudentDashboard';
import PublicProfilePage from './src/components/PublicProfilePage';
import DonorDashboard from './src/components/donor/DonorDashboard';
import AdminDashboard from './src/components/admin/AdminDashboard';
import AdminLoginPage from './src/components/admin/AdminLoginPage';
import RegistryDemoPage from './src/components/RegistryDemoPage';

// Get screen dimensions
const { width } = Dimensions.get('window');

interface UserData {
  id: string;
  token: string;
  [key: string]: any;
}

export default function App() {
  const [modalVisible, setModalVisible] = useState(false);
  const [authType, setAuthType] = useState<'login' | 'signup'>('login');
  const [userType, setUserType] = useState<'student' | 'donor' | 'admin'>('student');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showAdminPortal, setShowAdminPortal] = useState(false);
  const [showRegistryDemo, setShowRegistryDemo] = useState(false);
  const [currentPath, setCurrentPath] = useState('');

  // Check if we're on a public profile page
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
      const path = window.location.pathname;
      console.log('[App] Current path detected:', path);
      setCurrentPath(path);
    }
  }, []);

  // Handle public profile routes (only in web environment)
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const path = window.location.pathname;
    console.log('[App] Checking path for public profile:', path);
    if (path.startsWith('/profile/')) {
      const profileUrl = path.replace('/profile/', '');
      console.log('[App] Rendering PublicProfilePage for URL:', profileUrl);
      return <PublicProfilePage profileUrl={profileUrl} />;
    }
  }

  const openAuthModal = (type: 'login' | 'signup', role: 'student' | 'donor' | 'admin') => {
    setAuthType(type);
    setUserType(role);
    setModalVisible(true);
  };

  const handleAuthSuccess = (userType: string, authType: string, userData: UserData) => {
    console.log(`[App] User authenticated: ${authType} as ${userType}`);
    setModalVisible(false);
    setUserData(userData);
    setIsLoggedIn(true);
    
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem('userData', JSON.stringify(userData));
        console.log('[App] UserData stored in localStorage');
      } catch (error) {
        console.error('[App] Failed to store userData in localStorage:', error);
      }
    }
  };

  const handleLogout = () => {
    console.log("[App] handleLogout called - starting logout process");
    setIsLoggedIn(false);
    setUserData(null);
    setShowAdminPortal(false);
    
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem('userData');
        console.log('[App] UserData cleared from localStorage');
        // Force page refresh to ensure clean state
        window.location.reload();
      } catch (error) {
        console.error('[App] Failed to clear userData from localStorage:', error);
      }
    }
    
    console.log("[App] Logout process completed");
  };

  const handleProfileUpdate = (updatedProfile: UserData | null) => {
    console.log('[App] Profile update received:', updatedProfile);
    
    if (updatedProfile === null) {
      console.log('[App] Logging out due to invalid token');
      handleLogout();
      return;
    }
    
    if (updatedProfile && userData) {
      const updatedUserData = { ...updatedProfile, token: userData.token };
      console.log('[App] Updating userData with preserved token');
      setUserData(updatedUserData);
      
      if (Platform.OS === 'web') {
        try {
          localStorage.setItem('userData', JSON.stringify(updatedUserData));
          console.log('[App] Updated userData in localStorage');
        } catch (error) {
          console.error('[App] Failed to update userData in localStorage:', error);
        }
      }
    }
  };

  const handleAdminLogin = (userData: UserData) => {
    setUserType('admin');
    setUserData(userData);
    setIsLoggedIn(true);
    
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem('userData', JSON.stringify(userData));
        console.log('[App] Admin userData stored in localStorage');
      } catch (error) {
        console.error('[App] Failed to store admin userData in localStorage:', error);
      }
    }
  };

  // Secret admin portal access (click logo 7 times)
  const [logoClickCount, setLogoClickCount] = useState(0);
  const handleLogoPress = () => {
    setLogoClickCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 7) {
        setShowAdminPortal(true);
        return 0;
      }
      return newCount;
    });

    setTimeout(() => setLogoClickCount(0), 3000);
  };

  // Show admin portal if requested
  if (showAdminPortal && !isLoggedIn) {
    return (
      <AdminLoginPage
        onAdminLogin={handleAdminLogin}
        onBackToPublic={() => setShowAdminPortal(false)}
      />
    );
  }

  // Show registry demo if requested
  if (showRegistryDemo) {
    return (
      <RegistryDemoPage onBackToHome={() => setShowRegistryDemo(false)} />
    );
  }

  // Only show dashboard if we have both logged in status AND user data
  if (isLoggedIn && userData) {
    if (userType === 'student') {
      return <StudentDashboard userData={userData} onLogout={handleLogout} onProfileUpdate={handleProfileUpdate} />;
    } else if (userType === 'donor') {
      return <DonorDashboard userData={userData} onLogout={handleLogout} />;
    } else if (userType === 'admin') {
      return <AdminDashboard userData={userData} onLogout={handleLogout} />;
    }
  }

  // Show loading state if logged in but no user data yet
  if (isLoggedIn && !userData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Landing page with HTML design
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoIconText}>GV</Text>
            </View>
            <TouchableOpacity onPress={handleLogoPress}>
              <Text style={styles.logoText}>GradVillage</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity>
            <Text style={styles.navLink}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowRegistryDemo(true)}>
            <Text style={styles.navLink}>Registry Demo</Text>
          </TouchableOpacity>
        </View>

        {/* Main Container - Grid Layout */}
        <View style={styles.mainContainer}>
          {/* Main Content Area - Left Side */}
          <View style={styles.mainContent}>
            <View style={styles.heroContent}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>🎓 Education Platform</Text>
              </View>
              
              <Text style={styles.heroTitle}>Connecting Dreams with Support</Text>
              
              <Text style={styles.heroSubtitle}>
                Empowering students to achieve their educational goals through meaningful connections with generous donors who believe in the power of education.
              </Text>

              <View style={styles.ctaButtons}>
                <TouchableOpacity style={styles.btnPrimary}>
                  <Text style={styles.btnPrimaryText}>Get Started</Text>
                  <Text style={styles.btnPrimaryArrow}>→</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.statsInline}>
                <View style={styles.statInline}>
                  <Text style={styles.statNumberInline}>Let's Change A Life !</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Sidebar - Right Side */}
          <View style={styles.sidebar}>
            <View style={styles.userCard}>
              <View style={styles.userIcon}>
                <Text style={styles.userIconText}>🎓</Text>
              </View>
              <Text style={styles.userTitle}>For Students</Text>
              <Text style={styles.userDescription}>
                Apply for funding, share your story, and connect with donors who want to support your educational journey.
              </Text>
              <View style={styles.userButtons}>
                <TouchableOpacity 
                  style={[styles.btnCard, styles.btnStudent]}
                  onPress={() => openAuthModal('signup', 'student')}
                >
                  <Text style={styles.btnStudentText}>Register Now</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.btnCard, styles.btnStudentOutline]}
                  onPress={() => openAuthModal('login', 'student')}
                >
                  <Text style={styles.btnStudentOutlineText}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.userCard}>
              <View style={styles.userIcon}>
                <Text style={styles.userIconText}>💝</Text>
              </View>
              <Text style={styles.userTitle}>For Donors</Text>
              <Text style={styles.userDescription}>
                Discover inspiring students, make direct contributions, and track the impact of your generous support.
              </Text>
              <View style={styles.userButtons}>
                <TouchableOpacity 
                  style={[styles.btnCard, styles.btnDonor]}
                  onPress={() => openAuthModal('signup', 'donor')}
                >
                  <Text style={styles.btnDonorText}>Start Giving</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.btnCard, styles.btnDonorOutline]}
                  onPress={() => openAuthModal('login', 'donor')}
                >
                  <Text style={styles.btnDonorOutlineText}>Browse Students</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Building bridges between education and opportunity</Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Contact Us</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Help Center</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <AuthModal
        visible={modalVisible}
        initialAuthType={authType}
        initialUserType={userType}
        onClose={() => setModalVisible(false)}
        onSuccess={handleAuthSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
  },

  // Header Styles - Clean white header
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: width > 768 ? 60 : 30,
    paddingVertical: width > 768 ? 16 : 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(237, 192, 50, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  logoIcon: {
    width: width > 768 ? 50 : 40,
    height: width > 768 ? 50 : 40,
    backgroundColor: '#edc032',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoIconText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: width > 768 ? 18 : 16,
  },
  logoText: {
    fontSize: width > 768 ? 32 : 24,
    fontWeight: '700',
    color: '#3C6FA3',
  },
  navLink: {
    color: '#3C6FA3',
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 16,
  },

  // Main Container - Asymmetric grid layout
  mainContainer: {
    flex: 1,
    flexDirection: width > 1024 ? 'row' : 'column',
  },

  // Main Content - Large left section with blue gradient
  mainContent: {
    flex: width > 1024 ? 1.2 : 1,
    backgroundColor: '#3C6FA3',
    paddingHorizontal: width > 768 ? 60 : 30,
    paddingVertical: width > 768 ? 80 : 48,
    justifyContent: 'center',
    position: 'relative',
    minHeight: width > 1024 ? 'auto' : 500,
  },
  heroContent: {
    maxWidth: 600,
    zIndex: 10,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(237, 192, 50, 0.3)',
    marginBottom: 30,
  },
  heroBadgeText: {
    color: '#edc032',
    fontSize: 14,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: width > 768 ? 56 : width > 480 ? 40 : 32,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: width > 768 ? 60 : width > 480 ? 44 : 36,
    marginBottom: 30,
  },
  heroSubtitle: {
    fontSize: width > 768 ? 22 : width > 480 ? 18 : 16,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: width > 768 ? 32 : width > 480 ? 28 : 24,
    marginBottom: 40,
  },
  ctaButtons: {
    flexDirection: 'row',
    marginBottom: 60,
    flexWrap: 'wrap',
  },
  btnPrimary: {
    backgroundColor: '#edc032',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#edc032',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  btnPrimaryText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
  btnPrimaryArrow: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Stats section
  statsInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statInline: {
    alignItems: 'flex-start',
  },
  statNumberInline: {
    fontSize: width > 768 ? 28 : 20,
    fontWeight: '900',
    color: '#edc032',
    lineHeight: width > 768 ? 32 : 24,
  },

  // Sidebar - Right section
  sidebar: {
    flex: width > 1024 ? 0.8 : 1,
    backgroundColor: '#3C6FA3',
    paddingHorizontal: width > 768 ? 40 : 25,
    paddingVertical: width > 768 ? 60 : 40,
    gap: 25,
    borderLeftWidth: width > 1024 ? 4 : 0,
    borderLeftColor: '#edc032',
    flexDirection: width > 1024 ? 'column' : width > 768 ? 'row' : 'column',
  },
  userCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    paddingHorizontal: 30,
    paddingVertical: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderTopWidth: 4,
    borderTopColor: '#edc032',
    flex: width > 768 && width <= 1024 ? 1 : undefined,
    minWidth: width > 768 && width <= 1024 ? 300 : undefined,
  },
  userIcon: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  userIconText: {
    fontSize: 32,
  },
  userTitle: {
    fontSize: width > 768 ? 28 : 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  userDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    fontSize: 15,
  },
  userButtons: {
    width: '100%',
    gap: 12,
  },
  btnCard: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignItems: 'center',
  },
  btnStudent: {
    backgroundColor: '#FFFFFF',
  },
  btnStudentText: {
    color: '#3C6FA3',
    fontWeight: '600',
    fontSize: 15,
  },
  btnStudentOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  btnStudentOutlineText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  btnDonor: {
    backgroundColor: '#3C6FA3',
  },
  btnDonorText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  btnDonorOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  btnDonorOutlineText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },

  // Footer - Black footer spanning full width
  footer: {
    backgroundColor: '#000000',
    paddingHorizontal: width > 768 ? 60 : 30,
    paddingVertical: 30,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(237, 192, 50, 0.2)',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 20,
  },
  footerLinks: {
    flexDirection: width > 480 ? 'row' : 'column',
    gap: width > 480 ? 30 : 15,
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  footerLink: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
});