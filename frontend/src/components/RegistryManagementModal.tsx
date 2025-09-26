import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';

import { API_BASE_URL } from '../config/api';
import ProductSearch from './ProductSearch';
import TrendingProducts from './TrendingProducts';
import StoreIntegration from './StoreIntegration';

interface RegistryItem {
  id: string;
  name: string;
  description: string;
  price: number;
  priority: 'high' | 'medium' | 'low';
  category: string;
  isReceived: boolean;
}

interface RegistryManagementModalProps {
  visible: boolean;
  onClose: () => void;
  userData: any;
  onRegistryUpdated: () => void;
}

const RegistryManagementModal: React.FC<RegistryManagementModalProps> = ({
  visible,
  onClose,
  userData,
  onRegistryUpdated
}) => {
  const [registryItems, setRegistryItems] = useState<RegistryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<RegistryItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    category: '',
  });
  const [activeTab, setActiveTab] = useState<'registry' | 'service'>('registry');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showTrendingProducts, setShowTrendingProducts] = useState(false);
  const [showStoreIntegration, setShowStoreIntegration] = useState(false);
  const [showSmartRecommendations, setShowSmartRecommendations] = useState(false);

  const categories = [
    'Technology',
    'Books',
    'Supplies',
    'Clothing',
    'Food',
    'Transportation',
    'Housing',
    'Other'
  ];

  useEffect(() => {
    if (visible) {
      fetchRegistryItems();
    }
  }, [visible]);

  const fetchRegistryItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/students/registry`, {
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setRegistryItems(data.items || []);
      } else {
        console.error('Failed to fetch registry items:', data.message);
      }
    } catch (error) {
      console.error('Error fetching registry items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      priority: 'medium',
      category: '',
    });
    setEditingItem(null);
    setShowAddForm(false);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      showAlert('Validation Error', 'Item name is required');
      return false;
    }
    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      showAlert('Validation Error', 'Please enter a valid price');
      return false;
    }
    if (!formData.category.trim()) {
      showAlert('Validation Error', 'Please select a category');
      return false;
    }
    return true;
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleAddItem = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/students/registry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemName: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          priority: formData.priority,
          category: formData.category
        })
      });

      const data = await response.json();
      if (data.success) {
        showAlert('Success', 'Registry item added successfully!');
        resetForm();
        fetchRegistryItems();
        onRegistryUpdated();
      } else {
        showAlert('Error', data.message || 'Failed to add registry item');
      }
    } catch (error) {
      showAlert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!validateForm() || !editingItem) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/students/registry/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          priority: formData.priority,
          category: formData.category,
          isReceived: editingItem.isReceived
        })
      });

      const data = await response.json();
      if (data.success) {
        showAlert('Success', 'Registry item updated successfully!');
        resetForm();
        fetchRegistryItems();
        onRegistryUpdated();
      } else {
        showAlert('Error', data.message || 'Failed to update registry item');
      }
    } catch (error) {
      showAlert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (item: RegistryItem) => {
    const confirmDelete = () => {
      deleteItem();
    };

    const deleteItem = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/students/registry/${item.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${userData.token}`,
          }
        });

        const data = await response.json();
        if (data.success) {
          showAlert('Success', 'Registry item deleted successfully!');
          fetchRegistryItems();
          onRegistryUpdated();
        } else {
          showAlert('Error', data.message || 'Failed to delete registry item');
        }
      } catch (error) {
        showAlert('Error', 'Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Delete Item',
        `Are you sure you want to delete "${item.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: confirmDelete }
        ]
      );
    }
  };

  const handleEditItem = (item: RegistryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      priority: item.priority,
      category: item.category,
    });
    setShowAddForm(true);
  };

  const toggleItemReceived = async (item: RegistryItem) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/students/registry/${item.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: item.name,
          description: item.description,
          price: item.price,
          priority: item.priority,
          category: item.category,
          isReceived: !item.isReceived
        })
      });

      const data = await response.json();
      if (data.success) {
        fetchRegistryItems();
        onRegistryUpdated();
      } else {
        showAlert('Error', data.message || 'Failed to update item status');
      }
    } catch (error) {
      showAlert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ff6b6b';
      case 'medium': return '#ffc107';
      case 'low': return '#6c757d';
      default: return '#6c757d';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Manage Registry</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'registry' && styles.activeTab]}
            onPress={() => setActiveTab('registry')}
          >
            <Text style={[styles.tabText, activeTab === 'registry' && styles.activeTabText]}>
              📋 My Registry
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'service' && styles.activeTab]}
            onPress={() => setActiveTab('service')}
          >
            <Text style={[styles.tabText, activeTab === 'service' && styles.activeTabText]}>
              🎯 Registry Service
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add Item Button - Only show on registry tab */}
        {!showAddForm && activeTab === 'registry' && (
          <View style={styles.addButtonContainer}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddForm(true)}
            >
              <Text style={styles.addButtonText}>+ Add New Item</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Tab Content */}
          {activeTab === 'registry' && (
            <>
              {/* Add/Edit Form */}
              {showAddForm && (
                <View style={styles.formContainer}>
              <Text style={styles.formTitle}>
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Item Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., MacBook Pro, Textbooks, etc."
                  value={formData.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Brief description of the item..."
                  value={formData.description}
                  onChangeText={(value) => handleInputChange('description', value)}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Price ($) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    value={formData.price}
                    onChangeText={(value) => handleInputChange('price', value)}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Priority</Text>
                  <View style={styles.priorityContainer}>
                    {['high', 'medium', 'low'].map((priority) => (
                      <TouchableOpacity
                        key={priority}
                        style={[
                          styles.priorityButton,
                          formData.priority === priority && styles.priorityButtonActive,
                          { backgroundColor: formData.priority === priority ? getPriorityColor(priority) : '#f8f9fa' }
                        ]}
                        onPress={() => handleInputChange('priority', priority)}
                      >
                        <Text style={[
                          styles.priorityButtonText,
                          formData.priority === priority && styles.priorityButtonTextActive
                        ]}>
                          {priority.charAt(0).toUpperCase() + priority.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryButton,
                        formData.category === category && styles.categoryButtonActive
                      ]}
                      onPress={() => handleInputChange('category', category)}
                    >
                      <Text style={[
                        styles.categoryButtonText,
                        formData.category === category && styles.categoryButtonTextActive
                      ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={resetForm}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.saveButton, loading && styles.disabledButton]}
                  onPress={editingItem ? handleUpdateItem : handleAddItem}
                  disabled={loading}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Registry Items List */}
          <View style={styles.itemsList}>
            <Text style={styles.listTitle}>
              Your Registry Items ({registryItems.length})
            </Text>

            {loading && registryItems.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4285F4" />
                <Text style={styles.loadingText}>Loading registry items...</Text>
              </View>
            ) : registryItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No registry items yet</Text>
                <Text style={styles.emptyStateSubtext}>Add your first item to get started!</Text>
              </View>
            ) : (
              registryItems.map((item, index) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemTitleRow}>
                      <Text style={[styles.itemName, item.isReceived && styles.itemNameReceived]}>
                        {item.name}
                      </Text>
                      <View style={styles.itemBadges}>
                        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                          <Text style={styles.priorityBadgeText}>{item.priority}</Text>
                        </View>
                        {item.isReceived && (
                          <View style={styles.receivedBadge}>
                            <Text style={styles.receivedBadgeText}>✓ Received</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.itemActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEditItem(item)}
                      >
                        <Text style={styles.actionButtonText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDeleteItem(item)}
                      >
                        <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.itemCategory}>{item.category}</Text>
                  <Text style={styles.itemPrice}>${item.price.toLocaleString()}</Text>

                  {item.description && (
                    <Text style={styles.itemDescription}>{item.description}</Text>
                  )}

                  <TouchableOpacity
                    style={[styles.receivedButton, item.isReceived && styles.receivedButtonActive]}
                    onPress={() => toggleItemReceived(item)}
                  >
                    <Text style={[styles.receivedButtonText, item.isReceived && styles.receivedButtonTextActive]}>
                      {item.isReceived ? '✓ Mark as Needed' : 'Mark as Received'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
            </>
          )}

          {/* Registry Service Tab */}
          {activeTab === 'service' && (
            <View style={styles.serviceTabContainer}>
              <Text style={styles.serviceTabTitle}>🎯 Registry Service</Text>
              <Text style={styles.serviceTabSubtitle}>
                Discover products, connect stores, and enhance your registry
              </Text>
              
              {/* Quick Actions */}
              <View style={styles.serviceQuickActions}>
                <TouchableOpacity 
                  style={styles.serviceActionCard}
                  onPress={() => setShowProductSearch(true)}
                >
                  <Text style={styles.serviceActionIcon}>🔍</Text>
                  <Text style={styles.serviceActionTitle}>Search Products</Text>
                  <Text style={styles.serviceActionText}>Find items across multiple stores</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.serviceActionCard}
                  onPress={() => setShowTrendingProducts(true)}
                >
                  <Text style={styles.serviceActionIcon}>🔥</Text>
                  <Text style={styles.serviceActionTitle}>Trending Items</Text>
                  <Text style={styles.serviceActionText}>See what's popular with students</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.serviceActionCard}
                  onPress={() => setShowStoreIntegration(true)}
                >
                  <Text style={styles.serviceActionIcon}>🏪</Text>
                  <Text style={styles.serviceActionTitle}>Connect Stores</Text>
                  <Text style={styles.serviceActionText}>Link your retail accounts</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.serviceActionCard}
                  onPress={() => setShowSmartRecommendations(true)}
                >
                  <Text style={styles.serviceActionIcon}>📊</Text>
                  <Text style={styles.serviceActionTitle}>Smart Recommendations</Text>
                  <Text style={styles.serviceActionText}>AI-powered suggestions</Text>
                </TouchableOpacity>
              </View>
         
              {/* Coming Soon Message */}
              <View style={styles.comingSoonContainer}>
                <Text style={styles.comingSoonTitle}>🚀 Registry Service Active!</Text>
                <Text style={styles.comingSoonText}>
                  Click "Search Products" above to discover and add items from Amazon, Target, Walmart, and more stores directly to your registry!
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
      
      {/* Product Search Modal */}
      {showProductSearch && (
        <Modal visible={showProductSearch} animationType="slide" presentationStyle="pageSheet">
          <ProductSearch
            onClose={() => setShowProductSearch(false)}
            userData={userData}
            onProductAdded={() => {
              // Refresh registry items when a product is added
              fetchRegistryItems();
              if (onRegistryUpdated) {
                onRegistryUpdated();
              }
            }}
          />
        </Modal>
      )}

      {/* Trending Products Modal */}
      {showTrendingProducts && (
        <Modal visible={showTrendingProducts} animationType="slide" presentationStyle="pageSheet">
          <TrendingProducts
            onClose={() => setShowTrendingProducts(false)}
            userData={userData}
            onProductAdded={() => {
              // Refresh registry items when a product is added
              fetchRegistryItems();
              if (onRegistryUpdated) {
                onRegistryUpdated();
              }
            }}
          />
        </Modal>
      )}

      {/* Store Integration Modal */}
      {showStoreIntegration && (
        <Modal visible={showStoreIntegration} animationType="slide" presentationStyle="pageSheet">
          <StoreIntegration
            onClose={() => setShowStoreIntegration(false)}
            userData={userData}
            onIntegrationUpdated={() => {
              // Refresh registry items or update user data if needed
              if (onRegistryUpdated) {
                onRegistryUpdated();
              }
            }}
          />
        </Modal>
      )}

      {/* Smart Recommendations Modal */}
      {showSmartRecommendations && (
        <Modal visible={showSmartRecommendations} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.smartRecommendationsModal}>
            <View style={styles.smartRecommendationsHeader}>
              <Text style={styles.smartRecommendationsTitle}>📊 Smart Recommendations</Text>
              <Text style={styles.smartRecommendationsSubtitle}>
                AI-powered suggestions based on your profile and preferences
              </Text>
              <TouchableOpacity 
                onPress={() => setShowSmartRecommendations(false)}
                style={styles.smartRecommendationsCloseButton}
              >
                <Text style={styles.smartRecommendationsCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.smartRecommendationsContent}>
              <View style={styles.recommendationCard}>
                <Text style={styles.recommendationTitle}>🎓 Based on Computer Science Major</Text>
                <Text style={styles.recommendationText}>
                  • High-performance laptop for programming
                  • Mechanical keyboard for coding
                  • External monitor for dual-screen setup
                </Text>
              </View>
              
              <View style={styles.recommendationCard}>
                <Text style={styles.recommendationTitle}>🏠 Based on Dorm Living</Text>
                <Text style={styles.recommendationText}>
                  • Mini refrigerator for snacks
                  • Microwave for quick meals
                  • Bedding set for comfort
                </Text>
              </View>
              
              <View style={styles.recommendationCard}>
                <Text style={styles.recommendationTitle}>📚 Based on Study Habits</Text>
                <Text style={styles.recommendationText}>
                  • Noise-canceling headphones
                  • Desk lamp with USB charging
                  • Whiteboard for brainstorming
                </Text>
              </View>
              
              <View style={styles.comingSoonContainer}>
                <Text style={styles.comingSoonTitle}>🚀 Coming Soon!</Text>
                <Text style={styles.comingSoonText}>
                  We're working on personalized AI recommendations based on your academic profile, 
                  living situation, and past registry items. Stay tuned for smarter suggestions!
                </Text>
              </View>
            </ScrollView>
          </View>
        </Modal>
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
  addButtonContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  addButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
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
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#34495e',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#2c3e50',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  priorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  priorityButtonActive: {
    borderColor: 'transparent',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
  },
  priorityButtonTextActive: {
    color: 'white',
  },
  categoryContainer: {
    flexDirection: 'row',
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  categoryButtonActive: {
    backgroundColor: '#4285F4',
    borderColor: '#4285F4',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#4285F4',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  itemsList: {
    padding: 15,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    color: '#6c757d',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#adb5bd',
  },
  itemCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    marginBottom: 10,
  },
  itemTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
    marginRight: 10,
  },
  itemNameReceived: {
    textDecorationLine: 'line-through',
    color: '#6c757d',
  },
  itemBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 5,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'uppercase',
  },
  receivedBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  receivedBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
    backgroundColor: '#4285F4',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  deleteButtonText: {
    color: 'white',
  },
  itemCategory: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 5,
    textTransform: 'capitalize',
  },
  itemPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4285F4',
    marginBottom: 10,
  },
  itemDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 15,
  },
  receivedButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#28a745',
    alignItems: 'center',
  },
  receivedButtonActive: {
    backgroundColor: '#28a745',
  },
  receivedButtonText: {
    color: '#28a745',
    fontSize: 14,
    fontWeight: '600',
  },
  receivedButtonTextActive: {
    color: 'white',
  },

  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3C6FA3',
    backgroundColor: '#ffffff',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#3C6FA3',
    fontWeight: '600',
  },
  // Service Tab Styles
  serviceTabContainer: {
    padding: 20,
  },
  serviceTabTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  serviceTabSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  serviceQuickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  serviceActionCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  serviceActionIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  serviceActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  serviceActionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  comingSoonContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3C6FA3',
    marginBottom: 12,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Smart Recommendations Modal Styles
  smartRecommendationsModal: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  smartRecommendationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  smartRecommendationsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  smartRecommendationsSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 15,
  },
  smartRecommendationsCloseButton: {
    padding: 8,
  },
  smartRecommendationsCloseButtonText: {
    fontSize: 18,
    color: '#6c757d',
  },
  smartRecommendationsContent: {
    flex: 1,
  },
  recommendationCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3C6FA3',
    marginBottom: 10,
  },
  recommendationText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
});

export default RegistryManagementModal;