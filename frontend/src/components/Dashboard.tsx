import React, { useState, useEffect } from 'react';
import './StudentDashboard.css';
import { API_BASE_URL } from '../config/api';

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
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ userData, onLogout }) => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showRegistryModal, setShowRegistryModal] = useState(false);
  
  // Profile edit state
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    school: '',
    major: '',
    bio: '',
    fundingGoal: ''
  });

  // Registry state
  const [newRegistryItem, setNewRegistryItem] = useState({
    itemName: '',
    price: '',
    category: '',
    description: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/students/profile`, {
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setProfile(data.data);
        // Initialize edit form with current values
        setEditForm({
          firstName: data.data.firstName || '',
          lastName: data.data.lastName || '',
          school: data.data.schoolName || '',
          major: data.data.major || '',
          bio: data.data.bio || '',
          fundingGoal: data.data.fundingGoal?.toString() || ''
        });
      } else {
        setError(data.message || 'Failed to fetch profile');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/students/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          school: editForm.school,
          major: editForm.major,
          bio: editForm.bio,
          fundingGoal: parseFloat(editForm.fundingGoal) || 0
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setProfile(data.data);
        setShowProfileModal(false);
        alert('Profile updated successfully!');
      } else {
        setError(data.message || 'Failed to update profile');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to sign out?')) {
      onLogout();
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRegistryInputChange = (field: string, value: string) => {
    setNewRegistryItem(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addRegistryItem = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/students/registry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newRegistryItem)
      });

      const data = await response.json();
      
      if (data.success) {
        setNewRegistryItem({
          itemName: '',
          price: '',
          category: '',
          description: ''
        });
        fetchProfile(); // Refresh to get updated registry
        alert('Registry item added successfully!');
      } else {
        alert(data.message || 'Failed to add registry item');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  if (loading && !profile) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-text">{error}</p>
        <button className="retry-button" onClick={fetchProfile}>
          Retry
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="error-container">
        <p className="error-text">Unable to load profile</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="profile-section">
            {profile.profilePhoto ? (
              <img src={profile.profilePhoto} alt="Profile" className="profile-photo" />
            ) : (
              <div className="profile-photo-placeholder">
                <span className="profile-photo-text">
                  {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
                </span>
              </div>
            )}
            <div className="profile-info">
              <p className="welcome-text">Welcome back,</p>
              <h1 className="name-text">{profile.firstName} {profile.lastName}</h1>
              <p className="school-text">{profile.schoolName}</p>
            </div>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Profile Completion Alert */}
      {profile.profileCompletion < 100 && (
        <div className="completion-alert">
          <p className="completion-text">
            Complete your profile to increase your chances of receiving donations!
          </p>
          <button 
            className="complete-profile-button"
            onClick={() => setShowProfileModal(true)}
          >
            Complete Profile
          </button>
        </div>
      )}

      {/* Stats Overview */}
      <div className="stats-container">
        <h2 className="section-title">Your Progress</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">${profile.amountRaised.toLocaleString()}</span>
            <p className="stat-label">Total Raised</p>
          </div>
          <div className="stat-card">
            <span className="stat-value">{profile.stats.fundingProgress}%</span>
            <p className="stat-label">Goal Progress</p>
          </div>
          <div className="stat-card">
            <span className="stat-value">{profile.stats.totalDonations}</span>
            <p className="stat-label">Donations</p>
          </div>
          <div className="stat-card">
            <span className="stat-value">{profile.stats.totalRegistryItems}</span>
            <p className="stat-label">Registry Items</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="actions-container">
        <h2 className="section-title">Quick Actions</h2>
        <div className="action-buttons">
          <button 
            className="action-button"
            onClick={() => setShowProfileModal(true)}
          >
            <span className="action-icon">👤</span>
            <span className="action-text">Edit Profile</span>
          </button>
          <button 
            className="action-button"
            onClick={() => setShowRegistryModal(true)}
          >
            <span className="action-icon">📝</span>
            <span className="action-text">Manage Registry</span>
          </button>
          <button 
            className="action-button"
            onClick={() => window.open(profile.profileUrl, '_blank')}
          >
            <span className="action-icon">🔗</span>
            <span className="action-text">View Public Profile</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="activity-container">
        <h2 className="section-title">Recent Activity</h2>
        <div className="activity-list">
          {profile.registries.slice(0, 5).map((item, index) => (
            <div key={index} className="activity-item">
              <div className="activity-icon">🎁</div>
              <div className="activity-content">
                <p className="activity-title">{item.itemName}</p>
                <p className="activity-subtitle">
                  ${item.amountFunded} of ${item.price} funded
                </p>
              </div>
              <div className="activity-status">
                <span className={`status-badge ${item.fundedStatus}`}>
                  {item.fundedStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Profile</h2>
              <button 
                className="modal-close"
                onClick={() => setShowProfileModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>School</label>
                <input
                  type="text"
                  value={editForm.school}
                  onChange={(e) => handleInputChange('school', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Major</label>
                <input
                  type="text"
                  value={editForm.major}
                  onChange={(e) => handleInputChange('major', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  className="form-textarea"
                  rows={4}
                />
              </div>
              <div className="form-group">
                <label>Funding Goal ($)</label>
                <input
                  type="number"
                  value={editForm.fundingGoal}
                  onChange={(e) => handleInputChange('fundingGoal', e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowProfileModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={updateProfile}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registry Modal */}
      {showRegistryModal && (
        <div className="modal-overlay" onClick={() => setShowRegistryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Manage Registry</h2>
              <button 
                className="modal-close"
                onClick={() => setShowRegistryModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="registry-form">
                <h3>Add New Item</h3>
                <div className="form-group">
                  <label>Item Name</label>
                  <input
                    type="text"
                    value={newRegistryItem.itemName}
                    onChange={(e) => handleRegistryInputChange('itemName', e.target.value)}
                    className="form-input"
                    placeholder="e.g., Laptop, Books, etc."
                  />
                </div>
                <div className="form-group">
                  <label>Price ($)</label>
                  <input
                    type="number"
                    value={newRegistryItem.price}
                    onChange={(e) => handleRegistryInputChange('price', e.target.value)}
                    className="form-input"
                    placeholder="0.00"
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={newRegistryItem.category}
                    onChange={(e) => handleRegistryInputChange('category', e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select category</option>
                    <option value="technology">Technology</option>
                    <option value="books">Books</option>
                    <option value="supplies">Supplies</option>
                    <option value="clothing">Clothing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={newRegistryItem.description}
                    onChange={(e) => handleRegistryInputChange('description', e.target.value)}
                    className="form-textarea"
                    rows={3}
                    placeholder="Brief description of the item..."
                  />
                </div>
                <button 
                  className="btn-primary"
                  onClick={addRegistryItem}
                  disabled={!newRegistryItem.itemName || !newRegistryItem.price}
                >
                  Add Item
                </button>
              </div>
              
              <div className="registry-list">
                <h3>Current Items</h3>
                {profile.registries.map((item, index) => (
                  <div key={index} className="registry-item">
                    <div className="registry-item-info">
                      <h4>{item.itemName}</h4>
                      <p>${item.price} • {item.category}</p>
                    </div>
                    <div className="registry-item-status">
                      <span className={`status-badge ${item.fundedStatus}`}>
                        {item.fundedStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard; 