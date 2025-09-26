// components/RegistryDashboard.tsx
// Main Registry Dashboard Component - Integrates all Registry Service features

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import ProductSearch from './ProductSearch';
import TrendingProducts from './TrendingProducts';
import StoreIntegration from './StoreIntegration';
import { Product } from '../services/registryService';

interface RegistryDashboardProps {
  userData?: any;
  onClose?: () => void;
}

const RegistryDashboard: React.FC<RegistryDashboardProps> = ({
  userData,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'search' | 'stores' | 'trending'>('overview');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [connectedStores, setConnectedStores] = useState<string[]>([]);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    // Here you would typically add the product to the user's registry
    Alert.alert(
      'Add to Registry',
      `Would you like to add "${product.name}" to your registry?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Add to Registry', 
          onPress: () => {
            // Add to registry logic would go here
            Alert.alert('Success', 'Product added to your registry!');
            setSelectedProduct(null);
          }
        }
      ]
    );
  };

  const handleStoreConnected = (storeId: string) => {
    setConnectedStores(prev => [...prev, storeId]);
    Alert.alert('Success', 'Store connected successfully!');
  };

  const handleStoreDisconnected = (storeId: string) => {
    setConnectedStores(prev => prev.filter(id => id !== storeId));
  };

  const renderOverview = () => (
    <View style={styles.overviewContainer}>
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>🎓 Welcome to Your Registry Dashboard</Text>
        <Text style={styles.welcomeSubtitle}>
          Manage your academic registry, discover products, and connect with stores
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => setShowProductSearch(true)}
        >
          <Text style={styles.actionIcon}>🔍</Text>
          <Text style={styles.actionTitle}>Search Products</Text>
          <Text style={styles.actionSubtitle}>Find items across multiple stores</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => setActiveTab('stores')}
        >
          <Text style={styles.actionIcon}>🏪</Text>
          <Text style={styles.actionTitle}>Connect Stores</Text>
          <Text style={styles.actionSubtitle}>Link your accounts for easy syncing</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => setActiveTab('trending')}
        >
          <Text style={styles.actionIcon}>🔥</Text>
          <Text style={styles.actionTitle}>Trending Items</Text>
          <Text style={styles.actionSubtitle}>See what's popular with students</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => Alert.alert('Coming Soon', 'Registry management features coming soon!')}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionTitle}>My Registry</Text>
          <Text style={styles.actionSubtitle}>View and manage your items</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsSection}>
        <Text style={styles.statsTitle}>📊 Registry Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Items in Registry</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{connectedStores.length}</Text>
            <Text style={styles.statLabel}>Connected Stores</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>$0.00</Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Wishlist Items</Text>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.recentActivity}>
        <Text style={styles.recentTitle}>🕒 Recent Activity</Text>
        <View style={styles.activityItem}>
          <Text style={styles.activityText}>Welcome to your registry dashboard!</Text>
          <Text style={styles.activityTime}>Just now</Text>
        </View>
      </View>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'search':
        return (
          <ProductSearch
            onProductSelect={handleProductSelect}
            onClose={() => setActiveTab('overview')}
            userData={userData}
          />
        );
      case 'stores':
        return (
          <StoreIntegration
            userData={userData}
            onStoreConnected={handleStoreConnected}
            onStoreDisconnected={handleStoreDisconnected}
          />
        );
      case 'trending':
        return (
          <TrendingProducts
            onProductSelect={handleProductSelect}
            limit={20}
          />
        );
      default:
        return renderOverview();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Registry Dashboard</Text>
          <Text style={styles.headerSubtitle}>Manage your academic registry</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'overview', label: 'Overview', icon: '🏠' },
            { key: 'search', label: 'Search', icon: '🔍' },
            { key: 'stores', label: 'Stores', icon: '🏪' },
            { key: 'trending', label: 'Trending', icon: '🔥' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.activeTab
              ]}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[
                styles.tabLabel,
                activeTab === tab.key && styles.activeTabLabel
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content Area */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>

      {/* Product Search Modal */}
      <Modal
        visible={showProductSearch}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <ProductSearch
          onProductSelect={handleProductSelect}
          onClose={() => setShowProductSearch(false)}
          userData={userData}
        />
      </Modal>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabLabel: {
    color: '#007AFF',
  },
  content: {
    flex: 1,
  },
  overviewContainer: {
    padding: 20,
  },
  welcomeSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  quickActions: {
    marginBottom: 24,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  statsSection: {
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  recentActivity: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
});

export default RegistryDashboard;







