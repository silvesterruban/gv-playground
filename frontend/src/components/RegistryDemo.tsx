// components/RegistryDemo.tsx
// Demo Component for Registry Service Features

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import RegistryDashboard from './RegistryDashboard';
import ProductSearch from './ProductSearch';
import TrendingProducts from './TrendingProducts';
import StoreIntegration from './StoreIntegration';

const RegistryDemo: React.FC = () => {
  const [activeComponent, setActiveComponent] = useState<'dashboard' | 'search' | 'trending' | 'stores'>('dashboard');
  const [showModal, setShowModal] = useState(false);

  const handleProductSelect = (product: any) => {
    Alert.alert(
      'Product Selected',
      `Selected: ${product.name}\nPrice: $${product.price}\nStore: ${product.storeId}`,
      [{ text: 'OK' }]
    );
  };

  const renderComponentSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorTitle}>🎯 Registry Service Demo</Text>
      <Text style={styles.selectorSubtitle}>Choose a component to test:</Text>
      
      <View style={styles.buttonGrid}>
        <TouchableOpacity
          style={[styles.demoButton, activeComponent === 'dashboard' && styles.activeButton]}
          onPress={() => setActiveComponent('dashboard')}
        >
          <Text style={styles.buttonIcon}>🏠</Text>
          <Text style={styles.buttonText}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.demoButton, activeComponent === 'search' && styles.activeButton]}
          onPress={() => setActiveComponent('search')}
        >
          <Text style={styles.buttonIcon}>🔍</Text>
          <Text style={styles.buttonText}>Product Search</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.demoButton, activeComponent === 'trending' && styles.activeButton]}
          onPress={() => setActiveComponent('trending')}
        >
          <Text style={styles.buttonIcon}>🔥</Text>
          <Text style={styles.buttonText}>Trending Products</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.demoButton, activeComponent === 'stores' && styles.activeButton]}
          onPress={() => setActiveComponent('stores')}
        >
          <Text style={styles.buttonIcon}>🏪</Text>
          <Text style={styles.buttonText}>Store Integration</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.modalButton}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.modalButtonText}>📱 Open in Modal</Text>
      </TouchableOpacity>
    </View>
  );

  const renderActiveComponent = () => {
    switch (activeComponent) {
      case 'dashboard':
        return (
          <RegistryDashboard
            userData={{ id: 'demo-user', name: 'Demo Student' }}
            onClose={() => setActiveComponent('dashboard')}
          />
        );
      case 'search':
        return (
          <ProductSearch
            onProductSelect={handleProductSelect}
            onClose={() => setActiveComponent('dashboard')}
            userData={{ id: 'demo-user', name: 'Demo Student' }}
          />
        );
      case 'trending':
        return (
          <TrendingProducts
            onProductSelect={handleProductSelect}
            limit={10}
          />
        );
      case 'stores':
        return (
          <StoreIntegration
            userData={{ id: 'demo-user', name: 'Demo Student' }}
            onStoreConnected={(storeId) => Alert.alert('Success', `Connected to ${storeId}!`)}
            onStoreDisconnected={(storeId) => Alert.alert('Success', `Disconnected from ${storeId}!`)}
          />
        );
      default:
        return renderComponentSelector();
    }
  };

  return (
    <View style={styles.container}>
      {activeComponent === 'dashboard' ? (
        renderActiveComponent()
      ) : (
        <View style={styles.componentContainer}>
          <View style={styles.componentHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setActiveComponent('dashboard')}
            >
              <Text style={styles.backButtonText}>← Back to Demo</Text>
            </TouchableOpacity>
            <Text style={styles.componentTitle}>
              {activeComponent === 'search' && '🔍 Product Search'}
              {activeComponent === 'trending' && '🔥 Trending Products'}
              {activeComponent === 'stores' && '🏪 Store Integration'}
            </Text>
          </View>
          {renderActiveComponent()}
        </View>
      )}

      {/* Modal Demo */}
      {showModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📱 Modal Demo</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.closeModalButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>
                This demonstrates how the Registry Dashboard can be opened in a modal overlay.
              </Text>
              <RegistryDashboard
                userData={{ id: 'demo-user', name: 'Demo Student' }}
                onClose={() => setShowModal(false)}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  selectorContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  selectorTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
  },
  selectorSubtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  demoButton: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  activeButton: {
    backgroundColor: '#007AFF',
  },
  buttonIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 25,
    alignSelf: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  componentContainer: {
    flex: 1,
  },
  componentHeader: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  componentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    width: width * 0.9,
    height: height * 0.8,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeModalButton: {
    padding: 8,
  },
  closeModalButtonText: {
    fontSize: 24,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
});

export default RegistryDemo;







