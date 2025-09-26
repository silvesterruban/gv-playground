import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { API_BASE_URL } from '../config/api';

interface PhotoUploadModalProps {
  visible: boolean;
  onClose: () => void;
  currentPhotoUrl?: string;
  onPhotoUploaded: (photoUrl: string) => void;
  userToken?: string;
}

const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  visible,
  onClose,
  currentPhotoUrl,
  onPhotoUploaded,
  userToken,
}) => {
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);

  // UPDATED: Helper function to get correct image URL for display using simple endpoint
  const getDisplayImageUrl = (photoUrl: string) => {
    if (!photoUrl) return null;

    console.log('🖼️ [PhotoModal] Processing display URL:', photoUrl);

    // If it's already a complete HTTPS URL (like S3), use it directly
    if (photoUrl.startsWith('https://')) {
      console.log('✅ Using direct HTTPS URL:', photoUrl);
      return photoUrl;
    }

    // Extract filename from any URL format
    let filename = '';

    if (photoUrl.includes('/')) {
      // Extract filename from full URL
      const parts = photoUrl.split('/');
      filename = parts[parts.length - 1];
    } else {
      // It's already just a filename
      filename = photoUrl;
    }

    // Use the simple /img endpoint that bypasses CORS issues
    const imageUrl = `${API_BASE_URL}/img/${filename}`;
    console.log('✅ Using simple image URL:', imageUrl);
    return imageUrl;
  };

  // UPDATED: Enhanced token retrieval function
  const getToken = () => {
    // First try the passed userToken prop
    if (userToken) {
      console.log('🔑 Using userToken prop');
      return userToken;
    }

    if (Platform.OS === 'web') {
      // Try multiple sources for the token
      const sources = [
        () => localStorage.getItem('token'),
        () => localStorage.getItem('userToken'),
        () => localStorage.getItem('authToken'),
        () => localStorage.getItem('accessToken'),
        () => sessionStorage.getItem('token'),
        () => sessionStorage.getItem('userToken'),
        () => sessionStorage.getItem('authToken'),
        () => sessionStorage.getItem('accessToken'),
        // Try to get from global window object if your app stores it there
        () => (window as any).userToken,
        () => (window as any).authToken,
        () => (window as any).token,
      ];

      for (const getTokenFn of sources) {
        try {
          const token = getTokenFn();
          if (token) {
            console.log('🔑 Token found in storage');
            return token;
          }
        } catch (e) {
          // Continue to next source
        }
      }

      // Try to get from userData in localStorage
      try {
        const userData = localStorage.getItem('userData');
        if (userData) {
          const parsed = JSON.parse(userData);
          if (parsed.token) {
            console.log('🔑 Token found in userData');
            return parsed.token;
          }
        }
      } catch (e) {
        console.log('Failed to parse userData:', e);
      }
    }

    console.log('❌ No token found anywhere');
    return null;
  };

  const pickImage = async () => {
    try {
      // For web, use a simple file input
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target.files[0];
          if (file) {
            console.log('📁 File selected:', file.name, file.size, file.type);

            // Validate file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
              Alert.alert('File Too Large', 'Please select an image smaller than 5MB.');
              return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
              Alert.alert('Invalid File Type', 'Please select an image file (JPG, PNG, etc.).');
              return;
            }

            const reader = new FileReader();
            reader.onload = (e: any) => {
              setSelectedImage(e.target.result);
              console.log('✅ Image loaded for preview, size:', e.target.result.length);
            };
            reader.onerror = (error) => {
              console.error('❌ FileReader error:', error);
              Alert.alert('Error', 'Failed to read the selected file.');
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      } else {
        // For mobile, you would use expo-image-picker here
        Alert.alert('Mobile Support', 'Photo upload on mobile will be implemented soon.');
      }
    } catch (error) {
      console.error('❌ Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadPhoto = async () => {
    if (!selectedImage) {
      Alert.alert('No Image Selected', 'Please select an image first.');
      return;
    }

    // Debug all possible token sources
    console.log('🔍 Token debug:');
    console.log('- userToken prop:', !!userToken);

    if (Platform.OS === 'web') {
      console.log('- localStorage token:', !!localStorage.getItem('token'));
      console.log('- localStorage userToken:', !!localStorage.getItem('userToken'));
      console.log('- localStorage authToken:', !!localStorage.getItem('authToken'));
      console.log('- sessionStorage token:', !!sessionStorage.getItem('token'));
      console.log('- window.userToken:', !!(window as any).userToken);

      // Show all localStorage keys for debugging
      console.log('- All localStorage keys:', Object.keys(localStorage));

      // Show userData from localStorage if exists
      const userData = localStorage.getItem('userData');
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          console.log('- userData in localStorage:', {
            hasToken: !!parsed.token,
            hasId: !!parsed.id,
            keys: Object.keys(parsed)
          });
        } catch (e) {
          console.log('- userData parse error:', e);
        }
      }
    }

    setUploading(true);
    console.log('🚀 Starting upload...');

    try {
      // Get the token
      const token = getToken();
      console.log('🔑 Final token available:', !!token);

      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      // For web, convert base64 to blob
      let imageBlob;
      if (Platform.OS === 'web' && selectedImage.startsWith('data:')) {
        console.log('🔄 Converting base64 to blob...');
        const response = await fetch(selectedImage);
        imageBlob = await response.blob();
        console.log('✅ Blob created, size:', imageBlob.size, 'type:', imageBlob.type);
      } else {
        throw new Error('Unsupported image format');
      }

      // Create form data
      const formData = new FormData();
      formData.append('photo', imageBlob, 'profile-photo.jpg');
      console.log('📦 FormData created');

      // Upload to backend
      console.log('📡 Sending request to backend...');
      const response = await fetch(`${API_BASE_URL}/api/students/profile/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData - browser will set it with boundary
        },
        body: formData,
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response not OK:', response.status, errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Response data:', result);

      if (result.success) {
        // Make sure we pass the correct photo URL
        const photoUrl = result.data?.profilePhoto || result.profilePhoto || result.data?.url;
        console.log('🎉 Photo uploaded successfully, URL:', photoUrl);

        // Update the current photo URL immediately so it shows in the modal
        setUploadedPhotoUrl(photoUrl);
        onPhotoUploaded(photoUrl);
        
        // Clear selected image but keep uploaded photo URL for display
        setSelectedImage(null);
        
        // Show success message and keep modal open to show the uploaded photo
        Alert.alert('Success', 'Profile photo updated successfully! You can see your new photo below.', [
          {
            text: 'Close',
            onPress: () => {
              setUploadedPhotoUrl(null); // Clear uploaded photo URL only when closing
              onClose();
            }
          }
        ]);
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Error uploading photo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Upload Failed', `Failed to upload photo: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('🗑️ Removing photo...');
      const response = await fetch(`${API_BASE_URL}/api/students/profile/photo`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Remove response not OK:', response.status, errorText);
        throw new Error(`Remove failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Remove response:', result);

      if (result.success) {
        onPhotoUploaded('');
        Alert.alert('Success', 'Profile photo removed successfully!');
        onClose();
      } else {
        throw new Error(result.message || 'Remove failed');
      }
    } catch (error) {
      console.error('❌ Error removing photo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Remove Failed', `Failed to remove photo: ${errorMessage}`);
    }
  };

  // Determine which image to show
  const displayImageUrl = selectedImage || 
                         (uploadedPhotoUrl ? getDisplayImageUrl(uploadedPhotoUrl) : null) ||
                         (currentPhotoUrl ? getDisplayImageUrl(currentPhotoUrl) : null);
  
  // Debug display logic
  console.log('🔍 Photo Modal Display Logic:', {
    selectedImage: !!selectedImage,
    uploadedPhotoUrl: uploadedPhotoUrl,
    currentPhotoUrl: currentPhotoUrl,
    displayImageUrl: displayImageUrl,
    priority: selectedImage ? 'selected' : uploadedPhotoUrl ? 'uploaded' : currentPhotoUrl ? 'current' : 'none'
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Profile Photo</Text>

          {/* Current Photo Display */}
          <View style={styles.photoContainer}>
            {uploadedPhotoUrl && (
              <View style={styles.successIndicator}>
                <Text style={styles.successText}>✅ Just Uploaded!</Text>
              </View>
            )}
            {displayImageUrl ? (
              Platform.OS === 'web' ? (
                <>
                  <img
                    src={displayImageUrl}
                    style={{
                      width: 150,
                      height: 150,
                      borderRadius: 75,
                      border: '3px solid #2563eb',
                      objectFit: 'cover'
                    }}
                    alt="Profile preview"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      console.error('❌ Preview image failed to load:', displayImageUrl);
                      console.error('❌ Error details:', e);
                      e.currentTarget.style.display = 'none';
                      // Show placeholder
                      const placeholder = e.currentTarget.parentElement?.querySelector('.placeholder');
                      if (placeholder) {
                        (placeholder as HTMLElement).style.display = 'flex';
                      }
                    }}
                    onLoad={() => {
                      console.log('✅ Preview image loaded successfully:', displayImageUrl);
                    }}
                  />
                  {/* Hidden placeholder for web error fallback */}
                  <div
                    className="placeholder"
                    style={{
                      display: 'none',
                      width: '150px',
                      height: '150px',
                      borderRadius: '75px',
                      backgroundColor: '#f3f4f6',
                      justifyContent: 'center',
                      alignItems: 'center',
                      border: '3px dashed #d1d5db',
                      color: '#6b7280',
                      fontSize: '16px',
                      position: 'absolute',
                      top: '0',
                      left: '0'
                    }}
                  >
                    Image failed to load
                  </div>
                </>
              ) : (
                <Image
                  source={{ uri: displayImageUrl }}
                  style={styles.currentPhoto}
                  onError={() => {
                    console.error('❌ React Native preview image failed to load:', displayImageUrl);
                  }}
                />
              )
            ) : (
              <View style={styles.placeholderPhoto}>
                <Text style={styles.placeholderText}>No Photo</Text>
              </View>
            )}
          </View>

          {/* Debug Info */}
          {Platform.OS === 'web' && (
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>
                Token: {getToken() ? '✅ Found' : '❌ Missing'}
              </Text>
              <Text style={styles.debugText}>
                Selected: {selectedImage ? '✅ New image' : '❌ None'}
              </Text>
              <Text style={styles.debugText}>
                Current: {currentPhotoUrl ? '✅ Has photo' : '❌ No photo'}
              </Text>
              <Text style={styles.debugText}>
                Uploaded: {uploadedPhotoUrl ? '✅ Has uploaded' : '❌ None'}
              </Text>
              <Text style={styles.debugText}>
                Display URL: {displayImageUrl ? displayImageUrl.substring(0, 50) + '...' : 'None'}
              </Text>
              <Text style={styles.debugText}>
                Current URL: {currentPhotoUrl || 'None'}
              </Text>
              <Text style={styles.debugText}>
                Uploaded URL: {uploadedPhotoUrl || 'None'}
              </Text>
              <Text style={styles.debugText}>
                UserData: {localStorage.getItem('userData') ? '✅ Found' : '❌ Missing'}
              </Text>
              {displayImageUrl && (
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    console.log('🧪 Testing image URL:', displayImageUrl);
                    const img = new window.Image();
                    img.onload = () => console.log('✅ Test: Image loads successfully');
                    img.onerror = () => console.log('❌ Test: Image fails to load');
                    img.src = displayImageUrl;
                  }}
                >
                  <Text style={styles.buttonText}>Test Image URL</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={pickImage}
              disabled={uploading}
            >
              <Text style={styles.buttonText}>Choose Photo</Text>
            </TouchableOpacity>

            {selectedImage && (
              <TouchableOpacity
                style={[styles.button, styles.uploadButton]}
                onPress={uploadPhoto}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Upload Photo</Text>
                )}
              </TouchableOpacity>
            )}

            {currentPhotoUrl && !selectedImage && (
              <TouchableOpacity
                style={[styles.button, styles.removeButton]}
                onPress={removePhoto}
                disabled={uploading}
              >
                <Text style={styles.buttonText}>Remove Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            disabled={uploading}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    alignItems: 'center',
    overflow: 'scroll',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  photoContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  currentPhoto: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: '#2563eb',
  },
  placeholderPhoto: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 16,
    color: '#6b7280',
  },
  debugInfo: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    width: '100%',
  },
  debugText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadButton: {
    backgroundColor: '#059669',
  },
  removeButton: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 10,
    padding: 10,
  },
  closeButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
  successIndicator: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  successText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default PhotoUploadModal;




// import React, { useState } from 'react';
// import {
//   Modal,
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
//   Platform,
//   Image,
//   ActivityIndicator,
// } from 'react-native';
//
// interface PhotoUploadModalProps {
//   visible: boolean;
//   onClose: () => void;
//   currentPhotoUrl?: string;
//   onPhotoUploaded: (photoUrl: string) => void;
//   userToken?: string;
// }
//
// const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
//   visible,
//   onClose,
//   currentPhotoUrl,
//   onPhotoUploaded,
//   userToken,
// }) => {
//   const [uploading, setUploading] = useState(false);
//   const [selectedImage, setSelectedImage] = useState<string | null>(null);
//
//   // Helper function to get correct image URL for display
//   const getDisplayImageUrl = (photoUrl: string) => {
//     if (!photoUrl) return null;
//
//     console.log('🖼️ [PhotoModal] Processing display URL:', photoUrl);
//
//     // If it's already a full URL, use it as is
//     if (photoUrl.startsWith('http')) {
//       return photoUrl;
//     }
//
//     // If it's a relative path starting with /api/, construct the full URL
//     if (photoUrl.startsWith('/api/')) {
//       return `http://3.234.140.112:3001${photoUrl}`;
//     }
//
//     // If it's just a filename, extract it and construct the full path
//     if (photoUrl.includes('/')) {
//       const parts = photoUrl.split('/');
//       const filename = parts[parts.length - 1];
//       return `http://3.234.140.112:3001/api/students/profile/photo/${filename}`;
//     }
//
//     // Direct filename
//     return `http://3.234.140.112:3001/api/students/profile/photo/${photoUrl}`;
//   };
//
//   // UPDATED: Enhanced token retrieval function
//   const getToken = () => {
//     // First try the passed userToken prop
//     if (userToken) {
//       console.log('🔑 Using userToken prop');
//       return userToken;
//     }
//
//     if (Platform.OS === 'web') {
//       // Try multiple sources for the token
//       const sources = [
//         () => localStorage.getItem('token'),
//         () => localStorage.getItem('userToken'),
//         () => localStorage.getItem('authToken'),
//         () => localStorage.getItem('accessToken'),
//         () => sessionStorage.getItem('token'),
//         () => sessionStorage.getItem('userToken'),
//         () => sessionStorage.getItem('authToken'),
//         () => sessionStorage.getItem('accessToken'),
//         // Try to get from global window object if your app stores it there
//         () => (window as any).userToken,
//         () => (window as any).authToken,
//         () => (window as any).token,
//       ];
//
//       for (const getTokenFn of sources) {
//         try {
//           const token = getTokenFn();
//           if (token) {
//             console.log('🔑 Token found in storage');
//             return token;
//           }
//         } catch (e) {
//           // Continue to next source
//         }
//       }
//     }
//
//     console.log('❌ No token found anywhere');
//     return null;
//   };
//
//   const pickImage = async () => {
//     try {
//       // For web, use a simple file input
//       if (Platform.OS === 'web') {
//         const input = document.createElement('input');
//         input.type = 'file';
//         input.accept = 'image/*';
//         input.onchange = (e: any) => {
//           const file = e.target.files[0];
//           if (file) {
//             console.log('📁 File selected:', file.name, file.size, file.type);
//
//             // Validate file size (5MB limit)
//             if (file.size > 5 * 1024 * 1024) {
//               Alert.alert('File Too Large', 'Please select an image smaller than 5MB.');
//               return;
//             }
//
//             // Validate file type
//             if (!file.type.startsWith('image/')) {
//               Alert.alert('Invalid File Type', 'Please select an image file (JPG, PNG, etc.).');
//               return;
//             }
//
//             const reader = new FileReader();
//             reader.onload = (e: any) => {
//               setSelectedImage(e.target.result);
//               console.log('✅ Image loaded for preview, size:', e.target.result.length);
//             };
//             reader.onerror = (error) => {
//               console.error('❌ FileReader error:', error);
//               Alert.alert('Error', 'Failed to read the selected file.');
//             };
//             reader.readAsDataURL(file);
//           }
//         };
//         input.click();
//       } else {
//         // For mobile, you would use expo-image-picker here
//         Alert.alert('Mobile Support', 'Photo upload on mobile will be implemented soon.');
//       }
//     } catch (error) {
//       console.error('❌ Error picking image:', error);
//       Alert.alert('Error', 'Failed to pick image. Please try again.');
//     }
//   };
//
//   const uploadPhoto = async () => {
//     if (!selectedImage) {
//       Alert.alert('No Image Selected', 'Please select an image first.');
//       return;
//     }
//
//     // Debug all possible token sources
//     console.log('🔍 Token debug:');
//     console.log('- userToken prop:', !!userToken);
//
//     if (Platform.OS === 'web') {
//       console.log('- localStorage token:', !!localStorage.getItem('token'));
//       console.log('- localStorage userToken:', !!localStorage.getItem('userToken'));
//       console.log('- localStorage authToken:', !!localStorage.getItem('authToken'));
//       console.log('- sessionStorage token:', !!sessionStorage.getItem('token'));
//       console.log('- window.userToken:', !!(window as any).userToken);
//
//       // Show all localStorage keys for debugging
//       console.log('- All localStorage keys:', Object.keys(localStorage));
//
//       // Show userData from localStorage if exists
//       const userData = localStorage.getItem('userData');
//       if (userData) {
//         try {
//           const parsed = JSON.parse(userData);
//           console.log('- userData in localStorage:', {
//             hasToken: !!parsed.token,
//             hasId: !!parsed.id,
//             keys: Object.keys(parsed)
//           });
//         } catch (e) {
//           console.log('- userData parse error:', e);
//         }
//       }
//     }
//
//     setUploading(true);
//     console.log('🚀 Starting upload...');
//
//     try {
//       // Get the token - try multiple sources
//       let token = getToken();
//
//       // If still no token, try to get from userData in localStorage
//       if (!token && Platform.OS === 'web') {
//         try {
//           const userData = localStorage.getItem('userData');
//           if (userData) {
//             const parsed = JSON.parse(userData);
//             token = parsed.token;
//             console.log('🔑 Token found in userData:', !!token);
//           }
//         } catch (e) {
//           console.log('Failed to parse userData:', e);
//         }
//       }
//
//       console.log('🔑 Final token available:', !!token);
//
//       if (!token) {
//         throw new Error('No authentication token found. Please login again.');
//       }
//
//       // For web, convert base64 to blob
//       let imageBlob;
//       if (Platform.OS === 'web' && selectedImage.startsWith('data:')) {
//         console.log('🔄 Converting base64 to blob...');
//         const response = await fetch(selectedImage);
//         imageBlob = await response.blob();
//         console.log('✅ Blob created, size:', imageBlob.size, 'type:', imageBlob.type);
//       } else {
//         throw new Error('Unsupported image format');
//       }
//
//       // Create form data
//       const formData = new FormData();
//       formData.append('photo', imageBlob, 'profile-photo.jpg');
//       console.log('📦 FormData created');
//
//       // Upload to backend
//       console.log('📡 Sending request to backend...');
//       const response = await fetch('http://3.234.140.112:3001/api/students/profile/photo', {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           // Don't set Content-Type for FormData - browser will set it with boundary
//         },
//         body: formData,
//       });
//
//       console.log('📥 Response status:', response.status);
//       console.log('📥 Response headers:', response.headers);
//
//       if (!response.ok) {
//         const errorText = await response.text();
//         console.error('❌ Response not OK:', response.status, errorText);
//         throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
//       }
//
//       const result = await response.json();
//       console.log('✅ Response data:', result);
//
//       if (result.success) {
//         // Make sure we pass the correct photo URL
//         const photoUrl = result.data?.profilePhoto || result.profilePhoto || result.data?.url;
//         console.log('🎉 Photo uploaded successfully, URL:', photoUrl);
//
//         onPhotoUploaded(photoUrl);
//         setSelectedImage(null); // Clear selected image
//         Alert.alert('Success', 'Profile photo updated successfully!');
//         onClose();
//       } else {
//         throw new Error(result.message || 'Upload failed');
//       }
//     } catch (error) {
//       console.error('❌ Error uploading photo:', error);
//       const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
//       Alert.alert('Upload Failed', `Failed to upload photo: ${errorMessage}`);
//     } finally {
//       setUploading(false);
//     }
//   };
//
//   const removePhoto = async () => {
//     try {
//       const token = getToken();
//       if (!token) {
//         throw new Error('No authentication token found');
//       }
//
//       console.log('🗑️ Removing photo...');
//       const response = await fetch('http://3.234.140.112:3001/api/students/profile/photo', {
//         method: 'DELETE',
//         headers: {
//           'Authorization': `Bearer ${token}`,
//         },
//       });
//
//       if (!response.ok) {
//         const errorText = await response.text();
//         console.error('❌ Remove response not OK:', response.status, errorText);
//         throw new Error(`Remove failed: ${response.status} ${response.statusText}`);
//       }
//
//       const result = await response.json();
//       console.log('✅ Remove response:', result);
//
//       if (result.success) {
//         onPhotoUploaded('');
//         Alert.alert('Success', 'Profile photo removed successfully!');
//         onClose();
//       } else {
//         throw new Error(result.message || 'Remove failed');
//       }
//     } catch (error) {
//       console.error('❌ Error removing photo:', error);
//       const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
//       Alert.alert('Remove Failed', `Failed to remove photo: ${errorMessage}`);
//     }
//   };
//
//   // Determine which image to show
//   const displayImageUrl = selectedImage || (currentPhotoUrl ? getDisplayImageUrl(currentPhotoUrl) : null);
//
//   return (
//     <Modal
//       visible={visible}
//       animationType="slide"
//       transparent={true}
//       onRequestClose={onClose}
//     >
//       <View style={styles.overlay}>
//         <View style={styles.modal}>
//           <Text style={styles.title}>Profile Photo</Text>
//
//           {/* Current Photo Display */}
//           <View style={styles.photoContainer}>
//             {displayImageUrl ? (
//               Platform.OS === 'web' ? (
//                 <>
//                   <img
//                     src={displayImageUrl}
//                     style={{
//                       width: 150,
//                       height: 150,
//                       borderRadius: 75,
//                       border: '3px solid #2563eb',
//                       objectFit: 'cover'
//                     }}
//                     alt="Profile preview"
//                     onError={(e) => {
//                       console.error('❌ Preview image failed to load:', displayImageUrl);
//                       e.currentTarget.style.display = 'none';
//                       // Show placeholder
//                       const placeholder = e.currentTarget.parentElement?.querySelector('.placeholder');
//                       if (placeholder) {
//                         (placeholder as HTMLElement).style.display = 'flex';
//                       }
//                     }}
//                     onLoad={() => {
//                       console.log('✅ Preview image loaded successfully');
//                     }}
//                   />
//                   {/* Hidden placeholder for web error fallback */}
//                   <div
//                     className="placeholder"
//                     style={{
//                       display: 'none',
//                       width: '150px',
//                       height: '150px',
//                       borderRadius: '75px',
//                       backgroundColor: '#f3f4f6',
//                       justifyContent: 'center',
//                       alignItems: 'center',
//                       border: '3px dashed #d1d5db',
//                       color: '#6b7280',
//                       fontSize: '16px',
//                       position: 'absolute',
//                       top: '0',
//                       left: '0'
//                     }}
//                   >
//                     Image failed to load
//                   </div>
//                 </>
//               ) : (
//                 <Image
//                   source={{ uri: displayImageUrl }}
//                   style={styles.currentPhoto}
//                   onError={() => {
//                     console.error('❌ React Native preview image failed to load:', displayImageUrl);
//                   }}
//                 />
//               )
//             ) : (
//               <View style={styles.placeholderPhoto}>
//                 <Text style={styles.placeholderText}>No Photo</Text>
//               </View>
//             )}
//           </View>
//
//           {/* Debug Info */}
//           {Platform.OS === 'web' && (
//             <View style={styles.debugInfo}>
//               <Text style={styles.debugText}>
//                 Token: {getToken() ? '✅ Found' : '❌ Missing'}
//               </Text>
//               <Text style={styles.debugText}>
//                 Selected: {selectedImage ? '✅ New image' : '❌ None'}
//               </Text>
//               <Text style={styles.debugText}>
//                 Current: {currentPhotoUrl ? '✅ Has photo' : '❌ No photo'}
//               </Text>
//               <Text style={styles.debugText}>
//                 Display URL: {displayImageUrl ? displayImageUrl.substring(0, 50) + '...' : 'None'}
//               </Text>
//               <Text style={styles.debugText}>
//                 UserData: {localStorage.getItem('userData') ? '✅ Found' : '❌ Missing'}
//               </Text>
//             </View>
//           )}
//
//           {/* Action Buttons */}
//           <View style={styles.buttonContainer}>
//             <TouchableOpacity
//               style={styles.button}
//               onPress={pickImage}
//               disabled={uploading}
//             >
//               <Text style={styles.buttonText}>Choose Photo</Text>
//             </TouchableOpacity>
//
//             {selectedImage && (
//               <TouchableOpacity
//                 style={[styles.button, styles.uploadButton]}
//                 onPress={uploadPhoto}
//                 disabled={uploading}
//               >
//                 {uploading ? (
//                   <ActivityIndicator color="#fff" />
//                 ) : (
//                   <Text style={styles.buttonText}>Upload Photo</Text>
//                 )}
//               </TouchableOpacity>
//             )}
//
//             {currentPhotoUrl && !selectedImage && (
//               <TouchableOpacity
//                 style={[styles.button, styles.removeButton]}
//                 onPress={removePhoto}
//                 disabled={uploading}
//               >
//                 <Text style={styles.buttonText}>Remove Photo</Text>
//               </TouchableOpacity>
//             )}
//           </View>
//
//           {/* Close Button */}
//           <TouchableOpacity
//             style={styles.closeButton}
//             onPress={onClose}
//             disabled={uploading}
//           >
//             <Text style={styles.closeButtonText}>Close</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </Modal>
//   );
// };
//
// const styles = StyleSheet.create({
//   overlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   modal: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 20,
//     width: '90%',
//     maxWidth: 400,
//     alignItems: 'center',
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 20,
//     color: '#333',
//   },
//   photoContainer: {
//     marginBottom: 20,
//     position: 'relative',
//   },
//   currentPhoto: {
//     width: 150,
//     height: 150,
//     borderRadius: 75,
//     borderWidth: 3,
//     borderColor: '#2563eb',
//   },
//   placeholderPhoto: {
//     width: 150,
//     height: 150,
//     borderRadius: 75,
//     backgroundColor: '#f3f4f6',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 3,
//     borderColor: '#d1d5db',
//     borderStyle: 'dashed',
//   },
//   placeholderText: {
//     fontSize: 16,
//     color: '#6b7280',
//   },
//   debugInfo: {
//     marginBottom: 15,
//     padding: 10,
//     backgroundColor: '#f3f4f6',
//     borderRadius: 8,
//     width: '100%',
//   },
//   debugText: {
//     fontSize: 12,
//     color: '#6b7280',
//     marginBottom: 2,
//   },
//   buttonContainer: {
//     width: '100%',
//     gap: 10,
//   },
//   button: {
//     backgroundColor: '#2563eb',
//     padding: 15,
//     borderRadius: 10,
//     alignItems: 'center',
//     marginBottom: 10,
//   },
//   uploadButton: {
//     backgroundColor: '#059669',
//   },
//   removeButton: {
//     backgroundColor: '#dc2626',
//   },
//   buttonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   closeButton: {
//     marginTop: 10,
//     padding: 10,
//   },
//   closeButtonText: {
//     color: '#6b7280',
//     fontSize: 16,
//   },
// });
//
// export default PhotoUploadModal;