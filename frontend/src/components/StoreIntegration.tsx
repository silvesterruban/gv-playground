// components/StoreIntegration.tsx
// Store Integration Component for Registry Service

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { registryServiceAPI, Store, StoreHealth } from '../services/registryService';

interface StoreIntegrationProps {
  onClose?: () => void;
  userData?: any;
  onStoreConnected?: (storeId: string) => void;
  onStoreDisconnected?: (storeId: string) => void;
  onIntegrationUpdated?: () => void;
}

const StoreIntegration: React.FC<StoreIntegrationProps> = ({
  onClose,
  userData,
  onStoreConnected,
  onStoreDisconnected,
  onIntegrationUpdated,
}) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeHealth, setStoreHealth] = useState<Record<string, StoreHealth>>({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectedStores, setConnectedStores] = useState<string[]>([]);

  useEffect(() => {
    loadStores();
    checkStoreHealth();
    // Load previously connected stores from localStorage
    loadConnectedStores();
  }, []);

  const loadConnectedStores = () => {
    try {
      const saved = localStorage.getItem('connected_stores');
      if (saved) {
        setConnectedStores(JSON.parse(saved));
      }
    } catch (error) {
      console.log('No saved connected stores found');
    }
  };

  const saveConnectedStores = (stores: string[]) => {
    try {
      localStorage.setItem('connected_stores', JSON.stringify(stores));
    } catch (error) {
      console.error('Failed to save connected stores:', error);
    }
  };

  const loadStores = async () => {
    try {
      setLoading(true);
      const storesData = await registryServiceAPI.getStores();
      setStores(storesData);
    } catch (error) {
      console.error('Failed to load stores:', error);
      Alert.alert('Error', 'Failed to load stores. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkStoreHealth = async () => {
    try {
      const healthChecks = await Promise.all(
        stores.map(async (store) => {
          try {
            const health = await registryServiceAPI.checkStoreHealth(store.name);
            return { [store.name]: health };
          } catch (error) {
            const fallbackHealth: StoreHealth = {
              storeId: store.name,
              status: 'unhealthy',
              responseTime: 0,
              lastChecked: new Date().toISOString(),
              features: []
            };
            return { [store.name]: fallbackHealth };
          }
        })
      );

      const healthMap = healthChecks.reduce((acc, health) => ({ ...acc, ...health }), {} as Record<string, StoreHealth>);
      setStoreHealth(healthMap);
    } catch (error) {
      console.error('Failed to check store health:', error);
    }
  };

    const handleStoreConnect = async (store: Store) => {
    try {
      console.log('🔗 Starting mock OAuth flow for store:', store.name);
      setConnecting(store.name);
      
      // Simulate OAuth flow with realistic delays
      console.log('🔄 Step 1: Initiating connection...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('🔐 Step 2: Authorizing with store...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      console.log('⚙️ Step 3: Completing integration...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Complete the connection
      const newConnectedStores = [...connectedStores, store.name];
      setConnectedStores(newConnectedStores);
      saveConnectedStores(newConnectedStores);
      
      if (onStoreConnected) {
        onStoreConnected(store.name);
      }
      
      setConnecting(null);
      Alert.alert('Success! 🎉', `Successfully connected to ${store.displayName}! You can now search products and sync your registry.`);
      
    } catch (error) {
      console.error('Failed to connect to store:', error);
      Alert.alert('Error', `Failed to connect to ${store.displayName}. Please try again.`);
      setConnecting(null);
    }
  };

  const handleStoreDisconnect = async (storeId: string) => {
    try {
      // Here you would typically call an API to disconnect the store
      // For now, we'll just update the local state
             const newConnectedStores = connectedStores.filter(id => id !== storeId);
       setConnectedStores(newConnectedStores);
       saveConnectedStores(newConnectedStores); // Save to localStorage
      
      if (onStoreDisconnected) {
        onStoreDisconnected(storeId);
      }
      
      Alert.alert('Success', 'Store disconnected successfully');
    } catch (error) {
      console.error('Failed to disconnect store:', error);
      Alert.alert('Error', 'Failed to disconnect store. Please try again.');
    }
  };

  const getStoreIcon = (storeId: string) => {
    switch (storeId.toLowerCase()) {
      case 'amazon':
        return '🛒';
      case 'target':
        return '🎯';
      case 'walmart':
        return '🏪';
      default:
        return '🏬';
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return '#28a745';
      case 'unhealthy':
        return '#dc3545';
      default:
        return '#ffc107';
    }
  };

  const getHealthStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Connected';
      case 'unhealthy':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading store integrations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏪 Store Integrations</Text>
        <Text style={styles.subtitle}>
          Connect your accounts to automatically sync products and manage your registry
        </Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.storesContainer} showsVerticalScrollIndicator={false}>
        {stores.map((store) => {
          const isConnected = connectedStores.includes(store.name);
          const health = storeHealth[store.name];
          const isConnecting = connecting === store.name;

          return (
            <View key={store.name} style={styles.storeCard}>
              {/* Store Header */}
              <View style={styles.storeHeader}>
                <View style={styles.storeInfo}>
                  <Text style={styles.storeIcon}>
                    {getStoreIcon(store.name)}
                  </Text>
                  <View style={styles.storeDetails}>
                    <Text style={styles.storeName}>{store.displayName}</Text>
                    <Text style={styles.storeDomain}>
                      {store.domain || store.apiEndpoint}
                    </Text>
                  </View>
                </View>

                {/* Health Status */}
                {health && (
                  <View style={styles.healthStatus}>
                    <View
                      style={[
                        styles.healthIndicator,
                        { backgroundColor: getHealthStatusColor(health.status) }
                      ]}
                    />
                    <Text style={styles.healthText}>
                      {getHealthStatusText(health.status)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Store Features */}
              <View style={styles.storeFeatures}>
                <Text style={styles.featuresTitle}>Available Features:</Text>
                <View style={styles.featuresList}>
                  {store.supportedFeatures.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Text style={styles.featureText}>• {feature}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Connection Status */}
              <View style={styles.connectionStatus}>
                {isConnected ? (
                  <View style={styles.connectedStatus}>
                    <Text style={styles.connectedText}>✅ Connected</Text>
                    <TouchableOpacity
                      style={styles.disconnectButton}
                      onPress={() => handleStoreDisconnect(store.name)}
                    >
                      <Text style={styles.disconnectButtonText}>Disconnect</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.disconnectedStatus}>
                    <Text style={styles.disconnectedText}>❌ Not Connected</Text>
                    <TouchableOpacity
                      style={[
                        styles.connectButton,
                        isConnecting && styles.connectButtonDisabled
                      ]}
                      onPress={() => handleStoreConnect(store)}
                      disabled={isConnecting}
                    >
                      {isConnecting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.connectButtonText}>Connect</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Store Stats */}
              {health && (
                <View style={styles.storeStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Response Time</Text>
                    <Text style={styles.statValue}>{health.responseTime}ms</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Last Checked</Text>
                    <Text style={styles.statValue}>
                      {new Date(health.lastChecked).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Help Section */}
      <View style={styles.helpSection}>
        <Text style={styles.helpTitle}>💡 How it works</Text>
        <Text style={styles.helpText}>
          Connecting your store accounts allows us to automatically sync products, 
          track prices, and manage your registry across multiple retailers. 
          Your data is secure and we only access what's necessary for registry management.
        </Text>
      </View>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  storesContainer: {
    flex: 1,
    padding: 20,
  },
  storeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storeIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  storeDetails: {
    flex: 1,
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  storeDomain: {
    fontSize: 14,
    color: '#666',
  },
  healthStatus: {
    alignItems: 'center',
  },
  healthIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  healthText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  storeFeatures: {
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureItem: {
    width: '50%',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
  },
  connectionStatus: {
    marginBottom: 16,
  },
  connectedStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  connectedText: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: '600',
  },
  disconnectButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disconnectedStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disconnectedText: {
    fontSize: 16,
    color: '#dc3545',
    fontWeight: '600',
  },
  connectButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  connectButtonDisabled: {
    backgroundColor: '#ccc',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  storeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  helpSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default StoreIntegration;
