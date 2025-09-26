// components/ProductSearch.tsx
// Modern Product Search Component for Registry Service Integration

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { registryServiceAPI, Product, Store, SearchProductsRequest } from '../services/registryService';
import { API_BASE_URL } from '../config/api';

interface ProductSearchProps {
  onProductSelect?: (product: Product) => void;
  onClose?: () => void;
  userData?: any;
  onProductAdded?: () => void; // Callback when product is added to registry
}

const ProductSearch: React.FC<ProductSearchProps> = ({
  onProductSelect,
  onClose,
  userData,
  onProductAdded
}) => {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [productsByStore, setProductsByStore] = useState<{
    amazon: Product[];
    target: Product[];
    walmart: Product[];
  }>({ amazon: [], target: [], walmart: [] });
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addingToRegistry, setAddingToRegistry] = useState<string | null>(null); // Track which product is being added

  // Filter states
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [minRating, setMinRating] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'price' | 'rating' | 'newest'>('relevance');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const itemsPerPage = 20;

  // Load stores on component mount
  useEffect(() => {
    loadStores();
  }, []);

  // Load search suggestions when query changes
  useEffect(() => {
    if (searchQuery.length > 2) {
      loadSearchSuggestions();
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  // Debounced search for price range changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        performSearch(1, false);
      }, 500); // Wait 500ms after user stops typing
      
      return () => clearTimeout(timeoutId);
    }
  }, [priceRange.min, priceRange.max]);

  // Load available stores
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

  // Load search suggestions
  const loadSearchSuggestions = async () => {
    try {
      const suggestionsData = await registryServiceAPI.getSearchSuggestions(searchQuery, 5);
      if (suggestionsData.success) {
        setSuggestions(suggestionsData.data.suggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
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
      
      // Find store information
      const store = stores.find(s => s.name === product.storeId);
      const storeName = store?.displayName || product.storeId;
      
      // Add to backend registry
      const response = await fetch(`${API_BASE_URL}/api/students/registry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemName: product.name,
          description: `${product.description || ''} (From ${storeName})`,
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

  // Perform product search
  const performSearch = async (page: number = 1, append: boolean = false, overrideStores?: string[]) => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      
      // Use overrideStores if provided, otherwise use selectedStores
      const storesToUse = overrideStores || selectedStores;
      
      console.log('[ProductSearch] Search request:', {
        query: searchQuery.trim(),
        selectedStores,
        overrideStores,
        storesToUse,
        selectedStoresLength: storesToUse.length,
        selectedStoresContent: JSON.stringify(storesToUse),
        storeIds: storesToUse.length > 0 ? storesToUse : undefined,
        category: selectedCategory || undefined,
        minPrice: priceRange.min ? parseFloat(priceRange.min) : undefined,
        maxPrice: priceRange.max ? parseFloat(priceRange.max) : undefined,
        minRating: minRating > 0 ? minRating : undefined,
        inStockOnly,
        sortBy,
        limit: itemsPerPage,
        offset: (page - 1) * itemsPerPage,
      });

      const searchRequest: SearchProductsRequest = {
        query: searchQuery.trim(),
        storeIds: storesToUse.length > 0 ? storesToUse : undefined,
        category: selectedCategory || undefined,
        minPrice: priceRange.min ? parseFloat(priceRange.min) : undefined,
        maxPrice: priceRange.max ? parseFloat(priceRange.max) : undefined,
        minRating: minRating > 0 ? minRating : undefined,
        inStockOnly,
        sortBy,
        limit: itemsPerPage,
        offset: (page - 1) * itemsPerPage,
      };

      const response = await registryServiceAPI.searchProducts(searchRequest);
      
      if (response.success) {
        if (append) {
          setProducts(prev => [...prev, ...response.data.products]);
          // Update store-organized products
          if (response.data.productsByStore) {
            setProductsByStore(prev => ({
              amazon: [...prev.amazon, ...(response.data.productsByStore!.amazon || [])],
              target: [...prev.target, ...(response.data.productsByStore!.target || [])],
              walmart: [...prev.walmart, ...(response.data.productsByStore!.walmart || [])]
            }));
          }
        } else {
          setProducts(response.data.products);
          // Set store-organized products
          if (response.data.productsByStore) {
            setProductsByStore(response.data.productsByStore);
          } else {
            // Fallback: organize products by store manually
            const organized = {
              amazon: response.data.products.filter((p: Product) => (p.store || p.storeId) === 'amazon'),
              target: response.data.products.filter((p: Product) => (p.store || p.storeId) === 'target'),
              walmart: response.data.products.filter((p: Product) => (p.store || p.storeId) === 'walmart')
            };
            setProductsByStore(organized);
          }
        }
        setHasMore(response.data.products.length === itemsPerPage);
        setCurrentPage(page);
      } else {
        Alert.alert('Search Error', 'Failed to perform search. Please try again.');
      }
    } catch (error) {
      console.error('Search failed:', error);
      Alert.alert('Error', 'Search failed. Please check your connection and try again.');
    } finally {
      setSearching(false);
    }
  };

  // Handle search submission
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      Alert.alert('Search Error', 'Please enter a search term.');
      return;
    }
    setCurrentPage(1);
    performSearch(1, false);
  };

  // Load more results
  const loadMore = () => {
    if (hasMore && !searching) {
      performSearch(currentPage + 1, true);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    setCurrentPage(1);
    performSearch(1, false);
  };

  // Handle product selection
  const handleProductSelect = (product: Product) => {
    if (onProductSelect) {
      onProductSelect(product);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSelectedStores([]);
    setSelectedCategory('');
    setPriceRange({ min: '', max: '' });
    setMinRating(0);
    setInStockOnly(false);
    setSortBy('relevance');
    
    // Automatically trigger search when filters are reset
    if (searchQuery.trim()) {
      setTimeout(() => performSearch(1, false), 100);
    }
  };

  // Toggle store selection with better debugging
  const toggleStore = (storeId: string) => {
    console.log('[ProductSearch] Toggling store:', storeId);
    console.log('[ProductSearch] Current selectedStores before toggle:', selectedStores);
    
    setSelectedStores(prev => {
      const isCurrentlySelected = prev.includes(storeId);
      const newSelection = isCurrentlySelected 
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId];
      
      console.log('[ProductSearch] Store selection changed from', prev, 'to', newSelection);
      console.log('[ProductSearch] Was', storeId, 'selected?', isCurrentlySelected);
      console.log('[ProductSearch] New selection length:', newSelection.length);
      
      // Automatically trigger search when store selection changes
      if (searchQuery.trim()) {
        console.log('[ProductSearch] Auto-triggering search with stores:', newSelection);
        // Pass the new selection directly to avoid state update timing issues
        setTimeout(() => {
          console.log('[ProductSearch] Executing search with stores:', newSelection);
          performSearch(1, false, newSelection);
        }, 100);
      }
      
      return newSelection;
    });
  };

  // Render store filter
  const renderStoreFilter = () => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>Stores</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storesContainer}>
        {stores.map(store => (
          <TouchableOpacity
            key={store.id}
            style={[
              styles.storeChip,
              selectedStores.includes(store.id) && styles.storeChipSelected
            ]}
            onPress={() => toggleStore(store.id)}
          >
            <Text style={[
              styles.storeChipText,
              selectedStores.includes(store.id) && styles.storeChipTextSelected
            ]}>
              {store.displayName}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Render price filter
  const renderPriceFilter = () => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>Price Range</Text>
      <View style={styles.priceInputs}>
        <TextInput
          style={styles.priceInput}
          placeholder="Min"
          value={priceRange.min}
          onChangeText={(text) => setPriceRange(prev => ({ ...prev, min: text }))}
          keyboardType="numeric"
          placeholderTextColor="#666"
        />
        <Text style={styles.priceSeparator}>-</Text>
        <TextInput
          style={styles.priceInput}
          placeholder="Max"
          value={priceRange.max}
          onChangeText={(text) => setPriceRange(prev => ({ ...prev, max: text }))}
          keyboardType="numeric"
          placeholderTextColor="#666"
        />
      </View>
    </View>
  );

  // Render rating filter
  const renderRatingFilter = () => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>Minimum Rating</Text>
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map(rating => (
          <TouchableOpacity
            key={rating}
            style={[
              styles.ratingChip,
              minRating >= rating && styles.ratingChipSelected
            ]}
            onPress={() => {
              const newRating = minRating === rating ? 0 : rating;
              setMinRating(newRating);
              
              // Automatically trigger search when rating changes
              if (searchQuery.trim()) {
                setTimeout(() => performSearch(1, false), 100);
              }
            }}
          >
            <Text style={[
              styles.ratingChipText,
              minRating >= rating && styles.ratingChipTextSelected
            ]}>
              {rating}+
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Render sort options
  const renderSortOptions = () => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>Sort By</Text>
      <View style={styles.sortContainer}>
        {[
          { key: 'relevance', label: 'Relevance' },
          { key: 'price', label: 'Price' },
          { key: 'rating', label: 'Rating' },
          { key: 'newest', label: 'Newest' }
        ].map(option => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.sortChip,
              sortBy === option.key && styles.sortChipSelected
            ]}
            onPress={() => {
              setSortBy(option.key as any);
              
              // Automatically trigger search when sort changes
              if (searchQuery.trim()) {
                setTimeout(() => performSearch(1, false), 100);
              }
            }}
          >
            <Text style={[
              styles.sortChipText,
              sortBy === option.key && styles.sortChipTextSelected
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Render product card
  const renderProductCard = (product: Product) => (
    <View key={product.id} style={styles.productCard}>
      <TouchableOpacity
        style={styles.productCardContent}
        onPress={() => handleProductSelect(product)}
      >
        {product.imageUrl && (
          <View style={styles.productImageContainer}>
            <Text style={styles.productImagePlaceholder}>
              {product.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.productBrand} numberOfLines={1}>
            {product.brand || 'Unknown Brand'}
          </Text>
          <View style={styles.productMeta}>
            <Text style={styles.productPrice}>
              ${product.price.toFixed(2)}
            </Text>
            {product.rating && (
              <View style={styles.productRatingContainer}>
                <Text style={styles.ratingText}>★ {product.rating}</Text>
                {product.reviewCount && (
                  <Text style={styles.reviewCount}>({product.reviewCount})</Text>
                )}
              </View>
            )}
          </View>
          <View style={styles.storeBadge}>
            <Text style={styles.storeBadgeText}>
              {stores.find(s => s.name === product.storeId)?.displayName || product.storeId}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      
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
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Product Search</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={searching}
        >
          {searching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionItem}
              onPress={() => handleSuggestionSelect(suggestion)}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        {renderStoreFilter()}
        {renderPriceFilter()}
        {renderRatingFilter()}
        {renderSortOptions()}
      </ScrollView>

      {/* Filter Reset */}
      <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
        <Text style={styles.resetButtonText}>Reset Filters</Text>
      </TouchableOpacity>

      {/* Results */}
      <ScrollView style={styles.resultsContainer}>
        {products.length > 0 ? (
          <>
            <Text style={styles.resultsCount}>
              {products.length} products found
            </Text>
            
            {/* Store-organized display */}
            <View style={styles.storesDisplay}>
              {/* Amazon Store */}
              <View style={styles.storeSection}>
                <View style={styles.storeHeader}>
                  <Text style={styles.storeName}>🛒 Amazon.com</Text>
                  <Text style={styles.storeCount}>{productsByStore.amazon.length} products</Text>
                </View>
                <View style={styles.storeProducts}>
                  {productsByStore.amazon.map(renderProductCard)}
                </View>
              </View>

              {/* Target Store */}
              <View style={styles.storeSection}>
                <View style={styles.storeHeader}>
                  <Text style={styles.storeName}>🎯 Target</Text>
                  <Text style={styles.storeCount}>{productsByStore.target.length} products</Text>
                </View>
                <View style={styles.storeProducts}>
                  {productsByStore.target.map(renderProductCard)}
                </View>
              </View>

              {/* Walmart Store */}
              <View style={styles.storeSection}>
                <Text style={styles.storeName}>🛒 Walmart</Text>
                <Text style={styles.storeCount}>{productsByStore.walmart.length} products</Text>
                <View style={styles.storeProducts}>
                  {productsByStore.walmart.map(renderProductCard)}
                </View>
              </View>
            </View>

            {hasMore && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={loadMore}
                disabled={searching}
              >
                {searching ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Text style={styles.loadMoreText}>Load More</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        ) : searchQuery && !searching ? (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>No products found</Text>
            <Text style={styles.noResultsSubtext}>Try adjusting your search terms or filters</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading stores...</Text>
        </View>
      )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  searchInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    marginRight: 12,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  suggestionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  filterSection: {
    marginRight: 20,
    minWidth: 120,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  storesContainer: {
    flexDirection: 'row',
  },
  storeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  storeChipSelected: {
    backgroundColor: '#007AFF',
  },
  storeChipText: {
    fontSize: 12,
    color: '#666',
  },
  storeChipTextSelected: {
    color: '#fff',
  },
  priceInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInput: {
    width: 60,
    height: 32,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 12,
    textAlign: 'center',
  },
  priceSeparator: {
    marginHorizontal: 8,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  ratingChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginRight: 6,
    marginBottom: 4,
  },
  ratingChipSelected: {
    backgroundColor: '#007AFF',
  },
  ratingChipText: {
    fontSize: 11,
    color: '#666',
  },
  ratingChipTextSelected: {
    color: '#fff',
  },
  sortContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  sortChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginRight: 6,
    marginBottom: 4,
  },
  sortChipSelected: {
    backgroundColor: '#007AFF',
  },
  sortChipText: {
    fontSize: 11,
    color: '#666',
  },
  sortChipTextSelected: {
    color: '#fff',
  },
  resetButton: {
    alignSelf: 'center',
    padding: 12,
    marginVertical: 16,
  },
  resetButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  resultsCount: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: (width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productCardContent: {
    flex: 1,
  },
  productImageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  productImagePlaceholder: {
    fontSize: 32,
    color: '#999',
    fontWeight: 'bold',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
    lineHeight: 18,
  },
  productBrand: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  productRatingContainer: {
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
  storeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  storeBadgeText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  addToRegistryButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  addingToRegistryButton: {
    backgroundColor: '#0056b3', // Darker blue when adding
  },
  addToRegistryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadMoreButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
    marginTop: 16,
  },
  loadMoreText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  // Store-organized display styles
  storesDisplay: {
    padding: 16,
  },
  storeSection: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  storeCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  storeProducts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});

export default ProductSearch;
