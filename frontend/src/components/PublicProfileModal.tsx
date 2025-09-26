import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import PublicDonationForm from './PublicDonationForm';
import { API_BASE_URL } from '../config/api';

interface PublicProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  school: string;
  major?: string;
  bio?: string;
  profilePhoto?: string;
  fundingGoal: number;
  amountRaised: number;
  graduationYear?: number;
  gpa?: number;
  achievements?: string;
  financialNeed?: string;
  phoneNumber?: string;
  linkedinUrl?: string;
  personalStatement?: string;
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
    description?: string;
    fundedStatus: string;
    amountFunded: number;
  }>;
}

interface PublicProfileModalProps {
  visible: boolean;
  onClose: () => void;
  profileUrl: string;
}

const PublicProfileModal: React.FC<PublicProfileModalProps> = ({
  visible,
  onClose,
  profileUrl
}) => {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDonationForm, setShowDonationForm] = useState(false);

  // ADDED: Image URL processing function
  const getImageUrl = (profilePhoto: string) => {
    if (!profilePhoto) return null;

    console.log('🖼️ [PublicProfile] Processing image URL:', profilePhoto);

    // Extract filename from any URL format
    let filename = '';

    if (profilePhoto.includes('/')) {
      // Extract filename from full URL
      const parts = profilePhoto.split('/');
      filename = parts[parts.length - 1];
    } else {
      // It's already just a filename
      filename = profilePhoto;
    }

    // Use the simple /img endpoint that bypasses CORS issues
    const imageUrl = `${API_BASE_URL}/img/${filename}`;
    console.log('✅ [PublicProfile] Using simple image URL:', imageUrl);
    return imageUrl;
  };

  useEffect(() => {
    if (visible && profileUrl) {
      fetchPublicProfile();
    }
  }, [visible, profileUrl]);

  const fetchPublicProfile = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE_URL}/api/students/public/${profileUrl}`);

      if (!response.ok) {
        throw new Error(`Profile not found (${response.status})`);
      }

      const data = await response.json();

      if (data.success && data.student) {
        // Map the API response to our interface
        const profileData = {
          id: data.student.id,
          firstName: data.student.firstName,
          lastName: data.student.lastName,
          email: data.student.email,
          school: data.student.schoolName || data.student.school || '',
          major: data.student.major || '',
          bio: data.student.bio || '',
          profilePhoto: data.student.profilePhoto || '',
          fundingGoal: data.student.fundingGoal || 0,
          amountRaised: data.student.amountRaised || 0,
          graduationYear: data.student.graduationYear,
          gpa: data.student.gpa,
          achievements: data.student.achievements || '',
          financialNeed: data.student.financialNeed || '',
          phoneNumber: data.student.phoneNumber || '',
          linkedinUrl: data.student.linkedinUrl || '',
          personalStatement: data.student.personalStatement || '',
          stats: data.student.stats || {
            totalDonations: 0,
            totalRegistryItems: 0,
            fundingProgress: 0,
          },
          registries: data.student.registries || []
        };
        setProfile(profileData);
      } else {
        setError('Profile not found or not public');
      }
    } catch (error) {
      console.error('Error fetching public profile:', error);
      setError(error instanceof Error ? error.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage = profile?.fundingGoal && profile.fundingGoal > 0
    ? Math.min((profile.amountRaised / profile.fundingGoal) * 100, 100)
    : 0;

  console.log('[PublicProfileModal] Debug - Profile data:', {
    fundingGoal: profile?.fundingGoal,
    amountRaised: profile?.amountRaised,
    progressPercentage
  });

  // UPDATED: Enhanced profile photo rendering with proper URL processing
  const renderProfilePhoto = () => {
    if (!profile?.profilePhoto) {
      return (
        <View style={styles.profilePhotoPlaceholder}>
          <Text style={styles.profilePhotoText}>
            {profile?.firstName.charAt(0)}{profile?.lastName.charAt(0)}
          </Text>
        </View>
      );
    }

    const imageUrl = getImageUrl(profile.profilePhoto);

    if (Platform.OS === 'web') {
      return (
        <img
          src={imageUrl}
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            objectFit: 'cover',
            border: '2px solid #e0e0e0',
            background: '#f0f0f0',
          }}
          alt="Profile"
          crossOrigin="anonymous"
          onError={(e) => {
            console.error('❌ [PublicProfile] Image failed to load:', imageUrl);
            console.error('❌ Original profilePhoto:', profile.profilePhoto);
            e.currentTarget.onerror = null;

            // Try alternative endpoints
            const altUrls = [
                      `${API_BASE_URL}/photos/${profile.profilePhoto?.split('/').pop()}`,
        `${API_BASE_URL}/api/students/profile/photo/${profile.profilePhoto?.split('/').pop()}`,
              profile.profilePhoto // Original URL as last resort
            ];

            let currentIndex = 0;
            const tryNextUrl = () => {
              if (currentIndex < altUrls.length) {
                e.currentTarget.src = altUrls[currentIndex];
                console.log(`🔄 [PublicProfile] Trying alternative URL ${currentIndex + 1}:`, altUrls[currentIndex]);
                currentIndex++;
              } else {
                // All URLs failed, show placeholder
                const placeholder = document.createElement('div');
                placeholder.style.cssText = `
                  width: 80px;
                  height: 80px;
                  border-radius: 40px;
                  background: #4285F4;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-size: 24px;
                  font-weight: bold;
                `;
                placeholder.textContent = `${profile?.firstName.charAt(0) || ''}${profile?.lastName.charAt(0) || ''}`;
                e.currentTarget.parentElement?.replaceChild(placeholder, e.currentTarget);
              }
            };

            e.currentTarget.onload = null;
            e.currentTarget.onerror = tryNextUrl;
            tryNextUrl();
          }}
          onLoad={() => {
            console.log('✅ [PublicProfile] Image loaded successfully:', imageUrl);
          }}
        />
      );
    } else {
      return (
        <Image
          source={{ uri: imageUrl }}
          style={styles.profilePhoto}
          onError={(error) => {
            console.error('❌ [PublicProfile] React Native Image error:', error);
            console.error('❌ Attempted URL:', imageUrl);
          }}
        />
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Public Profile Preview</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4285F4" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchPublicProfile}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : profile ? (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.photoSection}>
                {/* UPDATED: Use the new renderProfilePhoto function */}
                {renderProfilePhoto()}
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.nameText}>{profile.firstName} {profile.lastName}</Text>
                <Text style={styles.schoolText}>
                  {profile.school}{profile.major && ` • ${profile.major}`}
                </Text>
                {profile.graduationYear && (
                  <Text style={styles.graduationText}>Class of {profile.graduationYear}</Text>
                )}
                {profile.gpa && (
                  <Text style={styles.gpaText}>GPA: {profile.gpa}</Text>
                )}
              </View>
            </View>

            {/* Funding Progress */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Funding Progress</Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[styles.progressFill, { width: `${Math.min(progressPercentage, 100)}%` }]}
                  />
                </View>
                <View style={styles.fundingStats}>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>${profile.amountRaised.toLocaleString()}</Text>
                    <Text style={styles.statLabel}>Raised</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>${profile.fundingGoal.toLocaleString()}</Text>
                    <Text style={styles.statLabel}>Goal</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{profile.stats.totalDonations}</Text>
                    <Text style={styles.statLabel}>Donations</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Bio Section */}
            {(profile.bio || profile.personalStatement) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                {profile.bio && (
                  <Text style={styles.bioText}>{profile.bio}</Text>
                )}
                {profile.personalStatement && (
                  <View style={styles.personalStatement}>
                    <Text style={styles.subsectionTitle}>Personal Statement</Text>
                    <Text style={styles.bioText}>{profile.personalStatement}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Financial Need */}
            {profile.financialNeed && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Financial Need</Text>
                <Text style={styles.bioText}>{profile.financialNeed}</Text>
              </View>
            )}

            {/* Achievements */}
            {profile.achievements && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Achievements & Awards</Text>
                <Text style={styles.bioText}>{profile.achievements}</Text>
              </View>
            )}

            {/* Registry Items */}
            {profile.registries.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Registry Items ({profile.registries.length})</Text>
                {profile.registries.map((item, index) => (
                  <View key={index} style={styles.registryItem}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemName}>{item.itemName}</Text>
                      <View style={[styles.statusBadge, styles[item.fundedStatus as keyof typeof styles] || styles.pending]}>
                        <Text style={styles.statusBadgeText}>{item.fundedStatus}</Text>
                      </View>
                    </View>
                    <Text style={styles.itemCategory}>{item.category}</Text>
                    {item.description && (
                      <Text style={styles.itemDescription}>{item.description}</Text>
                    )}
                    <View style={styles.itemFunding}>
                      <View style={styles.fundingProgress}>
                        <View
                          style={[
                            styles.fundingBar,
                            { width: `${Math.min((item.amountFunded / item.price) * 100, 100)}%` }
                          ]}
                        />
                      </View>
                      <View style={styles.fundingText}>
                        <Text style={styles.fundedAmount}>${item.amountFunded}</Text>
                        <Text style={styles.totalAmount}> / ${item.price}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Contact Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Connect</Text>
              <View style={styles.contactLinks}>
                {profile.linkedinUrl && (
                  <TouchableOpacity
                    style={[styles.contactLink, styles.linkedinLink]}
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        window.open(profile.linkedinUrl, '_blank');
                      } else {
                        // Handle linking for React Native
                        console.log('Open LinkedIn:', profile.linkedinUrl);
                      }
                    }}
                  >
                    <Text style={styles.contactLinkText}>LinkedIn Profile</Text>
                  </TouchableOpacity>
                )}
                {profile.phoneNumber && (
                  <TouchableOpacity
                    style={[styles.contactLink, styles.phoneLink]}
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        window.location.href = `tel:${profile.phoneNumber}`;
                      } else {
                        // Handle phone call for React Native
                        console.log('Call:', profile.phoneNumber);
                      }
                    }}
                  >
                    <Text style={styles.contactLinkText}>{profile.phoneNumber}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Donation CTA */}
            <View style={styles.donationCTA}>
              <Text style={styles.ctaTitle}>Support {profile.firstName}'s Education</Text>
              <Text style={styles.ctaText}>
                Help {profile.firstName} achieve their educational goals by contributing to their funding or registry items.
              </Text>
              <TouchableOpacity
                style={styles.donateButton}
                onPress={() => setShowDonationForm(true)}
              >
                <Text style={styles.donateButtonText}>Make a Donation</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : null}
      </View>

      {/* Public Donation Form Modal */}
      {showDonationForm && profile && (
        <PublicDonationForm
          visible={showDonationForm}
          student={{
            id: profile.id || '',
            firstName: profile.firstName,
            lastName: profile.lastName,
            school: profile.school,
            major: profile.major,
            fundingGoal: profile.fundingGoal,
            amountRaised: profile.amountRaised,
            progressPercentage: profile.stats.fundingProgress,
            profileUrl: profileUrl || ''
          }}
          onClose={() => setShowDonationForm(false)}
          onDonationComplete={(donation: any) => {
            setShowDonationForm(false);
            onClose(); // Close the profile modal
            Alert.alert(
              'Donation Successful! 🎉',
              `Thank you for your donation of $${donation.amountInDollars} to ${profile.firstName}!`
            );
          }}
        />
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoSection: {
    marginRight: 20,
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profilePhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhotoText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  schoolText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 3,
  },
  graduationText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 3,
  },
  gpaText: {
    fontSize: 14,
    color: '#888',
  },
  section: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
    marginTop: 15,
  },
  progressContainer: {
    marginBottom: 15,
  },
  progressBar: {
    width: '100%',
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    marginBottom: 15,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4285F4',
    borderRadius: 5,
  },
  fundingStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  bioText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
  },
  personalStatement: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  registryItem: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    backgroundColor: '#fafafa',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'uppercase',
  },
  funded: {
    backgroundColor: '#4BB543',
  },
  partial: {
    backgroundColor: '#ffc107',
  },
  pending: {
    backgroundColor: '#6c757d',
  },
  needed: {
    backgroundColor: '#6c757d',
  },
  itemCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    textTransform: 'capitalize',
  },
  itemDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
  },
  itemFunding: {
    marginTop: 10,
  },
  fundingProgress: {
    width: '100%',
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginBottom: 5,
  },
  fundingBar: {
    height: '100%',
    backgroundColor: '#4285F4',
    borderRadius: 3,
  },
  fundingText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fundedAmount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  totalAmount: {
    fontSize: 12,
    color: '#666',
  },
  contactLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  contactLink: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 2,
  },
  linkedinLink: {
    backgroundColor: '#0077b5',
    borderColor: '#0077b5',
  },
  phoneLink: {
    backgroundColor: '#34A853',
    borderColor: '#34A853',
  },
  contactLinkText: {
    color: 'white',
    fontWeight: '500',
  },
  donationCTA: {
    backgroundColor: '#4285F4',
    margin: 15,
    padding: 25,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  ctaText: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 20,
  },
  donateButton: {
    backgroundColor: 'white',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
  },
  donateButtonText: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PublicProfileModal;




// import React, { useState, useEffect } from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   ScrollView,
//   StyleSheet,
//   TouchableOpacity,
//   Image,
//   ActivityIndicator,
//   Platform
// } from 'react-native';
//
// const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://3.234.140.112:3001';
//
// interface PublicProfile {
//   firstName: string;
//   lastName: string;
//   email: string;
//   school: string;
//   major?: string;
//   bio?: string;
//   profilePhoto?: string;
//   fundingGoal: number;
//   amountRaised: number;
//   graduationYear?: number;
//   gpa?: number;
//   achievements?: string;
//   financialNeed?: string;
//   phoneNumber?: string;
//   linkedinUrl?: string;
//   personalStatement?: string;
//   stats: {
//     totalDonations: number;
//     totalRegistryItems: number;
//     fundingProgress: number;
//   };
//   registries: Array<{
//     id: string;
//     itemName: string;
//     price: number;
//     category: string;
//     description?: string;
//     fundedStatus: string;
//     amountFunded: number;
//   }>;
// }
//
// interface PublicProfileModalProps {
//   visible: boolean;
//   onClose: () => void;
//   profileUrl: string;
// }
//
// const PublicProfileModal: React.FC<PublicProfileModalProps> = ({
//   visible,
//   onClose,
//   profileUrl
// }) => {
//   const [profile, setProfile] = useState<PublicProfile | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//
//   useEffect(() => {
//     if (visible && profileUrl) {
//       fetchPublicProfile();
//     }
//   }, [visible, profileUrl]);
//
//   const fetchPublicProfile = async () => {
//     try {
//       setLoading(true);
//       setError('');
//
//       const response = await fetch(`${API_BASE_URL}/api/students/public/${profileUrl}`);
//
//       if (!response.ok) {
//         throw new Error(`Profile not found (${response.status})`);
//       }
//
//       const data = await response.json();
//
//       if (data.success && data.student) {
//         // Map the API response to our interface
//         const profileData = {
//           firstName: data.student.firstName,
//           lastName: data.student.lastName,
//           email: data.student.email,
//           school: data.student.schoolName || data.student.school || '',
//           major: data.student.major || '',
//           bio: data.student.bio || '',
//           profilePhoto: data.student.profilePhoto || '',
//           fundingGoal: data.student.fundingGoal || 0,
//           amountRaised: data.student.amountRaised || 0,
//           graduationYear: data.student.graduationYear,
//           gpa: data.student.gpa,
//           achievements: data.student.achievements || '',
//           financialNeed: data.student.financialNeed || '',
//           phoneNumber: data.student.phoneNumber || '',
//           linkedinUrl: data.student.linkedinUrl || '',
//           personalStatement: data.student.personalStatement || '',
//           stats: data.student.stats || {
//             totalDonations: 0,
//             totalRegistryItems: 0,
//             fundingProgress: 0,
//           },
//           registries: data.student.registries || []
//         };
//         setProfile(profileData);
//       } else {
//         setError('Profile not found or not public');
//       }
//     } catch (error) {
//       console.error('Error fetching public profile:', error);
//       setError(error instanceof Error ? error.message : 'Failed to load profile');
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   const progressPercentage = profile?.fundingGoal && profile.fundingGoal > 0
//     ? Math.min((profile.amountRaised / profile.fundingGoal) * 100, 100)
//     : 0;
//
//   console.log('[PublicProfileModal] Debug - Profile data:', {
//     fundingGoal: profile?.fundingGoal,
//     amountRaised: profile?.amountRaised,
//     progressPercentage
//   });
//
//   return (
//     <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
//       <View style={styles.container}>
//         {/* Header */}
//         <View style={styles.header}>
//           <Text style={styles.title}>Public Profile Preview</Text>
//           <TouchableOpacity onPress={onClose} style={styles.closeButton}>
//             <Text style={styles.closeButtonText}>✕</Text>
//           </TouchableOpacity>
//         </View>
//
//         {loading ? (
//           <View style={styles.loadingContainer}>
//             <ActivityIndicator size="large" color="#4285F4" />
//             <Text style={styles.loadingText}>Loading profile...</Text>
//           </View>
//         ) : error ? (
//           <View style={styles.errorContainer}>
//             <Text style={styles.errorText}>{error}</Text>
//             <TouchableOpacity style={styles.retryButton} onPress={fetchPublicProfile}>
//               <Text style={styles.retryButtonText}>Retry</Text>
//             </TouchableOpacity>
//           </View>
//         ) : profile ? (
//           <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
//             {/* Profile Header */}
//             <View style={styles.profileHeader}>
//               <View style={styles.photoSection}>
//                 {profile.profilePhoto ? (
//                   <Image source={{ uri: profile.profilePhoto }} style={styles.profilePhoto} />
//                 ) : (
//                   <View style={styles.profilePhotoPlaceholder}>
//                     <Text style={styles.profilePhotoText}>
//                       {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
//                     </Text>
//                   </View>
//                 )}
//               </View>
//               <View style={styles.profileInfo}>
//                 <Text style={styles.nameText}>{profile.firstName} {profile.lastName}</Text>
//                 <Text style={styles.schoolText}>
//                   {profile.school} {profile.major && `• ${profile.major}`}
//                 </Text>
//                 {profile.graduationYear && (
//                   <Text style={styles.graduationText}>Class of {profile.graduationYear}</Text>
//                 )}
//                 {profile.gpa && (
//                   <Text style={styles.gpaText}>GPA: {profile.gpa}</Text>
//                 )}
//               </View>
//             </View>
//
//             {/* Funding Progress */}
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>Funding Progress</Text>
//               <View style={styles.progressContainer}>
//                 <View style={styles.progressBar}>
//                   <View
//                     style={[styles.progressFill, { width: `${Math.min(progressPercentage, 100)}%` }]}
//                   />
//                 </View>
//                 <View style={styles.fundingStats}>
//                   <View style={styles.stat}>
//                     <Text style={styles.statValue}>${profile.amountRaised.toLocaleString()}</Text>
//                     <Text style={styles.statLabel}>Raised</Text>
//                   </View>
//                   <View style={styles.stat}>
//                     <Text style={styles.statValue}>${profile.fundingGoal.toLocaleString()}</Text>
//                     <Text style={styles.statLabel}>Goal</Text>
//                   </View>
//                   <View style={styles.stat}>
//                     <Text style={styles.statValue}>{profile.stats.totalDonations}</Text>
//                     <Text style={styles.statLabel}>Donations</Text>
//                   </View>
//                 </View>
//               </View>
//             </View>
//
//             {/* Bio Section */}
//             {(profile.bio || profile.personalStatement) && (
//               <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>About</Text>
//                 {profile.bio && (
//                   <Text style={styles.bioText}>{profile.bio}</Text>
//                 )}
//                 {profile.personalStatement && (
//                   <View style={styles.personalStatement}>
//                     <Text style={styles.subsectionTitle}>Personal Statement</Text>
//                     <Text style={styles.bioText}>{profile.personalStatement}</Text>
//                   </View>
//                 )}
//               </View>
//             )}
//
//             {/* Financial Need */}
//             {profile.financialNeed && (
//               <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Financial Need</Text>
//                 <Text style={styles.bioText}>{profile.financialNeed}</Text>
//               </View>
//             )}
//
//             {/* Achievements */}
//             {profile.achievements && (
//               <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Achievements & Awards</Text>
//                 <Text style={styles.bioText}>{profile.achievements}</Text>
//               </View>
//             )}
//
//             {/* Registry Items */}
//             {profile.registries.length > 0 && (
//               <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Registry Items ({profile.registries.length})</Text>
//                 {profile.registries.map((item, index) => (
//                   <View key={index} style={styles.registryItem}>
//                     <View style={styles.itemHeader}>
//                       <Text style={styles.itemName}>{item.itemName}</Text>
//                       <View style={[styles.statusBadge, styles[item.fundedStatus as keyof typeof styles] || styles.pending]}>
//                         <Text style={styles.statusBadgeText}>{item.fundedStatus}</Text>
//                       </View>
//                     </View>
//                     <Text style={styles.itemCategory}>{item.category}</Text>
//                     {item.description && (
//                       <Text style={styles.itemDescription}>{item.description}</Text>
//                     )}
//                     <View style={styles.itemFunding}>
//                       <View style={styles.fundingProgress}>
//                         <View
//                           style={[
//                             styles.fundingBar,
//                             { width: `${Math.min((item.amountFunded / item.price) * 100, 100)}%` }
//                           ]}
//                         />
//                       </View>
//                       <View style={styles.fundingText}>
//                         <Text style={styles.fundedAmount}>${item.amountFunded}</Text>
//                         <Text style={styles.totalAmount}> / ${item.price}</Text>
//                       </View>
//                     </View>
//                   </View>
//                 ))}
//               </View>
//             )}
//
//             {/* Contact Information */}
//             <View style={styles.section}>
//               <Text style={styles.sectionTitle}>Connect</Text>
//               <View style={styles.contactLinks}>
//                 {profile.linkedinUrl && (
//                   <TouchableOpacity
//                     style={[styles.contactLink, styles.linkedinLink]}
//                     onPress={() => {
//                       if (Platform.OS === 'web') {
//                         window.open(profile.linkedinUrl, '_blank');
//                       } else {
//                         // Handle linking for React Native
//                         console.log('Open LinkedIn:', profile.linkedinUrl);
//                       }
//                     }}
//                   >
//                     <Text style={styles.contactLinkText}>LinkedIn Profile</Text>
//                   </TouchableOpacity>
//                 )}
//                 {profile.phoneNumber && (
//                   <TouchableOpacity
//                     style={[styles.contactLink, styles.phoneLink]}
//                     onPress={() => {
//                       if (Platform.OS === 'web') {
//                         window.location.href = `tel:${profile.phoneNumber}`;
//                       } else {
//                         // Handle phone call for React Native
//                         console.log('Call:', profile.phoneNumber);
//                       }
//                     }}
//                   >
//                     <Text style={styles.contactLinkText}>{profile.phoneNumber}</Text>
//                   </TouchableOpacity>
//                 )}
//               </View>
//             </View>
//
//             {/* Donation CTA */}
//             <View style={styles.donationCTA}>
//               <Text style={styles.ctaTitle}>Support {profile.firstName}'s Education</Text>
//               <Text style={styles.ctaText}>
//                 Help {profile.firstName} achieve their educational goals by contributing to their funding or registry items.
//               </Text>
//               <TouchableOpacity
//                 style={styles.donateButton}
//                 onPress={() => {
//                   // Handle donation
//                   console.log('Donate button pressed');
//                 }}
//               >
//                 <Text style={styles.donateButtonText}>Make a Donation</Text>
//               </TouchableOpacity>
//             </View>
//           </ScrollView>
//         ) : null}
//       </View>
//     </Modal>
//   );
// };
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f8f9fa',
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: 20,
//     backgroundColor: '#fff',
//     borderBottomWidth: 1,
//     borderBottomColor: '#e9ecef',
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#2c3e50',
//   },
//   closeButton: {
//     padding: 8,
//   },
//   closeButtonText: {
//     fontSize: 18,
//     color: '#6c757d',
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loadingText: {
//     marginTop: 15,
//     fontSize: 16,
//     color: '#666',
//   },
//   errorContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//   },
//   errorText: {
//     fontSize: 16,
//     color: '#ff6b6b',
//     textAlign: 'center',
//     marginBottom: 20,
//   },
//   retryButton: {
//     backgroundColor: '#4285F4',
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//     borderRadius: 8,
//   },
//   retryButtonText: {
//     color: 'white',
//     fontWeight: 'bold',
//   },
//   scrollView: {
//     flex: 1,
//   },
//   profileHeader: {
//     flexDirection: 'row',
//     padding: 20,
//     backgroundColor: 'white',
//     margin: 15,
//     borderRadius: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   photoSection: {
//     marginRight: 20,
//   },
//   profilePhoto: {
//     width: 80,
//     height: 80,
//     borderRadius: 40,
//   },
//   profilePhotoPlaceholder: {
//     width: 80,
//     height: 80,
//     borderRadius: 40,
//     backgroundColor: '#4285F4',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   profilePhotoText: {
//     color: 'white',
//     fontSize: 24,
//     fontWeight: 'bold',
//   },
//   profileInfo: {
//     flex: 1,
//   },
//   nameText: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#2c3e50',
//     marginBottom: 5,
//   },
//   schoolText: {
//     fontSize: 16,
//     color: '#666',
//     marginBottom: 3,
//   },
//   graduationText: {
//     fontSize: 14,
//     color: '#888',
//     marginBottom: 3,
//   },
//   gpaText: {
//     fontSize: 14,
//     color: '#888',
//   },
//   section: {
//     backgroundColor: 'white',
//     margin: 15,
//     padding: 20,
//     borderRadius: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#2c3e50',
//     marginBottom: 15,
//   },
//   subsectionTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#2c3e50',
//     marginBottom: 10,
//     marginTop: 15,
//   },
//   progressContainer: {
//     marginBottom: 15,
//   },
//   progressBar: {
//     width: '100%',
//     height: 10,
//     backgroundColor: '#e0e0e0',
//     borderRadius: 5,
//     marginBottom: 15,
//   },
//   progressFill: {
//     height: '100%',
//     backgroundColor: '#4285F4',
//     borderRadius: 5,
//   },
//   fundingStats: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//   },
//   stat: {
//     alignItems: 'center',
//   },
//   statValue: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#4285F4',
//     marginBottom: 5,
//   },
//   statLabel: {
//     fontSize: 12,
//     color: '#666',
//     textTransform: 'uppercase',
//   },
//   bioText: {
//     fontSize: 16,
//     lineHeight: 24,
//     color: '#555',
//   },
//   personalStatement: {
//     marginTop: 15,
//     paddingTop: 15,
//     borderTopWidth: 1,
//     borderTopColor: '#eee',
//   },
//   registryItem: {
//     borderWidth: 1,
//     borderColor: '#e0e0e0',
//     borderRadius: 8,
//     padding: 15,
//     marginBottom: 15,
//     backgroundColor: '#fafafa',
//   },
//   itemHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   itemName: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#2c3e50',
//     flex: 1,
//   },
//   statusBadge: {
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   statusBadgeText: {
//     fontSize: 10,
//     fontWeight: 'bold',
//     color: 'white',
//     textTransform: 'uppercase',
//   },
//   funded: {
//     backgroundColor: '#4BB543',
//   },
//   partial: {
//     backgroundColor: '#ffc107',
//   },
//   pending: {
//     backgroundColor: '#6c757d',
//   },
//   needed: {
//     backgroundColor: '#6c757d',
//   },
//   itemCategory: {
//     fontSize: 14,
//     color: '#666',
//     marginBottom: 5,
//     textTransform: 'capitalize',
//   },
//   itemDescription: {
//     fontSize: 14,
//     color: '#555',
//     marginBottom: 10,
//   },
//   itemFunding: {
//     marginTop: 10,
//   },
//   fundingProgress: {
//     width: '100%',
//     height: 6,
//     backgroundColor: '#e0e0e0',
//     borderRadius: 3,
//     marginBottom: 5,
//   },
//   fundingBar: {
//     height: '100%',
//     backgroundColor: '#4285F4',
//     borderRadius: 3,
//   },
//   fundingText: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   fundedAmount: {
//     fontSize: 12,
//     fontWeight: 'bold',
//     color: '#4285F4',
//   },
//   totalAmount: {
//     fontSize: 12,
//     color: '#666',
//   },
//   contactLinks: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 10,
//   },
//   contactLink: {
//     paddingHorizontal: 15,
//     paddingVertical: 10,
//     borderRadius: 6,
//     borderWidth: 2,
//   },
//   linkedinLink: {
//     backgroundColor: '#0077b5',
//     borderColor: '#0077b5',
//   },
//   phoneLink: {
//     backgroundColor: '#34A853',
//     borderColor: '#34A853',
//   },
//   contactLinkText: {
//     color: 'white',
//     fontWeight: '500',
//   },
//   donationCTA: {
//     backgroundColor: '#4285F4',
//     margin: 15,
//     padding: 25,
//     borderRadius: 12,
//     alignItems: 'center',
//   },
//   ctaTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: 'white',
//     marginBottom: 10,
//     textAlign: 'center',
//   },
//   ctaText: {
//     fontSize: 16,
//     color: 'white',
//     opacity: 0.9,
//     textAlign: 'center',
//     marginBottom: 20,
//   },
//   donateButton: {
//     backgroundColor: 'white',
//     paddingHorizontal: 25,
//     paddingVertical: 12,
//     borderRadius: 8,
//   },
//   donateButtonText: {
//     color: '#4285F4',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
// });
//
// export default PublicProfileModal;