// frontend/src/components/donor/StudentBrowser.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  Alert,
  Platform
} from 'react-native';
import { API_BASE_URL } from '../../config/api';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  school: string;
  major?: string;
  graduationYear?: string;
  bio?: string;
  profilePhoto?: string;
  location?: string;
  fundingGoal: number;
  amountRaised: number;
  verified: boolean;
  tags: string[];
  urgency: string;
  lastActive: string;
  profileUrl: string;
  totalDonations: number;
  progressPercentage: number;
}

interface StudentBrowserProps {
  token: string;
  onStudentSelect: (student: Student) => void;
  onBack: () => void;
  onQuickDonation?: (student: Student, amount: number) => void;
}

const StudentBrowser: React.FC<StudentBrowserProps> = ({ token, onStudentSelect, onBack, onQuickDonation }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);

  // ADDED: Image URL processing function (same as other components)
  const getImageUrl = (profilePhoto: string) => {
    if (!profilePhoto) return null;

    console.log('🖼️ [StudentBrowser] Processing image URL:', profilePhoto);

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
    console.log('✅ [StudentBrowser] Using simple image URL:', imageUrl);
    return imageUrl;
  };

  useEffect(() => {
    fetchStudents(true);
  }, [searchQuery]);

  const fetchStudents = async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchQuery && { search: searchQuery })
      });

      console.log('Fetching students with params:', params.toString());

      const response = await fetch(`${API_BASE_URL}/api/donors/students?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Students response status:', response.status);
      const data = await response.json();
      console.log('Students data:', data);

      if (data.success) {
        if (reset) {
          setStudents(data.data.students);
          setPage(2);
        } else {
          setStudents(prev => [...prev, ...data.data.students]);
          setPage(prev => prev + 1);
        }
        setHasMore(data.data.pagination.hasNext);
        setTotalStudents(data.data.pagination.total);
      } else {
        console.error('Failed to fetch students:', data.message);
        Alert.alert('Error', 'Failed to load students. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchStudents(true);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchStudents(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString()}`;
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high': return '#ff6b6b';
      case 'medium': return '#ffa726';
      case 'low': return '#66bb6a';
      default: return '#888';
    }
  };

  // UPDATED: Enhanced profile image rendering with proper URL processing
  const renderProfileImage = (item: Student) => {
    if (!item.profilePhoto) {
      return (
        <View style={styles.profilePlaceholder}>
          <Text style={styles.profileInitials}>
            {item.firstName[0]}{item.lastName[0]}
          </Text>
        </View>
      );
    }

    const imageUrl = getImageUrl(item.profilePhoto);

    if (Platform.OS === 'web') {
      return (
        <img
          src={imageUrl}
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            objectFit: 'cover',
            marginRight: 12,
            border: '2px solid rgba(255, 255, 255, 0.1)',
            background: '#333',
          }}
          alt="Profile"
          crossOrigin="anonymous"
          onError={(e) => {
            console.error('❌ [StudentBrowser] Image failed to load:', imageUrl);
            console.error('❌ Original profilePhoto:', item.profilePhoto);
            e.currentTarget.onerror = null;

            // Try alternative endpoints
            const altUrls = [
                      `${API_BASE_URL}/photos/${item.profilePhoto?.split('/').pop()}`,
        `${API_BASE_URL}/api/students/profile/photo/${item.profilePhoto?.split('/').pop()}`,
              item.profilePhoto // Original URL as last resort
            ];

            let currentIndex = 0;
            const tryNextUrl = () => {
              if (currentIndex < altUrls.length) {
                e.currentTarget.src = altUrls[currentIndex];
                console.log(`🔄 [StudentBrowser] Trying alternative URL ${currentIndex + 1}:`, altUrls[currentIndex]);
                currentIndex++;
              } else {
                // All URLs failed, show placeholder
                const placeholder = document.createElement('div');
                placeholder.style.cssText = `
                  width: 60px;
                  height: 60px;
                  border-radius: 30px;
                  background: #34A853;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin-right: 12px;
                  color: white;
                  font-size: 20px;
                  font-weight: bold;
                `;
                placeholder.textContent = `${item.firstName[0]}${item.lastName[0]}`;
                e.currentTarget.parentElement?.replaceChild(placeholder, e.currentTarget);
              }
            };

            e.currentTarget.onload = null;
            e.currentTarget.onerror = tryNextUrl;
            tryNextUrl();
          }}
          onLoad={() => {
            console.log('✅ [StudentBrowser] Image loaded successfully:', imageUrl);
          }}
        />
      );
    } else {
      return (
        <Image
          source={{ uri: imageUrl }}
          style={styles.profileImage}
          onError={(error) => {
            console.error('❌ [StudentBrowser] React Native Image error:', error);
            console.error('❌ Attempted URL:', imageUrl);
          }}
        />
      );
    }
  };

  const renderStudent = ({ item }: { item: Student }) => (
    <TouchableOpacity
      style={styles.studentCard}
      onPress={() => onStudentSelect(item)}
    >
      <View style={styles.studentHeader}>
        {/* UPDATED: Use the new renderProfileImage function */}
        {renderProfileImage(item)}

        <View style={styles.studentInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.studentName}>{item.firstName} {item.lastName}</Text>
            {item.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}
          </View>
          <Text style={styles.studentSchool}>{item.school}</Text>
          {item.major && <Text style={styles.studentMajor}>{item.major}</Text>}
          {item.graduationYear && (
            <Text style={styles.graduationYear}>Class of {item.graduationYear}</Text>
          )}
        </View>

        <View style={styles.urgencyContainer}>
          <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(item.urgency) }]}>
            <Text style={styles.urgencyText}>{item.urgency}</Text>
          </View>
        </View>
      </View>

      {item.bio && (
        <Text style={styles.studentBio} numberOfLines={2}>
          {item.bio}
        </Text>
      )}

      {item.tags && item.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {item.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {item.tags.length > 3 && (
            <Text style={styles.moreTags}>+{item.tags.length - 3} more</Text>
          )}
        </View>
      )}

      <View style={styles.progressSection}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {formatCurrency(item.amountRaised)} raised of {formatCurrency(item.fundingGoal)} goal
          </Text>
          <Text style={styles.donationCount}>
            {item.totalDonations} donations • {item.progressPercentage}% funded
          </Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(item.progressPercentage, 100)}%` }
              ]}
            />
          </View>
        </View>
      </View>

      {item.location && (
        <Text style={styles.locationText}>📍 {item.location}</Text>
      )}

      {/* Quick Donation Buttons */}
      {onQuickDonation && (
        <View style={styles.quickDonationContainer}>
          <Text style={styles.quickDonationTitle}>Quick Donation</Text>
          <View style={styles.donationButtons}>
            {[25, 50, 100].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={styles.donationButton}
                onPress={() => onQuickDonation(item, amount)}
              >
                <Text style={styles.donationButtonText}>${amount}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.donationButton, styles.customAmountButton]}
              onPress={() => onStudentSelect(item)}
            >
              <Text style={styles.donationButtonText}>Custom</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerTop}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Discover Students</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, school, or major..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <Text style={styles.resultCount}>
        {totalStudents} students looking for support
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loading || refreshing) return null;

    return (
      <View style={styles.footerLoader}>
        <Text style={styles.loadingText}>Loading more students...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.loadingText}>Loading students...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No students found</Text>
        <Text style={styles.emptyText}>
          {searchQuery
            ? 'Try adjusting your search terms'
            : 'Check back later for new students seeking support'
          }
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={students}
        renderItem={renderStudent}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121824',
  },
  headerContainer: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: 'rgba(25, 26, 45, 0.9)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
  },
  backButtonText: {
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
    width: 60,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  resultCount: {
    color: '#a3b3ff',
    fontSize: 14,
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  studentCard: {
    backgroundColor: 'rgba(25, 26, 45, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  studentHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  profilePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#34A853',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileInitials: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  studentInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
  verifiedBadge: {
    backgroundColor: '#4285F4',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  studentSchool: {
    fontSize: 14,
    color: '#a3b3ff',
    marginBottom: 2,
  },
  studentMajor: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  graduationYear: {
    fontSize: 12,
    color: '#888',
  },
  urgencyContainer: {
    alignItems: 'flex-end',
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  studentBio: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    alignItems: 'center',
  },
  tag: {
    backgroundColor: 'rgba(52, 168, 83, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    color: '#34A853',
    fontSize: 10,
    fontWeight: 'bold',
  },
  moreTags: {
    color: '#888',
    fontSize: 10,
    fontStyle: 'italic',
  },
  progressSection: {
    marginBottom: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  donationCount: {
    fontSize: 12,
    color: '#888',
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34A853',
    borderRadius: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },
  footerLoader: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  quickDonationContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickDonationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  donationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  donationButton: {
    backgroundColor: '#34A853',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  customAmountButton: {
    backgroundColor: '#4285F4',
  },
  donationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default StudentBrowser;





// // frontend/src/components/donor/StudentBrowser.tsx
// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList,
//   TouchableOpacity,
//   TextInput,
//   Image,
//   RefreshControl,
//   Alert
// } from 'react-native';
// import { API_BASE_URL } from '../../config/api';
//
// interface Student {
//   id: string;
//   firstName: string;
//   lastName: string;
//   school: string;
//   major?: string;
//   graduationYear?: string;
//   bio?: string;
//   profilePhoto?: string;
//   location?: string;
//   fundingGoal: number;
//   amountRaised: number;
//   verified: boolean;
//   tags: string[];
//   urgency: string;
//   lastActive: string;
//   profileUrl: string;
//   totalDonations: number;
//   progressPercentage: number;
// }
//
// interface StudentBrowserProps {
//   token: string;
//   onStudentSelect: (student: Student) => void;
//   onBack: () => void;
//   onQuickDonation?: (student: Student, amount: number) => void;
// }
//
// const StudentBrowser: React.FC<StudentBrowserProps> = ({ token, onStudentSelect, onBack, onQuickDonation }) => {
//   const [students, setStudents] = useState<Student[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [page, setPage] = useState(1);
//   const [hasMore, setHasMore] = useState(true);
//   const [totalStudents, setTotalStudents] = useState(0);
//
//   useEffect(() => {
//     fetchStudents(true);
//   }, [searchQuery]);
//
//   const fetchStudents = async (reset = false) => {
//     try {
//       const currentPage = reset ? 1 : page;
//       const params = new URLSearchParams({
//         page: currentPage.toString(),
//         limit: '10',
//         ...(searchQuery && { search: searchQuery })
//       });
//
//       console.log('Fetching students with params:', params.toString());
//
// //       const response = await fetch(`${API_BASE_URL}/api/donors/public/students?${params}`, {
// //         headers: {
// //           'Content-Type': 'application/json'
// //         }
// //       });
//       const response = await fetch(`${API_BASE_URL}/api/donors/students?${params}`, {
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         }
//       });
//
//       console.log('Students response status:', response.status);
//       const data = await response.json();
//       console.log('Students data:', data);
//
//       if (data.success) {
//         if (reset) {
//           setStudents(data.data.students);
//           setPage(2);
//         } else {
//           setStudents(prev => [...prev, ...data.data.students]);
//           setPage(prev => prev + 1);
//         }
//         setHasMore(data.data.pagination.hasNext);
//         setTotalStudents(data.data.pagination.total);
//       } else {
//         console.error('Failed to fetch students:', data.message);
//         Alert.alert('Error', 'Failed to load students. Please try again.');
//       }
//     } catch (error) {
//       console.error('Error fetching students:', error);
//       Alert.alert('Error', 'Network error. Please check your connection and try again.');
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };
//
//   const onRefresh = () => {
//     setRefreshing(true);
//     setPage(1);
//     fetchStudents(true);
//   };
//
//   const loadMore = () => {
//     if (!loading && hasMore) {
//       fetchStudents(false);
//     }
//   };
//
//   const formatCurrency = (amount: number) => {
//     return `$${amount.toLocaleString()}`;
//   };
//
//   const getUrgencyColor = (urgency: string) => {
//     switch (urgency.toLowerCase()) {
//       case 'high': return '#ff6b6b';
//       case 'medium': return '#ffa726';
//       case 'low': return '#66bb6a';
//       default: return '#888';
//     }
//   };
//
//   const renderStudent = ({ item }: { item: Student }) => (
//     <TouchableOpacity
//       style={styles.studentCard}
//       onPress={() => onStudentSelect(item)}
//     >
//       <View style={styles.studentHeader}>
//         {item.profilePhoto ? (
//           <Image source={{ uri: item.profilePhoto }} style={styles.profileImage} />
//         ) : (
//           <View style={styles.profilePlaceholder}>
//             <Text style={styles.profileInitials}>
//               {item.firstName[0]}{item.lastName[0]}
//             </Text>
//           </View>
//         )}
//
//         <View style={styles.studentInfo}>
//           <View style={styles.nameRow}>
//             <Text style={styles.studentName}>{item.firstName} {item.lastName}</Text>
//             {item.verified && (
//               <View style={styles.verifiedBadge}>
//                 <Text style={styles.verifiedText}>✓</Text>
//               </View>
//             )}
//           </View>
//           <Text style={styles.studentSchool}>{item.school}</Text>
//           {item.major && <Text style={styles.studentMajor}>{item.major}</Text>}
//           {item.graduationYear && (
//             <Text style={styles.graduationYear}>Class of {item.graduationYear}</Text>
//           )}
//         </View>
//
//         <View style={styles.urgencyContainer}>
//           <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(item.urgency) }]}>
//             <Text style={styles.urgencyText}>{item.urgency}</Text>
//           </View>
//         </View>
//       </View>
//
//       {item.bio && (
//         <Text style={styles.studentBio} numberOfLines={2}>
//           {item.bio}
//         </Text>
//       )}
//
//       {item.tags && item.tags.length > 0 && (
//         <View style={styles.tagsContainer}>
//           {item.tags.slice(0, 3).map((tag, index) => (
//             <View key={index} style={styles.tag}>
//               <Text style={styles.tagText}>{tag}</Text>
//             </View>
//           ))}
//           {item.tags.length > 3 && (
//             <Text style={styles.moreTags}>+{item.tags.length - 3} more</Text>
//           )}
//         </View>
//       )}
//
//       <View style={styles.progressSection}>
//         <View style={styles.progressInfo}>
//           <Text style={styles.progressText}>
//             {formatCurrency(item.amountRaised)} raised of {formatCurrency(item.fundingGoal)} goal
//           </Text>
//           <Text style={styles.donationCount}>
//             {item.totalDonations} donations • {item.progressPercentage}% funded
//           </Text>
//         </View>
//
//         <View style={styles.progressBarContainer}>
//           <View style={styles.progressBar}>
//             <View
//               style={[
//                 styles.progressFill,
//                 { width: `${Math.min(item.progressPercentage, 100)}%` }
//               ]}
//             />
//           </View>
//         </View>
//       </View>
//
//       {item.location && (
//         <Text style={styles.locationText}>📍 {item.location}</Text>
//       )}
//
//       {/* Quick Donation Buttons */}
//       {onQuickDonation && (
//         <View style={styles.quickDonationContainer}>
//           <Text style={styles.quickDonationTitle}>Quick Donation</Text>
//           <View style={styles.donationButtons}>
//             {[25, 50, 100].map((amount) => (
//               <TouchableOpacity
//                 key={amount}
//                 style={styles.donationButton}
//                 onPress={() => onQuickDonation(item, amount)}
//               >
//                 <Text style={styles.donationButtonText}>${amount}</Text>
//               </TouchableOpacity>
//             ))}
//             <TouchableOpacity
//               style={[styles.donationButton, styles.customAmountButton]}
//               onPress={() => onStudentSelect(item)}
//             >
//               <Text style={styles.donationButtonText}>Custom</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       )}
//     </TouchableOpacity>
//   );
//
//   const renderHeader = () => (
//     <View style={styles.headerContainer}>
//       <View style={styles.headerTop}>
//         <TouchableOpacity style={styles.backButton} onPress={onBack}>
//           <Text style={styles.backButtonText}>← Back</Text>
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Discover Students</Text>
//         <View style={styles.headerSpacer} />
//       </View>
//
//       <View style={styles.searchContainer}>
//         <TextInput
//           style={styles.searchInput}
//           placeholder="Search by name, school, or major..."
//           placeholderTextColor="#888"
//           value={searchQuery}
//           onChangeText={setSearchQuery}
//         />
//       </View>
//
//       <Text style={styles.resultCount}>
//         {totalStudents} students looking for support
//       </Text>
//     </View>
//   );
//
//   const renderFooter = () => {
//     if (!loading || refreshing) return null;
//
//     return (
//       <View style={styles.footerLoader}>
//         <Text style={styles.loadingText}>Loading more students...</Text>
//       </View>
//     );
//   };
//
//   const renderEmpty = () => {
//     if (loading) {
//       return (
//         <View style={styles.emptyContainer}>
//           <Text style={styles.loadingText}>Loading students...</Text>
//         </View>
//       );
//     }
//
//     return (
//       <View style={styles.emptyContainer}>
//         <Text style={styles.emptyTitle}>No students found</Text>
//         <Text style={styles.emptyText}>
//           {searchQuery
//             ? 'Try adjusting your search terms'
//             : 'Check back later for new students seeking support'
//           }
//         </Text>
//       </View>
//     );
//   };
//
//   return (
//     <View style={styles.container}>
//       <FlatList
//         data={students}
//         renderItem={renderStudent}
//         keyExtractor={(item) => item.id}
//         ListHeaderComponent={renderHeader}
//         ListFooterComponent={renderFooter}
//         ListEmptyComponent={renderEmpty}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//         }
//         onEndReached={loadMore}
//         onEndReachedThreshold={0.5}
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={styles.listContainer}
//       />
//     </View>
//   );
// };
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#121824',
//   },
//   headerContainer: {
//     padding: 20,
//     paddingTop: 40,
//     backgroundColor: 'rgba(25, 26, 45, 0.9)',
//   },
//   headerTop: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 20,
//   },
//   backButton: {
//     paddingVertical: 8,
//     paddingHorizontal: 12,
//     backgroundColor: 'rgba(255, 255, 255, 0.1)',
//     borderRadius: 6,
//   },
//   backButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   headerTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#fff',
//   },
//   headerSpacer: {
//     width: 60,
//   },
//   searchContainer: {
//     marginBottom: 16,
//   },
//   searchInput: {
//     backgroundColor: 'rgba(255, 255, 255, 0.08)',
//     borderRadius: 8,
//     padding: 12,
//     color: '#fff',
//     fontSize: 16,
//   },
//   resultCount: {
//     color: '#a3b3ff',
//     fontSize: 14,
//     textAlign: 'center',
//   },
//   listContainer: {
//     paddingBottom: 20,
//   },
//   studentCard: {
//     backgroundColor: 'rgba(25, 26, 45, 0.8)',
//     borderRadius: 12,
//     padding: 16,
//     marginHorizontal: 16,
//     marginVertical: 8,
//     borderWidth: 1,
//     borderColor: 'rgba(255, 255, 255, 0.1)',
//   },
//   studentHeader: {
//     flexDirection: 'row',
//     marginBottom: 12,
//     alignItems: 'flex-start',
//   },
//   profileImage: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     marginRight: 12,
//   },
//   profilePlaceholder: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     backgroundColor: '#34A853',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 12,
//   },
//   profileInitials: {
//     color: '#fff',
//     fontSize: 20,
//     fontWeight: 'bold',
//   },
//   studentInfo: {
//     flex: 1,
//   },
//   nameRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 4,
//   },
//   studentName: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#fff',
//     marginRight: 8,
//   },
//   verifiedBadge: {
//     backgroundColor: '#4285F4',
//     borderRadius: 10,
//     width: 20,
//     height: 20,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   verifiedText: {
//     color: '#fff',
//     fontSize: 12,
//     fontWeight: 'bold',
//   },
//   studentSchool: {
//     fontSize: 14,
//     color: '#a3b3ff',
//     marginBottom: 2,
//   },
//   studentMajor: {
//     fontSize: 12,
//     color: '#888',
//     marginBottom: 2,
//   },
//   graduationYear: {
//     fontSize: 12,
//     color: '#888',
//   },
//   urgencyContainer: {
//     alignItems: 'flex-end',
//   },
//   urgencyBadge: {
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   urgencyText: {
//     color: '#fff',
//     fontSize: 10,
//     fontWeight: 'bold',
//     textTransform: 'uppercase',
//   },
//   studentBio: {
//     fontSize: 14,
//     color: '#ccc',
//     lineHeight: 20,
//     marginBottom: 12,
//   },
//   tagsContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     marginBottom: 12,
//     alignItems: 'center',
//   },
//   tag: {
//     backgroundColor: 'rgba(52, 168, 83, 0.2)',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//     marginRight: 6,
//     marginBottom: 4,
//   },
//   tagText: {
//     color: '#34A853',
//     fontSize: 10,
//     fontWeight: 'bold',
//   },
//   moreTags: {
//     color: '#888',
//     fontSize: 10,
//     fontStyle: 'italic',
//   },
//   progressSection: {
//     marginBottom: 8,
//   },
//   progressInfo: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   progressText: {
//     fontSize: 14,
//     color: '#fff',
//     fontWeight: 'bold',
//   },
//   donationCount: {
//     fontSize: 12,
//     color: '#888',
//   },
//   progressBarContainer: {
//     marginBottom: 8,
//   },
//   progressBar: {
//     height: 8,
//     backgroundColor: 'rgba(255, 255, 255, 0.1)',
//     borderRadius: 4,
//   },
//   progressFill: {
//     height: '100%',
//     backgroundColor: '#34A853',
//     borderRadius: 4,
//   },
//   locationText: {
//     fontSize: 12,
//     color: '#888',
//     textAlign: 'right',
//   },
//   footerLoader: {
//     padding: 20,
//     alignItems: 'center',
//   },
//   loadingText: {
//     color: '#888',
//     fontSize: 14,
//   },
//   emptyContainer: {
//     padding: 40,
//     alignItems: 'center',
//   },
//   emptyTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#fff',
//     marginBottom: 8,
//   },
//   emptyText: {
//     fontSize: 14,
//     color: '#888',
//     textAlign: 'center',
//     lineHeight: 20,
//   },
//   quickDonationContainer: {
//     marginTop: 12,
//     paddingTop: 12,
//     borderTopWidth: 1,
//     borderTopColor: 'rgba(255, 255, 255, 0.1)',
//   },
//   quickDonationTitle: {
//     fontSize: 14,
//     fontWeight: 'bold',
//     color: '#fff',
//     marginBottom: 8,
//   },
//   donationButtons: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   donationButton: {
//     backgroundColor: '#34A853',
//     paddingVertical: 8,
//     paddingHorizontal: 12,
//     borderRadius: 6,
//     flex: 1,
//     marginHorizontal: 2,
//     alignItems: 'center',
//   },
//   customAmountButton: {
//     backgroundColor: '#4285F4',
//   },
//   donationButtonText: {
//     color: '#fff',
//     fontSize: 14,
//     fontWeight: 'bold',
//   },
// });
//
// export default StudentBrowser;