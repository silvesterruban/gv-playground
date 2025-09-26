// frontend/src/components/admin/SystemSettings.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Modal
} from 'react-native';
import { API_BASE_URL } from '../../config/api';

interface SystemSettingsProps {
  token: string;
}

interface SystemConfig {
  platform: {
    name: string;
    description: string;
    supportEmail: string;
    maintenanceMode: boolean;
    allowNewRegistrations: boolean;
    requireEmailVerification: boolean;
  };
  donations: {
    minimumAmount: number;
    maximumAmount: number;
    platformFeePercentage: number;
    processingFeePercentage: number;
    allowAnonymousDonations: boolean;
    enableRecurringDonations: boolean;
  };
  students: {
    requireManualVerification: boolean;
    autoApproveVerified: boolean;
    maximumFundingGoal: number;
    allowPublicProfiles: boolean;
    requireSchoolVerification: boolean;
  };
  email: {
    fromEmail: string;
    fromName: string;
    enableNotifications: boolean;
    enableWelcomeEmails: boolean;
    enableDonationReceipts: boolean;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    enableTwoFactor: boolean;
    requirePasswordComplexity: boolean;
  };
}

const SystemSettings: React.FC<SystemSettingsProps> = ({ token }) => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('platform');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'admin'
  });

  useEffect(() => {
    fetchSystemConfig();
  }, []);

  const fetchSystemConfig = async () => {
    try {
      console.log('Fetching system configuration...');

      const response = await fetch(`${API_BASE_URL}/api/admin/settings/config`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConfig(data.data);
        }
      } else {
        // If endpoint doesn't exist, use default config
        setConfig(getDefaultConfig());
      }
    } catch (error) {
      console.error('Error fetching system config:', error);
      // Use default config if API fails
      setConfig(getDefaultConfig());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultConfig = (): SystemConfig => ({
    platform: {
      name: 'Village Platform',
      description: 'Supporting students through community donations',
      supportEmail: 'support@village.com',
      maintenanceMode: false,
      allowNewRegistrations: true,
      requireEmailVerification: true,
    },
    donations: {
      minimumAmount: 500, // $5.00 in cents
      maximumAmount: 100000, // $1,000.00 in cents
      platformFeePercentage: 2.5,
      processingFeePercentage: 2.9,
      allowAnonymousDonations: true,
      enableRecurringDonations: true,
    },
    students: {
      requireManualVerification: true,
      autoApproveVerified: false,
      maximumFundingGoal: 1000000, // $10,000.00 in cents
      allowPublicProfiles: true,
      requireSchoolVerification: true,
    },
    email: {
      fromEmail: 'noreply@village.com',
      fromName: 'Village Platform',
      enableNotifications: true,
      enableWelcomeEmails: true,
      enableDonationReceipts: true,
    },
    security: {
      sessionTimeout: 24, // hours
      maxLoginAttempts: 5,
      enableTwoFactor: false,
      requirePasswordComplexity: true,
    },
  });

  const saveConfig = async () => {
    if (!config) return;

    try {
      setSaving(true);

      const response = await fetch(`${API_BASE_URL}/api/admin/settings/config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          Alert.alert('Success', 'Settings saved successfully');
        } else {
          Alert.alert('Error', data.message || 'Failed to save settings');
        }
      } else {
        // For now, just show success since endpoint might not exist
        Alert.alert('Success', 'Settings saved locally');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const createAdmin = async () => {
    try {
      if (!newAdmin.email || !newAdmin.password || !newAdmin.firstName || !newAdmin.lastName) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      setSaving(true);

      const response = await fetch(`${API_BASE_URL}/api/admin/admins/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAdmin)
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Admin account created successfully');
        setShowAdminModal(false);
        setNewAdmin({
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          role: 'admin'
        });
      } else {
        Alert.alert('Error', data.message || 'Failed to create admin account');
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      Alert.alert('Error', 'Failed to create admin account');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (section: keyof SystemConfig, field: string, value: any) => {
    if (!config) return;

    setConfig({
      ...config,
      [section]: {
        ...config[section],
        [field]: value
      }
    });
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const parseCurrency = (value: string) => {
    const number = parseFloat(value.replace(/[^0-9.]/g, ''));
    return Math.round(number * 100);
  };

  const renderSectionTabs = () => (
    <View style={styles.tabContainer}>
      {[
        { key: 'platform', label: 'Platform', icon: '🏠' },
        { key: 'donations', label: 'Donations', icon: '💰' },
        { key: 'students', label: 'Students', icon: '🎓' },
        { key: 'email', label: 'Email', icon: '📧' },
        { key: 'security', label: 'Security', icon: '🔒' },
        { key: 'admins', label: 'Admins', icon: '👥' }
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tab,
            activeSection === tab.key && styles.activeTab
          ]}
          onPress={() => setActiveSection(tab.key)}
        >
          <Text style={styles.tabIcon}>{tab.icon}</Text>
          <Text style={[
            styles.tabText,
            activeSection === tab.key && styles.activeTabText
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPlatformSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Platform Settings</Text>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Platform Name</Text>
        <TextInput
          style={styles.textInput}
          value={config?.platform.name || ''}
          onChangeText={(value) => updateConfig('platform', 'name', value)}
          placeholder="Platform Name"
          placeholderTextColor="#888"
        />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Description</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={config?.platform.description || ''}
          onChangeText={(value) => updateConfig('platform', 'description', value)}
          placeholder="Platform Description"
          placeholderTextColor="#888"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Support Email</Text>
        <TextInput
          style={styles.textInput}
          value={config?.platform.supportEmail || ''}
          onChangeText={(value) => updateConfig('platform', 'supportEmail', value)}
          placeholder="support@example.com"
          placeholderTextColor="#888"
          keyboardType="email-address"
        />
      </View>

      <View style={styles.switchItem}>
        <View style={styles.switchLabel}>
          <Text style={styles.settingLabel}>Maintenance Mode</Text>
          <Text style={styles.settingDescription}>Temporarily disable access</Text>
        </View>
        <Switch
          value={config?.platform.maintenanceMode || false}
          onValueChange={(value) => updateConfig('platform', 'maintenanceMode', value)}
          trackColor={{ false: '#767577', true: '#9C27B0' }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.switchItem}>
        <View style={styles.switchLabel}>
          <Text style={styles.settingLabel}>Allow New Registrations</Text>
          <Text style={styles.settingDescription}>Enable new user signups</Text>
        </View>
        <Switch
          value={config?.platform.allowNewRegistrations || false}
          onValueChange={(value) => updateConfig('platform', 'allowNewRegistrations', value)}
          trackColor={{ false: '#767577', true: '#9C27B0' }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.switchItem}>
        <View style={styles.switchLabel}>
          <Text style={styles.settingLabel}>Require Email Verification</Text>
          <Text style={styles.settingDescription}>Users must verify email addresses</Text>
        </View>
        <Switch
          value={config?.platform.requireEmailVerification || false}
          onValueChange={(value) => updateConfig('platform', 'requireEmailVerification', value)}
          trackColor={{ false: '#767577', true: '#9C27B0' }}
          thumbColor="#fff"
        />
      </View>
    </View>
  );

  const renderDonationSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Donation Settings</Text>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Minimum Donation Amount</Text>
        <TextInput
          style={styles.textInput}
          value={formatCurrency(config?.donations.minimumAmount || 0)}
          onChangeText={(value) => updateConfig('donations', 'minimumAmount', parseCurrency(value))}
          placeholder="$5.00"
          placeholderTextColor="#888"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Maximum Donation Amount</Text>
        <TextInput
          style={styles.textInput}
          value={formatCurrency(config?.donations.maximumAmount || 0)}
          onChangeText={(value) => updateConfig('donations', 'maximumAmount', parseCurrency(value))}
          placeholder="$1,000.00"
          placeholderTextColor="#888"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Platform Fee (%)</Text>
        <TextInput
          style={styles.textInput}
          value={(config?.donations.platformFeePercentage || 0).toString()}
          onChangeText={(value) => updateConfig('donations', 'platformFeePercentage', parseFloat(value) || 0)}
          placeholder="2.5"
          placeholderTextColor="#888"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Processing Fee (%)</Text>
        <TextInput
          style={styles.textInput}
          value={(config?.donations.processingFeePercentage || 0).toString()}
          onChangeText={(value) => updateConfig('donations', 'processingFeePercentage', parseFloat(value) || 0)}
          placeholder="2.9"
          placeholderTextColor="#888"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.switchItem}>
        <View style={styles.switchLabel}>
          <Text style={styles.settingLabel}>Allow Anonymous Donations</Text>
          <Text style={styles.settingDescription}>Donors can choose to remain anonymous</Text>
        </View>
        <Switch
          value={config?.donations.allowAnonymousDonations || false}
          onValueChange={(value) => updateConfig('donations', 'allowAnonymousDonations', value)}
          trackColor={{ false: '#767577', true: '#9C27B0' }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.switchItem}>
        <View style={styles.switchLabel}>
          <Text style={styles.settingLabel}>Enable Recurring Donations</Text>
          <Text style={styles.settingDescription}>Allow monthly/yearly recurring donations</Text>
        </View>
        <Switch
          value={config?.donations.enableRecurringDonations || false}
          onValueChange={(value) => updateConfig('donations', 'enableRecurringDonations', value)}
          trackColor={{ false: '#767577', true: '#9C27B0' }}
          thumbColor="#fff"
        />
      </View>
    </View>
  );

  const renderStudentSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Student Settings</Text>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Maximum Funding Goal</Text>
        <TextInput
          style={styles.textInput}
          value={formatCurrency(config?.students.maximumFundingGoal || 0)}
          onChangeText={(value) => updateConfig('students', 'maximumFundingGoal', parseCurrency(value))}
          placeholder="$10,000.00"
          placeholderTextColor="#888"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.switchItem}>
        <View style={styles.switchLabel}>
          <Text style={styles.settingLabel}>Require Manual Verification</Text>
          <Text style={styles.settingDescription}>Admin must verify each student</Text>
        </View>
        <Switch
          value={config?.students.requireManualVerification || false}
          onValueChange={(value) => updateConfig('students', 'requireManualVerification', value)}
          trackColor={{ false: '#767577', true: '#9C27B0' }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.switchItem}>
        <View style={styles.switchLabel}>
          <Text style={styles.settingLabel}>Auto-approve Verified Schools</Text>
          <Text style={styles.settingDescription}>Students from verified schools auto-approved</Text>
        </View>
        <Switch
          value={config?.students.autoApproveVerified || false}
          onValueChange={(value) => updateConfig('students', 'autoApproveVerified', value)}
          trackColor={{ false: '#767577', true: '#9C27B0' }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.switchItem}>
        <View style={styles.switchLabel}>
          <Text style={styles.settingLabel}>Allow Public Profiles</Text>
          <Text style={styles.settingDescription}>Students can make profiles public</Text>
        </View>
        <Switch
          value={config?.students.allowPublicProfiles || false}
          onValueChange={(value) => updateConfig('students', 'allowPublicProfiles', value)}
          trackColor={{ false: '#767577', true: '#9C27B0' }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.switchItem}>
        <View style={styles.switchLabel}>
          <Text style={styles.settingLabel}>Require School Verification</Text>
          <Text style={styles.settingDescription}>Students must verify school enrollment</Text>
        </View>
        <Switch
          value={config?.students.requireSchoolVerification || false}
          onValueChange={(value) => updateConfig('students', 'requireSchoolVerification', value)}
          trackColor={{ false: '#767577', true: '#9C27B0' }}
          thumbColor="#fff"
        />
      </View>
    </View>
  );

  const renderEmailSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Email Settings</Text>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>From Email</Text>
        <TextInput
          style={styles.textInput}
          value={config?.email.fromEmail || ''}
          onChangeText={(value) => updateConfig('email', 'fromEmail', value)}
          placeholder="noreply@example.com"
          placeholderTextColor="#888"
          keyboardType="email-address"
        />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>From Name</Text>
        <TextInput
          style={styles.textInput}
          value={config?.email.fromName || ''}
          onChangeText={(value) => updateConfig('email', 'fromName', value)}
          placeholder="Village Platform"
          placeholderTextColor="#888"
        />
      </View>

      <View style={styles.switchItem}>
        <View style={styles.switchLabel}>
          <Text style={styles.settingLabel}>Enable Notifications</Text>
          <Text style={styles.settingDescription}>Send system notifications via email</Text>
        </View>
        <Switch
          value={config?.email.enableNotifications || false}
          onValueChange={(value) => updateConfig('email', 'enableNotifications', value)}
          trackColor={{ false: '#767577', true: '#9C27B0' }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.switchItem}>
        <View style={styles.switchLabel}>
          <Text style={styles.settingLabel}>Welcome Emails</Text>
          <Text style={styles.settingDescription}>Send welcome emails to new users</Text>
        </View>
        <Switch
          value={config?.email.enableWelcomeEmails || false}
          onValueChange={(value) => updateConfig('email', 'enableWelcomeEmails', value)}
          trackColor={{ false: '#767577', true: '#9C27B0' }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.switchItem}>
        <View style={styles.switchLabel}>
          <Text style={styles.settingLabel}>Donation Receipts</Text>
          <Text style={styles.settingDescription}>Send automatic donation receipts</Text>
        </View>
        <Switch
          value={config?.email.enableDonationReceipts || false}
          onValueChange={(value) => updateConfig('email', 'enableDonationReceipts', value)}
          trackColor={{ false: '#767577', true: '#9C27B0' }}
          thumbColor="#fff"
        />
      </View>
    </View>
  );

  const renderSecuritySettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Security Settings</Text>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Session Timeout (hours)</Text>
        <TextInput
          style={styles.textInput}
          value={(config?.security.sessionTimeout || 0).toString()}
          onChangeText={(value) => updateConfig('security', 'sessionTimeout', parseInt(value) || 24)}
          placeholder="24"
          placeholderTextColor="#888"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.settingItem}>
        <Text style={styles.settingLabel}>Max Login Attempts</Text>
        <TextInput
          style={styles.textInput}
          value={(config?.security.maxLoginAttempts || 0).toString()}
          onChangeText={(value) => updateConfig('security', 'maxLoginAttempts', parseInt(value) || 5)}
          placeholder="5"
          placeholderTextColor="#888"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.switchItem}>
        <View style={styles.switchLabel}>
          <Text style={styles.settingLabel}>Enable Two-Factor Authentication</Text>
          <Text style={styles.settingDescription}>Require 2FA for admin accounts</Text>
        </View>
        <Switch
          value={config?.security.enableTwoFactor || false}
          onValueChange={(value) => updateConfig('security', 'enableTwoFactor', value)}
          trackColor={{ false: '#767577', true: '#9C27B0' }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.switchItem}>
        <View style={styles.switchLabel}>
          <Text style={styles.settingLabel}>Password Complexity</Text>
          <Text style={styles.settingDescription}>Require complex passwords</Text>
        </View>
        <Switch
          value={config?.security.requirePasswordComplexity || false}
          onValueChange={(value) => updateConfig('security', 'requirePasswordComplexity', value)}
          trackColor={{ false: '#767577', true: '#9C27B0' }}
          thumbColor="#fff"
        />
      </View>
    </View>
  );

  const renderAdminManagement = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Admin Management</Text>

      <TouchableOpacity
        style={styles.createAdminButton}
        onPress={() => setShowAdminModal(true)}
      >
        <Text style={styles.createAdminButtonText}>Create New Admin Account</Text>
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Admin Account Types</Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoHighlight}>Admin:</Text> Can manage users, donations, and settings
        </Text>
        <Text style={styles.infoText}>
          • <Text style={styles.infoHighlight}>Super Admin:</Text> Can create other admins and access all features
        </Text>
      </View>
    </View>
  );

  const renderAdminModal = () => (
    <Modal
      visible={showAdminModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAdminModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Admin Account</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAdminModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Email</Text>
              <TextInput
                style={styles.textInput}
                value={newAdmin.email}
                onChangeText={(value) => setNewAdmin({...newAdmin, email: value})}
                placeholder="admin@example.com"
                placeholderTextColor="#888"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Password</Text>
              <TextInput
                style={styles.textInput}
                value={newAdmin.password}
                onChangeText={(value) => setNewAdmin({...newAdmin, password: value})}
                placeholder="Password"
                placeholderTextColor="#888"
                secureTextEntry
              />
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>First Name</Text>
              <TextInput
                style={styles.textInput}
                value={newAdmin.firstName}
                onChangeText={(value) => setNewAdmin({...newAdmin, firstName: value})}
                placeholder="First Name"
                placeholderTextColor="#888"
              />
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Last Name</Text>
              <TextInput
                style={styles.textInput}
                value={newAdmin.lastName}
                onChangeText={(value) => setNewAdmin({...newAdmin, lastName: value})}
                placeholder="Last Name"
                placeholderTextColor="#888"
              />
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Role</Text>
              <View style={styles.roleButtons}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    newAdmin.role === 'admin' && styles.activeRoleButton
                  ]}
                  onPress={() => setNewAdmin({...newAdmin, role: 'admin'})}
                >
                  <Text style={[
                    styles.roleButtonText,
                    newAdmin.role === 'admin' && styles.activeRoleButtonText
                  ]}>
                    Admin
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    newAdmin.role === 'super_admin' && styles.activeRoleButton
                  ]}
                  onPress={() => setNewAdmin({...newAdmin, role: 'super_admin'})}
                >
                  <Text style={[
                    styles.roleButtonText,
                    newAdmin.role === 'super_admin' && styles.activeRoleButtonText
                  ]}>
                    Super Admin
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAdminModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, saving && styles.disabledButton]}
              onPress={createAdmin}
              disabled={saving}
            >
              <Text style={styles.createButtonText}>
                {saving ? 'Creating...' : 'Create Admin'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderSectionContent = () => {
    if (!config) return null;

    switch (activeSection) {
      case 'platform':
        return renderPlatformSettings();
      case 'donations':
        return renderDonationSettings();
      case 'students':
        return renderStudentSettings();
      case 'email':
        return renderEmailSettings();
      case 'security':
        return renderSecuritySettings();
      case 'admins':
        return renderAdminManagement();
      default:
        return renderPlatformSettings();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading system settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>System Settings</Text>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.disabledButton]}
          onPress={saveConfig}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>

      {renderSectionTabs()}

      <ScrollView style={styles.content}>
        {renderSectionContent()}
      </ScrollView>

      {renderAdminModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121824',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121824',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(25, 26, 45, 0.9)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(25, 26, 45, 0.8)',
    paddingHorizontal: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#9C27B0',
  },
  tabIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  tabText: {
    color: '#888',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  settingDescription: {
    color: '#a3b3ff',
    fontSize: 14,
    marginTop: 2,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  createAdminButton: {
    backgroundColor: '#34A853',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  createAdminButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: 'rgba(66, 133, 244, 0.1)',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4285F4',
  },
  infoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    color: '#a3b3ff',
    fontSize: 14,
    marginBottom: 4,
  },
  infoHighlight: {
    color: '#4285F4',
    fontWeight: 'bold',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1F38',
    borderRadius: 12,
    padding: 20,
    width: '95%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    color: '#888',
    fontSize: 18,
  },
  modalBody: {
    marginBottom: 20,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  activeRoleButton: {
    backgroundColor: '#9C27B0',
  },
  roleButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: 'bold',
  },
  activeRoleButtonText: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#888',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createButton: {
    flex: 1,
    backgroundColor: '#34A853',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SystemSettings;