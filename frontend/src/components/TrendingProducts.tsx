// components/TrendingProducts.tsx
// Trending Products Component for Registry Service Integration

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { registryServiceAPI, Product } from '../services/registryService';
import { API_BASE_URL } from '../config/api';

interface TrendingProductsProps {
  onProductSelect?: (product: Product) => void;
  onClose?: () => void;
  userData?: any;
  onProductAdded?: () => void;
  limit?: number;
}

const TrendingProducts: React.FC<TrendingProductsProps> = ({
  onProductSelect,
  onClose,
  userData,
  onProductAdded,
  limit = 10
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToRegistry, setAddingToRegistry] = useState<string | null>(null);

  useEffect(() => {
    loadTrendingProducts();
  }, [limit]);

  const loadTrendingProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await registryServiceAPI.getTrendingProducts(limit);
      
      if (response.success) {
        setProducts(response.data.products);
      } else {
        setError('Failed to load trending products');
      }
    } catch (error) {
      console.error('Error loading trending products:', error);
      setError('Failed to load trending products');
    } finally {
      setLoading(false);
    }
  };

  // Add product to registry
  const handleAddToRegistry = async (product: Product) => {
    if (!userData?.token) {
      Alert.alert('Authentication Required', 'Please log in to add items to your registry.');
      return;
    }

    try {
      setAddingToRegistry(product.id);
      
      // Add to backend registry
      const response = await fetch(`${API_BASE_URL}/api/students/registry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemName: product.name,
          description: `${product.description || ''} (From ${product.storeId})`,
          price: product.price,
          priority: 'medium',
          category: product.category || 'Other'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert(
          'Success! 🎉', 
          `${product.name} has been added to your registry!`
        );
        
        // Notify parent component to refresh registry
        if (onProductAdded) {
          onProductAdded();
        }
      } else {
        Alert.alert('Error', data.message || 'Failed to add item to registry');
      }
    } catch (error) {
      console.error('Error adding to registry:', error);
      Alert.alert('Error', 'Failed to add item to registry. Please try again.');
    } finally {
      setAddingToRegistry(null);
    }
  };

  const handleProductPress = (product: Product) => {
    if (onProductSelect) {
      onProductSelect(product);
    }
  };

  const handleRetry = () => {
    loadTrendingProducts();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading trending products...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No trending products available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔥 Trending Products</Text>
        <Text style={styles.subtitle}>Popular items students are adding to their registries</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productsContainer}
      >
        {products.map((product) => (
          <TouchableOpacity
            key={product.id}
            style={styles.productCard}
            onPress={() => handleProductPress(product)}
            activeOpacity={0.7}
          >
            {/* Product Image Placeholder */}
            <View style={styles.imageContainer}>
              {product.imageUrl ? (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imageText}>
                    {product.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imageText}>
                    {product.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              
              {/* Store Badge */}
              <View style={styles.storeBadge}>
                <Text style={styles.storeBadgeText}>
                  {product.storeId === 'amazon' ? 'Amazon' : 
                   product.storeId === 'target' ? 'Target' : 
                   product.storeId === 'walmart' ? 'Walmart' : 
                   product.storeId}
                </Text>
              </View>
            </View>

            {/* Product Info */}
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>
                {product.name}
              </Text>
              
              {product.brand && (
                <Text style={styles.productBrand} numberOfLines={1}>
                  {product.brand}
                </Text>
              )}

              <View style={styles.productMeta}>
                <Text style={styles.productPrice}>
                  ${product.price.toFixed(2)}
                </Text>
                
                {product.rating && (
                  <View style={styles.ratingContainer}>
                    <Text style={styles.ratingText}>★ {product.rating}</Text>
                    {product.reviewCount && (
                      <Text style={styles.reviewCount}>
                        ({product.reviewCount})
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* Availability Status */}
              <View style={[
                styles.availabilityBadge,
                product.availability === 'in_stock' && styles.inStockBadge,
                product.availability === 'limited' && styles.limitedBadge,
                product.availability === 'out_of_stock' && styles.outOfStockBadge,
              ]}>
                <Text style={[
                  styles.availabilityText,
                  product.availability === 'in_stock' && styles.inStockText,
                  product.availability === 'limited' && styles.limitedText,
                  product.availability === 'out_of_stock' && styles.outOfStockText,
                ]}>
                  {product.availability === 'in_stock' ? 'In Stock' :
                   product.availability === 'limited' ? 'Limited' :
                   'Out of Stock'}
                </Text>
              </View>
              
              {/* Add to Registry Button */}
              <TouchableOpacity
                style={[
                  styles.addToRegistryButton,
                  addingToRegistry === product.id && styles.addingToRegistryButton
                ]}
                onPress={() => handleAddToRegistry(product)}
                disabled={addingToRegistry === product.id}
              >
                {addingToRegistry === product.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addToRegistryButtonText}>+ Add to Registry</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* View All Button */}
      <TouchableOpacity style={styles.viewAllButton}>
        <Text style={styles.viewAllButtonText}>View All Trending Products</Text>
      </TouchableOpacity>
    </View>
  );
};

const { width } = Dimensions.get('window');
const cardWidth = Math.min(200, width * 0.4);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 20,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
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
    fontSize: 20,
    color: '#666',
  },
  productsContainer: {
    paddingHorizontal: 20,
  },
  productCard: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 140,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e1e5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#999',
  },
  storeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  storeBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  productInfo: {
    padding: 16,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
    lineHeight: 18,
  },
  productBrand: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '600',
  },
  reviewCount: {
    fontSize: 11,
    color: '#999',
    marginLeft: 4,
  },
  availabilityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  inStockBadge: {
    backgroundColor: '#d4edda',
  },
  limitedBadge: {
    backgroundColor: '#fff3cd',
  },
  outOfStockBadge: {
    backgroundColor: '#f8d7da',
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  inStockText: {
    color: '#155724',
  },
  limitedText: {
    color: '#856404',
  },
  outOfStockText: {
    color: '#721c24',
  },
  addToRegistryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  addingToRegistryButton: {
    backgroundColor: '#6c757d',
  },
  addToRegistryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  viewAllButton: {
    alignSelf: 'center',
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 25,
  },
  viewAllButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default TrendingProducts;
