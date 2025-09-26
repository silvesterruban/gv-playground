import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Platform,
  Alert
} from 'react-native';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeModalProps {
  visible: boolean;
  onClose: () => void;
  profileUrl: string;
  studentName: string;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({
  visible,
  onClose,
  profileUrl,
  studentName
}) => {
  const [qrSize] = useState(200);

  const fullUrl = `${process.env.EXPO_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/profile/${profileUrl}`;

  const handleShare = async () => {
    try {
      const shareMessage = `Support ${studentName}'s education! Visit their profile: ${fullUrl}`;
      
      if (Platform.OS === 'web') {
        // For web, copy to clipboard
        await navigator.clipboard.writeText(shareMessage);
        Alert.alert('Copied!', 'Profile link copied to clipboard');
      } else {
        // For mobile, use native share
        await Share.share({
          message: shareMessage,
          url: fullUrl,
          title: `Support ${studentName}`
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share profile');
    }
  };

  const handleCopyUrl = async () => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(fullUrl);
        Alert.alert('Copied!', 'Profile URL copied to clipboard');
      } else {
        // For mobile, copy to clipboard
        // Note: You might need to install a clipboard library for React Native
        Alert.alert('Info', 'URL copied to clipboard');
      }
    } catch (error) {
      console.error('Error copying URL:', error);
      Alert.alert('Error', 'Failed to copy URL');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Share Profile</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.qrContainer}>
            <Text style={styles.studentName}>{studentName}</Text>
            <Text style={styles.subtitle}>Scan to visit profile</Text>
            
            <View style={styles.qrWrapper}>
              <QRCodeSVG
                value={fullUrl}
                size={qrSize}
                level="M"
                bgColor="white"
                fgColor="black"
              />
            </View>

            <Text style={styles.urlText} numberOfLines={2}>
              {fullUrl}
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>Share Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyUrl}>
              <Text style={styles.copyButtonText}>Copy URL</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Sharing Tips:</Text>
            <Text style={styles.tipText}>• Share on social media</Text>
            <Text style={styles.tipText}>• Send via email or text</Text>
            <Text style={styles.tipText}>• Print QR code for events</Text>
            <Text style={styles.tipText}>• Add to business cards</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6c757d',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  qrWrapper: {
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  urlText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  shareButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  shareButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  copyButton: {
    backgroundColor: '#34A853',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  copyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tipsContainer: {
    width: '100%',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
});

export default QRCodeModal; 