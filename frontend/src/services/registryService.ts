// services/registryService.ts
// Registry Service API Client for communicating with the Registry Service microservice

export interface Product {
  id: string;
  storeId?: string;  // Optional for backward compatibility
  store?: string;    // What the registry service actually returns
  externalId?: string;
  name: string;
  description?: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  imageUrl?: string;
  price: number;
  currency?: string;
  availability?: string;
  rating?: number;
  reviewCount?: number;
  url?: string;
  lastUpdated?: string;
  createdAt?: string;
}

export interface Store {
  id: string;      // Store identifier (amazon, target, walmart)
  name: string;    // Store name (Amazon, Target, Walmart)
  displayName: string;
  domain?: string;
  logoUrl?: string;
  apiEndpoint: string;
  supportedFeatures: string[];
  rateLimit: number;
  isActive: boolean;
}

export interface SearchProductsRequest {
  query: string;
  storeIds?: string[];
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStockOnly?: boolean;
  sortBy?: 'price' | 'rating' | 'relevance' | 'newest';
  limit?: number;
  offset?: number;
}

export interface SearchProductsResponse {
  success: boolean;
  data: {
    products: Product[];
    productsByStore?: {
      amazon: Product[];
      target: Product[];
      walmart: Product[];
    };
    total: number;
    query: string;
    filters: any;
    stores?: string[];
    storeCounts?: {
      amazon: number;
      target: number;
      walmart: number;
    };
  };
}

export interface AdvancedSearchRequest {
  query: string;
  storeIds?: string[];
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStockOnly?: boolean;
  sortBy?: 'price' | 'rating' | 'relevance' | 'newest';
  limit?: number;
  offset?: number;
}

export interface StoreHealth {
  storeId: string;
  status: string;
  responseTime: number;
  lastChecked: string;
  features: string[];
}

export interface AuthUrlResponse {
  success: boolean;
  data: {
    authUrl: string;
    state: string;
    expiresAt: string;
  };
}

export interface SearchSuggestionsResponse {
  success: boolean;
  data: {
    query: string;
    suggestions: string[];
    total: number;
  };
}

export interface TrendingProductsResponse {
  success: boolean;
  data: {
    products: Product[];
    total: number;
  };
}

export interface ProductRecommendationsResponse {
  success: boolean;
  data: {
    products: Product[];
    total: number;
    studentId: string;
  };
}

export interface CategoriesResponse {
  success: boolean;
  data: {
    storeId: string;
    categories: string[];
  };
}

export interface BrandsResponse {
  success: boolean;
  data: {
    storeId: string;
    brands: string[];
  };
}

// Registry Service API Configuration
const REGISTRY_SERVICE_URL = process.env.REACT_APP_REGISTRY_SERVICE_URL || 'http://localhost:3002';

class RegistryServiceAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = REGISTRY_SERVICE_URL;
    console.log('🔗 Registry Service API initialized with URL:', this.baseUrl);
  }

  // Health Check
  async checkHealth(): Promise<{ status: string; service: string; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Registry Service health check failed:', error);
      throw new Error('Registry Service unavailable');
    }
  }

  // Product Search
  async searchProducts(request: SearchProductsRequest): Promise<SearchProductsResponse> {
    try {
      const queryParams = new URLSearchParams({
        q: request.query,
        limit: (request.limit || 20).toString(),
        offset: (request.offset || 0).toString()
      });

      if (request.storeIds && request.storeIds.length > 0) {
        request.storeIds.forEach(id => queryParams.append('storeIds', id));
      }
      if (request.category) queryParams.append('category', request.category);
      if (request.minPrice) queryParams.append('minPrice', request.minPrice.toString());
      if (request.maxPrice) queryParams.append('maxPrice', request.maxPrice.toString());
      if (request.minRating) queryParams.append('minRating', request.minRating.toString());
      if (request.inStockOnly) queryParams.append('inStockOnly', 'true');
      if (request.sortBy) queryParams.append('sortBy', request.sortBy);

      const response = await fetch(`${this.baseUrl}/api/products/search?${queryParams}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Product search failed:', error);
      throw new Error('Failed to search products');
    }
  }

  // Advanced Search
  async advancedSearch(request: AdvancedSearchRequest): Promise<SearchProductsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/products/search/advanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Advanced search failed:', error);
      throw new Error('Failed to perform advanced search');
    }
  }

  // Get Product by ID
  async getProduct(storeId: string, productId: string): Promise<Product> {
    try {
      const response = await fetch(`${this.baseUrl}/api/products/${storeId}/${productId}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Product not found');
      }
      
      return data.data;
    } catch (error) {
      console.error('Failed to get product:', error);
      throw new Error('Failed to retrieve product');
    }
  }

  // Get Trending Products
  async getTrendingProducts(limit: number = 10): Promise<TrendingProductsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/products/trending?limit=${limit}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get trending products:', error);
      throw new Error('Failed to retrieve trending products');
    }
  }

  // Get Product Recommendations
  async getProductRecommendations(studentId: string, limit: number = 10): Promise<ProductRecommendationsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/products/recommendations/${studentId}?limit=${limit}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      throw new Error('Failed to retrieve recommendations');
    }
  }

  // Get Search Suggestions
  async getSearchSuggestions(query: string, limit: number = 5): Promise<SearchSuggestionsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/products/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get search suggestions:', error);
      throw new Error('Failed to retrieve search suggestions');
    }
  }

  // Get Store Categories
  async getStoreCategories(storeId: string): Promise<CategoriesResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/products/${storeId}/categories`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get store categories:', error);
      throw new Error('Failed to retrieve store categories');
    }
  }

  // Get Store Brands
  async getStoreBrands(storeId: string): Promise<BrandsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/products/${storeId}/brands`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get store brands:', error);
      throw new Error('Failed to retrieve store brands');
    }
  }

  // Get All Stores
  async getStores(): Promise<Store[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/stores`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch stores');
      }
      
      return data.data;
    } catch (error) {
      console.error('Failed to get stores:', error);
      throw new Error('Failed to retrieve stores');
    }
  }

  // Get Store by ID
  async getStore(storeId: string): Promise<Store> {
    try {
      const response = await fetch(`${this.baseUrl}/api/stores/${storeId}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Store not found');
      }
      
      return data.data;
    } catch (error) {
      console.error('Failed to get store:', error);
      throw new Error('Failed to retrieve store');
    }
  }

  // Check Store Health
  async checkStoreHealth(storeId: string): Promise<StoreHealth> {
    try {
      const response = await fetch(`${this.baseUrl}/api/stores/${storeId}/health`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to check store health');
      }
      
      return data.data;
    } catch (error) {
      console.error('Failed to check store health:', error);
      throw new Error('Failed to check store health');
    }
  }

  // Get Store Auth URL
  async getStoreAuthUrl(storeId: string, redirectUri: string, state: string): Promise<AuthUrlResponse> {
    try {
      const queryParams = new URLSearchParams({
        redirectUri,
        state,
      });

      const response = await fetch(`${this.baseUrl}/api/stores/${storeId}/auth/url?${queryParams}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get store auth URL:', error);
      throw new Error('Failed to get store authentication URL');
    }
  }

  // Error Handler
  private handleError(error: any): never {
    console.error('Registry Service API Error:', error);
    if (error.response) {
      throw new Error(`API Error: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Network Error: No response received');
    } else {
      throw new Error(`Request Error: ${error.message}`);
    }
  }
}

// Export singleton instance
export const registryServiceAPI = new RegistryServiceAPI();