import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Share,
  Platform,
  Alert
} from 'react-native';

interface URLShareButtonProps {
  url: string;
  title: string;
  studentName: string;
}

const URLShareButton: React.FC<URLShareButtonProps> = ({
  url,
  title,
  studentName
}) => {
  const handleShare = async () => {
    try {
      const shareMessage = `Support ${studentName}'s education! Visit their profile: ${url}`;
      
      if (Platform.OS === 'web') {
        // For web, copy to clipboard
        await navigator.clipboard.writeText(shareMessage);
        Alert.alert('Copied!', 'Profile link copied to clipboard');
      } else {
        // For mobile, use native share
        await Share.share({
          message: shareMessage,
          url: url,
          title: `Support ${studentName}`
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share profile');
    }
  };

  return (
    <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
      <Text style={styles.shareButtonText}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  shareButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  shareButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default URLShareButton; 