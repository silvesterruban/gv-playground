import React, { useState } from 'react';
import { Platform } from 'react-native';
import { QRCodeSVG } from 'qrcode.react';
import './QRCodeModal.css';

interface QRCodeModalWebProps {
  visible: boolean;
  onClose: () => void;
  profileUrl: string;
  studentName: string;
}

const QRCodeModalWeb: React.FC<QRCodeModalWebProps> = ({
  visible,
  onClose,
  profileUrl,
  studentName
}) => {
  const [qrSize] = useState(200);

  const fullUrl = Platform.OS === 'web' && typeof window !== 'undefined' && window.location
    ? `${window.location.origin}/profile/${profileUrl}`
    : `http://localhost:3000/profile/${profileUrl}`;

  const handleShare = async () => {
    try {
      const shareMessage = `Support ${studentName}'s education! Visit their profile: ${fullUrl}`;
      
      if (navigator.share) {
        // Use native sharing if available
        await navigator.share({
          title: `Support ${studentName}`,
          text: shareMessage,
          url: fullUrl,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareMessage);
        alert('Profile link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Failed to share profile');
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      alert('Profile URL copied to clipboard!');
    } catch (error) {
      console.error('Error copying URL:', error);
      alert('Failed to copy URL');
    }
  };

  if (!visible) return null;

  return (
    <div className="qr-modal-overlay">
      <div className="qr-modal-content">
        <div className="qr-modal-header">
          <h2 className="qr-modal-title">Share Profile</h2>
          <button className="qr-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="qr-modal-body">
          <div className="qr-student-name">{studentName}</div>
          <div className="qr-subtitle">Scan to visit profile</div>
          
          <div className="qr-code-wrapper">
            <QRCodeSVG
              value={fullUrl}
              size={qrSize}
              level="M"
              bgColor="white"
              fgColor="black"
            />
          </div>

          <div className="qr-url-text">
            {fullUrl}
          </div>
        </div>

        <div className="qr-button-container">
          <button className="qr-share-button" onClick={handleShare}>
            Share Profile
          </button>
          
          <button className="qr-copy-button" onClick={handleCopyUrl}>
            Copy URL
          </button>
        </div>

        <div className="qr-tips-container">
          <div className="qr-tips-title">Sharing Tips:</div>
          <div className="qr-tip">• Share on social media</div>
          <div className="qr-tip">• Send via email or text</div>
          <div className="qr-tip">• Print QR code for events</div>
          <div className="qr-tip">• Add to business cards</div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModalWeb; 