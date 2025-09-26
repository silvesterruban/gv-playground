import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Dimensions
} from 'react-native';
import { API_BASE_URL } from '../config/api';
import EditProfileModal from './EditProfileModal';
import PublicProfileModal from './PublicProfileModal';
import RegistryManagementModal from './RegistryManagementModal';
import PhotoUploadModal from './PhotoUploadModal';
import VerificationButton from './student/VerificationButton';
import QRCodeModalWeb from './QRCodeModalWeb';

interface StudentProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  schoolName: string;
  major?: string;
  bio?: string;
  profilePhoto?: string;
  fundingGoal: number;
  amountRaised: number;
  profileUrl: string;
  verified: boolean;
  profileCompletion: number;
  stats: {
    totalDonations: number;
    totalRegistryItems: number;
    fundingProgress: number;
  };
  registries: Array<{
    id: string;
    itemName: string;
    price: number;
    category: string;
    fundedStatus: string;
    amountFunded: number;
  }>;
}

interface StudentDashboardProps {
  userData: any;
  onLogout: () => void;
  onProfileUpdate?: (updatedProfile: any) => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ userData, onLogout, onProfileUpdate }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [publicProfileModalVisible, setPublicProfileModalVisible] = useState(false);
  const [registryModalVisible, setRegistryModalVisible] = useState(false);
  const [qrCodeModalVisible, setQrCodeModalVisible] = useState(false);
  const [photoUploadModalVisible, setPhotoUploadModalVisible] = useState(false);

  const { width } = Dimensions.get('window');
  const isMobile = width <= 992;
  
  // Update sidebar state when screen size changes
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(true); // Always open on desktop
    } else {
      setSidebarOpen(false); // Always closed on mobile
    }
  }, [isMobile]);

  console.log('[StudentDashboard] userData prop:', userData);

  const getImageUrl = (profilePhoto: string | undefined): string | null => {
    if (!profilePhoto) return null;
    console.log('🖼️ Processing image URL:', profilePhoto);
    let filename = '';
    if (profilePhoto.includes('/')) {
      const parts = profilePhoto.split('/');
      filename = parts[parts.length - 1];
    } else {
      filename = profilePhoto;
    }
    const imageUrl = `${API_BASE_URL}/img/${filename}`;
    console.log('✅ Using simple image URL:', imageUrl);
    return imageUrl;
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleProfileDropdown = () => {
    if (isMobile) {
      setProfileDropdownOpen(!profileDropdownOpen);
    }
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const closeProfileDropdown = () => {
    setProfileDropdownOpen(false);
  };

  // Calculate progress percentage
  const progressPercentage = userData?.fundingGoal > 0 
    ? Math.min((userData.amountRaised / userData.fundingGoal) * 100, 100) 
    : 0;

  // Calculate profile completion
  const profileCompletion = userData?.profileCompletion || 20;

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      // For web, use browser confirm dialog
      if (window.confirm('Are you sure you want to sign out?')) {
        console.log('[StudentDashboard] Web logout confirmed, calling onLogout');
        onLogout();
      }
    } else {
      // For mobile, use React Native Alert
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', onPress: onLogout }
        ]
      );
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const handlePhotoUpload = (photoUrl: string) => {
    if (photoUrl) {
      console.log('[StudentDashboard] Photo uploaded:', photoUrl);
      // Update the user data with the new photo URL
      if (onProfileUpdate && userData) {
        const updatedProfile = { ...userData, profilePhoto: photoUrl };
        onProfileUpdate(updatedProfile);
      }
    }
    setPhotoUploadModalVisible(false);
  };

  return (
    <View style={styles.dashboardContainer}>
      {/* Sidebar */}
      <View style={[
        styles.sidebar, 
        isMobile && !sidebarOpen && { transform: [{ translateX: -260 }] }
      ]}>
        <Text style={styles.logo}>GradVillage</Text>
        <View style={styles.sidebarNav}>
          <TouchableOpacity style={[styles.sidebarNavItem, styles.active]}>
            <Text style={styles.sidebarNavIcon}>📊</Text>
            <Text style={styles.sidebarNavText}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.sidebarNavItem}
            onPress={() => setEditProfileModalVisible(true)}
          >
            <Text style={styles.sidebarNavIcon}>👤</Text>
            <Text style={styles.sidebarNavText}>My Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.sidebarNavItem}
            onPress={() => setRegistryModalVisible(true)}
          >
            <Text style={styles.sidebarNavIcon}>🎁</Text>
            <Text style={styles.sidebarNavText}>Registry</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.sidebarNavItem}
            onPress={() => setQrCodeModalVisible(true)}
          >
            <Text style={styles.sidebarNavIcon}>📱</Text>
            <Text style={styles.sidebarNavText}>QR Code</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.sidebarNavItem}
            onPress={() => setPublicProfileModalVisible(true)}
          >
            <Text style={styles.sidebarNavIcon}>🔗</Text>
            <Text style={styles.sidebarNavText}>Public URL</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={[
        styles.mainContentWrapper, 
        !isMobile && sidebarOpen && { marginLeft: 260 }
      ]}>
        <ScrollView style={styles.mainContent}>
          {/* Header */}
          <View style={styles.mainHeader}>
            <View style={styles.headerLeft}>
              <TouchableOpacity 
                style={styles.mobileMenuToggle}
                onPress={toggleSidebar}
              >
                <Text style={styles.mobileMenuIcon}>☰</Text>
              </TouchableOpacity>
              <Text style={styles.welcomeText}>
                Welcome back, {userData?.firstName || 'Student'}!
              </Text>
            </View>
            
            <View style={styles.userProfile}>
              <TouchableOpacity 
                style={styles.profileDisplay}
                onPress={toggleProfileDropdown}
              >
                <TouchableOpacity 
                  style={styles.userAvatar}
                  onPress={() => setPhotoUploadModalVisible(true)}
                >
                  {userData?.profilePhoto ? (
                    <Image 
                      source={{ uri: userData.profilePhoto }} 
                      style={styles.userAvatarImage}
                    />
                  ) : (
                    <Text style={styles.userAvatarText}>
                      {getInitials(userData?.firstName, userData?.lastName)}
                    </Text>
                  )}
                </TouchableOpacity>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {userData?.firstName} {userData?.lastName}
                  </Text>
                  <Text style={styles.userLocation}>
                    {userData?.schoolName || 'School'}
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.signOutBtn}
                onPress={() => {
                  console.log('[StudentDashboard] Sign out button clicked');
                  handleLogout();
                }}
              >
                <Text style={styles.signOutBtnText}>Sign Out</Text>
              </TouchableOpacity>

              {/* Profile Dropdown (Mobile) */}
              {profileDropdownOpen && (
                <View style={styles.profileDropdown}>
                  <Text style={styles.dropdownName}>
                    {userData?.firstName} {userData?.lastName}
                  </Text>
                  <Text style={styles.dropdownLocation}>
                    {userData?.schoolName || 'School'}
                  </Text>
                  <View style={styles.dropdownDivider} />
                  <TouchableOpacity 
                    style={[styles.signOutBtn, styles.dropdownSignOutBtn]}
                    onPress={() => {
                      console.log('[StudentDashboard] Dropdown sign out button clicked');
                      handleLogout();
                    }}
                  >
                    <Text style={styles.signOutBtnText}>Sign Out</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Verification Card */}
          <View style={styles.card}>
            <View style={styles.verificationCard}>
              <View>
                <Text style={styles.verificationTitle}>
                  ⚠️ Account Verification Required
                </Text>
                <Text style={styles.verificationText}>
                  Verify your student status to access all fundraising features.
                </Text>
              </View>
              <TouchableOpacity style={styles.verifyBtn}>
                <Text style={styles.verifyBtnText}>🛡️ Verify Your Account</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Profile Completion Card */}
          <View style={styles.card}>
            <View style={styles.profileCard}>
              <View>
                <Text style={styles.profileTitle}>
                  ⚠️ Complete Your Profile
                </Text>
                <Text style={styles.profileText}>
                  Complete your profile to increase your chances of receiving donations!
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.verifyBtn}
                onPress={() => setEditProfileModalVisible(true)}
              >
                <Text style={styles.verifyBtnText}>🛡️ Complete Your Profile</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Progress Section */}
          <View style={styles.progressSection}>
            <Text style={styles.sectionTitle}>Your Progress</Text>
            <View style={styles.gridContainer}>
              <View style={[styles.card, styles.statCard]}>
                <Text style={styles.statIcon}>💰</Text>
                <Text style={styles.statNumber}>
                  ${userData?.amountRaised || 0}
                </Text>
                <Text style={styles.statLabel}>Total Raised</Text>
              </View>
              
              <View style={[styles.card, styles.statCard]}>
                <View style={styles.progressCircle}>
                  <Text style={styles.progressCircleText}>
                    {Math.round(progressPercentage)}%
                  </Text>
                </View>
                <Text style={styles.statLabel}>Goal Progress</Text>
              </View>
              
              <View style={[styles.card, styles.statCard]}>
                <Text style={styles.statIcon}>❤️</Text>
                <Text style={styles.statNumber}>
                  {userData?.stats?.totalDonations || 0}
                </Text>
                <Text style={styles.statLabel}>Donations</Text>
              </View>
              
              <View style={[styles.card, styles.statCard]}>
                <Text style={styles.statIcon}>📦</Text>
                <Text style={styles.statNumber}>
                  {userData?.stats?.totalRegistryItems || 0}
                </Text>
                <Text style={styles.statLabel}>Registry Items</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions Section */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.gridContainer}>
              <TouchableOpacity 
                style={[styles.card, styles.actionCard]}
                onPress={() => setEditProfileModalVisible(true)}
              >
                <Text style={styles.actionIcon}>✏️</Text>
                <Text style={styles.actionText}>Edit Profile</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.card, styles.actionCard]}
                onPress={() => setRegistryModalVisible(true)}
              >
                <Text style={styles.actionIcon}>📋</Text>
                <Text style={styles.actionText}>Manage Registry</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.card, styles.actionCard]}
                onPress={() => setPublicProfileModalVisible(true)}
              >
                <Text style={styles.actionIcon}>👁️</Text>
                <Text style={styles.actionText}>View Public Profile</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.card, styles.actionCard]}
                onPress={() => setQrCodeModalVisible(true)}
              >
                <Text style={styles.actionIcon}>📱</Text>
                <Text style={styles.actionText}>My QR Code</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Getting Started Section */}
          <View style={styles.gettingStartedSection}>
            <Text style={styles.sectionTitle}>Getting Started</Text>
            <View style={[styles.card, styles.checklist]}>
              <View style={styles.checklistList}>
                <View style={[styles.checklistItem, styles.completed]}>
                  <Text style={styles.checklistIcon}>✅</Text>
                  <View style={styles.checklistText}>
                    <Text style={styles.checklistTitle}>
                      Profile {profileCompletion}% Complete
                    </Text>
                    <Text style={styles.checklistDescription}>
                      Complete your profile to increase donation chances.
                    </Text>
                  </View>
                </View>
                
                <View style={styles.checklistItem}>
                  <Text style={styles.checklistIcon}>🚀</Text>
                  <View style={styles.checklistText}>
                    <Text style={styles.checklistTitle}>
                      Set Your Funding Goal
                    </Text>
                    <Text style={styles.checklistDescription}>
                      Let donors know what you're aiming for.
                    </Text>
                  </View>
                </View>
                
                <View style={styles.checklistItem}>
                  <Text style={styles.checklistIcon}>🎁</Text>
                  <View style={styles.checklistText}>
                    <Text style={styles.checklistTitle}>
                      Add Items to Your Registry
                    </Text>
                    <Text style={styles.checklistDescription}>
                      Add items to your registry to get started with donations.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Modals */}
      <EditProfileModal
        visible={editProfileModalVisible}
        onClose={() => setEditProfileModalVisible(false)}
        userData={userData}
        onProfileUpdated={onProfileUpdate || (() => {
          // Default handler if onProfileUpdate is not provided
          console.log('Profile updated');
        })}
      />
      
      <PublicProfileModal
        visible={publicProfileModalVisible}
        onClose={() => setPublicProfileModalVisible(false)}
        profileUrl={userData?.profileUrl || ''}
      />
      
      <RegistryManagementModal
        visible={registryModalVisible}
        onClose={() => setRegistryModalVisible(false)}
        userData={userData}
        onRegistryUpdated={() => {
          // Refresh data if needed
          console.log('Registry updated');
        }}
      />
      
      <QRCodeModalWeb
        visible={qrCodeModalVisible}
        onClose={() => setQrCodeModalVisible(false)}
        profileUrl={userData?.profileUrl || ''}
        studentName={`${userData?.firstName || ''} ${userData?.lastName || ''}`}
      />

      <PhotoUploadModal
        visible={photoUploadModalVisible}
        onClose={() => setPhotoUploadModalVisible(false)}
        userToken={userData?.token}
        onPhotoUploaded={handlePhotoUpload}
      />

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <TouchableOpacity 
          style={styles.overlay}
          onPress={closeSidebar}
          activeOpacity={1}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dashboardContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f4f7fa',
  },
  
  // Sidebar Styles
  sidebar: {
    width: 260,
    backgroundColor: '#3C6FA3',
    paddingVertical: 32,
    paddingHorizontal: 24,
    position: 'absolute',
    height: '100%',
    zIndex: 1000,
    left: 0,
    top: 0,
  },
  sidebarOpen: {
    transform: [{ translateX: 0 }],
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 48,
  },
  sidebarNav: {
    flex: 1,
  },
  sidebarNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  active: {
    backgroundColor: '#68A3D6',
  },
  sidebarNavIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 20,
    textAlign: 'center',
  },
  sidebarNavText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },

  // Main Content Styles
  mainContentWrapper: {
    flex: 1,
    marginLeft: 0, // Start with no margin for mobile
  },
  mainContentWrapperShifted: {
    marginLeft: 0,
  },
  mainContent: {
    flex: 1,
    padding: 32,
  },

  // Header Styles
  mainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mobileMenuToggle: {
    display: 'flex',
    marginRight: 16,
  },
  mobileMenuIcon: {
    fontSize: 24,
    color: '#3C6FA3',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  userProfile: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#3C6FA3',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  userInfo: {
    marginRight: 16,
  },
  userName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#333',
  },
  userLocation: {
    fontSize: 14,
    color: '#777',
  },
  signOutBtn: {
    backgroundColor: '#edc032',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 16,
  },
  signOutBtnText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 14,
  },
  profileDropdown: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    width: 200,
    zIndex: 100,
    padding: 16,
  },
  dropdownName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#333',
  },
  dropdownLocation: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 16,
  },
  dropdownSignOutBtn: {
    width: '100%',
    marginLeft: 0,
  },

  // Card Styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    marginBottom: 24,
  },
  verificationCard: {
    backgroundColor: 'rgba(60, 111, 163, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(60, 111, 163, 0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verificationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3C6FA3',
    marginBottom: 8,
  },
  verificationText: {
    color: '#3C6FA3',
    fontSize: 14,
  },
  profileCard: {
    backgroundColor: 'rgba(213, 193, 43, 0.31)',
    borderWidth: 1,
    borderColor: 'rgba(60, 111, 163, 0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3C6FA3',
    marginBottom: 8,
  },
  profileText: {
    color: '#3C6FA3',
    fontSize: 14,
  },
  verifyBtn: {
    backgroundColor: '#3C6FA3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Section Styles
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
    color: '#333',
  },
  progressSection: {
    marginBottom: 32,
  },
  actionsSection: {
    marginBottom: 32,
  },
  gettingStartedSection: {
    marginBottom: 32,
  },

  // Grid Container
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  // Stat Card Styles
  statCard: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statIcon: {
    fontSize: 32,
    color: '#68A3D6',
    marginBottom: 16,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#3C6FA3',
    marginBottom: 8,
  },
  statLabel: {
    color: '#777',
    fontSize: 14,
  },
  progressCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressCircleText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#3C6FA3',
  },

  // Action Card Styles
  actionCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 16,
  },
  actionText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },

  // Checklist Styles
  checklist: {
    padding: 0,
  },
  checklistList: {
    padding: 0,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  completed: {
    opacity: 0.7,
  },
  checklistIcon: {
    fontSize: 24,
    marginRight: 24,
    color: '#68A3D6',
    width: 30,
    textAlign: 'center',
  },
  checklistText: {
    flex: 1,
  },
  checklistTitle: {
    fontWeight: '500',
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  checklistDescription: {
    fontSize: 14,
    color: '#777',
  },

  // Overlay
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },


});

export default StudentDashboard;