import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import './PublicProfile.css';
import PublicDonationForm from './PublicDonationForm';
import URLShareButton from './URLShareButton';

const API_BASE_URL = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://api-dev2.gradvillage.com');

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
  profileCompletion: number;
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

interface PublicProfilePageProps {
  profileUrl?: string;
}

const PublicProfilePage: React.FC<PublicProfilePageProps> = ({ profileUrl: propProfileUrl }) => {
  const urlProfileUrl = Platform.OS === 'web' && typeof window !== 'undefined' && window.location 
    ? window.location.pathname.replace('/profile/', '') 
    : '';
  
  // Use prop if provided, otherwise extract from URL
  const profileUrl = propProfileUrl || urlProfileUrl;
  
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDonationForm, setShowDonationForm] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log('[PublicProfilePage] Fetching profile for URL:', profileUrl);
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/students/public/${profileUrl}`);

        console.log('[PublicProfilePage] API Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Profile not found (${response.status})`);
        }

        const data = await response.json();
        console.log('[PublicProfilePage] API Response data:', data);

        if (data.success && data.student) {
          // Map the API response to our interface
          const profileData = {
            id: data.student.id,
            firstName: data.student.firstName,
            lastName: data.student.lastName,
            email: data.student.email,
            school: data.student.school || '',
            major: data.student.major || '',
            bio: data.student.bio || '',
            profilePhoto: data.student.profilePhoto || '',
            fundingGoal: data.student.fundingGoal || 0,
            amountRaised: data.student.amountRaised || 0,
            profileCompletion: data.student.profileCompletion || 0,
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
          console.log('[PublicProfilePage] Setting profile data:', profileData);
          setProfile(profileData);
        } else {
          console.log('[PublicProfilePage] No student data in response');
          setError('Profile not found or not public');
        }
      } catch (error) {
        console.error('[PublicProfilePage] Error fetching public profile:', error);
        setError(error instanceof Error ? error.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (profileUrl) {
      fetchProfile();
    } else {
      console.log('[PublicProfilePage] No profileUrl provided');
      setError('Invalid profile URL');
      setLoading(false);
    }
  }, [profileUrl]);

  if (loading) {
    return (
      <div className="public-profile-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-profile-container">
        <div className="error-state">
          <h2>Profile Not Found</h2>
          <p>{error}</p>
          <button onClick={() => window.history.back()}>Go Back</button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="public-profile-container">
        <div className="error-state">
          <h2>Profile Not Available</h2>
          <p>This profile is not available or has been made private.</p>
          <button onClick={() => window.history.back()}>Go Back</button>
        </div>
      </div>
    );
  }

  // Add a simple test render to see if the component is working
  console.log('[PublicProfilePage] Rendering profile for:', profile.firstName, profile.lastName);

  const progressPercentage = profile.fundingGoal > 0 ? (profile.amountRaised / profile.fundingGoal) * 100 : 0;

  return (
    <div className="public-profile-container">
      {/* Header Section */}
      <div className="profile-header">
        <div className="profile-photo-section">
          {profile.profilePhoto ? (
            <img src={profile.profilePhoto} alt="Profile" className="profile-photo" />
          ) : (
            <div className="profile-photo-placeholder">
              <span>{profile.firstName.charAt(0)}{profile.lastName.charAt(0)}</span>
            </div>
          )}
        </div>
        <div className="profile-info">
          <h1>{profile.firstName} {profile.lastName}</h1>
          <p className="school-info">{profile.school} {profile.major && `• ${profile.major}`}</p>
          {profile.graduationYear && (
            <p className="graduation-year">Class of {profile.graduationYear}</p>
          )}
          {profile.gpa && (
            <p className="gpa">GPA: {profile.gpa}</p>
          )}
        </div>
      </div>

      {/* Funding Progress */}
      <div className="funding-section">
        <h2>Funding Progress</h2>
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            ></div>
          </div>
          <div className="funding-stats">
            <div className="stat">
              <span className="amount">${profile.amountRaised.toLocaleString()}</span>
              <span className="label">Raised</span>
            </div>
            <div className="stat">
              <span className="amount">${profile.fundingGoal.toLocaleString()}</span>
              <span className="label">Goal</span>
            </div>
            <div className="stat">
              <span className="amount">{profile.stats.totalDonations}</span>
              <span className="label">Donations</span>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      {(profile.bio || profile.personalStatement) && (
        <div className="about-section">
          <h2>About</h2>
          {profile.bio && <p className="bio">{profile.bio}</p>}
          {profile.personalStatement && (
            <div className="personal-statement">
              <h3>Personal Statement</h3>
              <p>{profile.personalStatement}</p>
            </div>
          )}
        </div>
      )}

      {/* Financial Need */}
      {profile.financialNeed && (
        <div className="financial-need-section">
          <h2>Financial Need</h2>
          <p>{profile.financialNeed}</p>
        </div>
      )}

      {/* Achievements */}
      {profile.achievements && (
        <div className="achievements-section">
          <h2>Achievements & Awards</h2>
          <p>{profile.achievements}</p>
        </div>
      )}

      {/* Registry Items */}
      {profile.registries.length > 0 && (
        <div className="registry-section">
          <h2>Registry Items ({profile.registries.length})</h2>
          <div className="registry-grid">
            {profile.registries.map((item, index) => (
              <div key={index} className="registry-item">
                <div className="item-header">
                  <h3>{item.itemName}</h3>
                  <span className={`status-badge ${item.fundedStatus}`}>
                    {item.fundedStatus}
                  </span>
                </div>
                <p className="item-category">{item.category}</p>
                {item.description && <p className="item-description">{item.description}</p>}
                <div className="item-funding">
                  <div className="funding-progress">
                    <div
                      className="funding-bar"
                      style={{
                        width: `${Math.min((item.amountFunded / item.price) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                  <div className="funding-text">
                    <span className="funded">${item.amountFunded}</span>
                    <span className="total"> / ${item.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Information */}
      <div className="contact-section">
        <h2>Connect</h2>
        <div className="contact-links">
          {profile.linkedinUrl && (
            <a
              href={profile.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link linkedin"
            >
              LinkedIn Profile
            </a>
          )}
          {profile.phoneNumber && (
            <a
              href={`tel:${profile.phoneNumber}`}
              className="contact-link phone"
            >
              {profile.phoneNumber}
            </a>
          )}
        </div>
      </div>

      {/* Donation CTA */}
      <div className="donation-cta">
        <h2>Support {profile.firstName}'s Education</h2>
        <p>Help {profile.firstName} achieve their educational goals by contributing to their funding or registry items.</p>
        <button className="donate-button" onClick={() => setShowDonationForm(true)}>
          Make a Donation
        </button>
        
        {/* Share Profile Button */}
        <URLShareButton
          url={window.location.href}
          title="Share Profile"
          studentName={`${profile.firstName} ${profile.lastName}`}
        />
      </div>

      {/* Public Donation Form Modal */}
      {showDonationForm && (
        <div className="donation-modal-overlay" onClick={() => setShowDonationForm(false)}>
          <div className="donation-modal" onClick={(e) => e.stopPropagation()}>
            <PublicDonationForm
              visible={showDonationForm}
              student={{
                id: profile.id,
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
              onDonationComplete={(donation) => {
                setShowDonationForm(false);
                alert(`Thank you for your donation of $${donation.amountInDollars} to ${profile.firstName}!`);
                // Optionally refresh the page to show updated amounts
                window.location.reload();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicProfilePage;