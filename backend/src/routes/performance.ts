import { Request, Response, Router } from 'express';
import { Logger } from '../utils/logger';

// In-memory storage for performance metrics (in production, use Redis or database)
let performanceMetrics = {
  requests: [] as any[],
  slowQueries: [] as any[],
  errors: [] as any[],
  memoryUsage: [] as any[],
  cpuUsage: [] as any[]
};

// Store performance data
export const storePerformanceData = (data: any) => {
  const timestamp = new Date().toISOString();
  
  // Store request metrics
  if (data.type === 'request') {
    performanceMetrics.requests.push({
      ...data,
      timestamp
    });
    
    // Keep only last 1000 requests
    if (performanceMetrics.requests.length > 1000) {
      performanceMetrics.requests = performanceMetrics.requests.slice(-1000);
    }
  }
  
  // Store slow queries
  if (data.type === 'slow_query' && data.responseTime > 1000) {
    performanceMetrics.slowQueries.push({
      ...data,
      timestamp
    });
    
    // Keep only last 100 slow queries
    if (performanceMetrics.slowQueries.length > 100) {
      performanceMetrics.slowQueries = performanceMetrics.slowQueries.slice(-100);
    }
  }
  
  // Store errors
  if (data.type === 'error') {
    performanceMetrics.errors.push({
      ...data,
      timestamp
    });
    
    // Keep only last 100 errors
    if (performanceMetrics.errors.length > 100) {
      performanceMetrics.errors = performanceMetrics.errors.slice(-100);
    }
  }
  
  // Store memory usage
  if (data.type === 'memory') {
    performanceMetrics.memoryUsage.push({
      ...data,
      timestamp
    });
    
    // Keep only last 100 memory readings
    if (performanceMetrics.memoryUsage.length > 100) {
      performanceMetrics.memoryUsage = performanceMetrics.memoryUsage.slice(-100);
    }
  }
  
  // Store CPU usage
  if (data.type === 'cpu') {
    performanceMetrics.cpuUsage.push({
      ...data,
      timestamp
    });
    
    // Keep only last 100 CPU readings
    if (performanceMetrics.cpuUsage.length > 100) {
      performanceMetrics.cpuUsage = performanceMetrics.cpuUsage.slice(-100);
    }
  }
};

// Performance dashboard endpoint
export const getPerformanceDashboard = async (req: Request, res: Response) => {
  try {
    const currentTime = new Date();
    const oneHourAgo = new Date(currentTime.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);

    // Filter recent data
    const recentRequests = performanceMetrics.requests.filter(
      req => new Date(req.timestamp) > oneHourAgo
    );
    
    const recentSlowQueries = performanceMetrics.slowQueries.filter(
      query => new Date(query.timestamp) > oneHourAgo
    );
    
    const recentErrors = performanceMetrics.errors.filter(
      error => new Date(error.timestamp) > oneHourAgo
    );

    // Calculate statistics
    const requestStats = {
      total: recentRequests.length,
      averageResponseTime: recentRequests.length > 0 
        ? recentRequests.reduce((sum, req) => sum + req.responseTime, 0) / recentRequests.length 
        : 0,
      slowRequests: recentRequests.filter(req => req.responseTime > 1000).length,
      errorRate: recentRequests.length > 0 
        ? (recentErrors.length / recentRequests.length) * 100 
        : 0
    };

    // Get current system metrics
    const memUsage = process.memoryUsage();
    const currentMemory = {
      rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
      external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100
    };

    // Get latest CPU usage
    const latestCpu = performanceMetrics.cpuUsage.length > 0 
      ? performanceMetrics.cpuUsage[performanceMetrics.cpuUsage.length - 1]
      : null;

    // Top slow endpoints
    const endpointStats = recentRequests.reduce((acc: any, req) => {
      const key = `${req.method} ${req.path}`;
      if (!acc[key]) {
        acc[key] = { count: 0, totalTime: 0, avgTime: 0 };
      }
      acc[key].count++;
      acc[key].totalTime += req.responseTime;
      acc[key].avgTime = acc[key].totalTime / acc[key].count;
      return acc;
    }, {});

    const topSlowEndpoints = Object.entries(endpointStats)
      .map(([endpoint, stats]: [string, any]) => ({
        endpoint,
        count: stats.count,
        avgTime: Math.round(stats.avgTime),
        totalTime: Math.round(stats.totalTime)
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    // Recent errors
    const recentErrorDetails = recentErrors.map(error => ({
      timestamp: error.timestamp,
      method: error.method,
      path: error.path,
      statusCode: error.statusCode,
      responseTime: error.responseTime,
      error: error.error
    }));

    const dashboard = {
      timestamp: currentTime.toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      
      // Current system metrics
      system: {
        memory: currentMemory,
        cpu: latestCpu,
        nodeVersion: process.version,
        platform: process.platform
      },
      
      // Request statistics (last hour)
      requests: {
        total: requestStats.total,
        averageResponseTime: Math.round(requestStats.averageResponseTime),
        slowRequests: requestStats.slowRequests,
        errorRate: Math.round(requestStats.errorRate * 100) / 100,
        requestsPerMinute: Math.round(requestStats.total / 60)
      },
      
      // Performance alerts
      alerts: {
        highMemoryUsage: currentMemory.heapUsed > 500,
        highCpuUsage: latestCpu && latestCpu.user > 80,
        highErrorRate: requestStats.errorRate > 5,
        slowResponseTime: requestStats.averageResponseTime > 1000
      },
      
      // Top slow endpoints
      slowEndpoints: topSlowEndpoints,
      
      // Recent errors
      recentErrors: recentErrorDetails.slice(0, 10),
      
      // Slow queries
      slowQueries: recentSlowQueries.slice(0, 10),
      
      // Memory usage trend (last 10 readings)
      memoryTrend: performanceMetrics.memoryUsage.slice(-10),
      
      // CPU usage trend (last 10 readings)
      cpuTrend: performanceMetrics.cpuUsage.slice(-10)
    };

    res.json({
      success: true,
      data: dashboard
    });

  } catch (error) {
    Logger.error('Error generating performance dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate performance dashboard'
    });
  }
};

// Real-time performance metrics endpoint
export const getRealTimeMetrics = async (req: Request, res: Response) => {
  try {
    const memUsage = process.memoryUsage();
    const currentMemory = {
      rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
      external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100
    };

    const metrics = {
      timestamp: new Date().toISOString(),
      memory: currentMemory,
      uptime: process.uptime(),
      activeConnections: performanceMetrics.requests.length,
      recentErrors: performanceMetrics.errors.slice(-5).length
    };

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    Logger.error('Error getting real-time metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get real-time metrics'
    });
  }
};

// Client-friendly metrics endpoint
export const getClientMetrics = async (req: Request, res: Response) => {
  try {
    const memUsage = process.memoryUsage();
    const currentTime = new Date();
    const oneHourAgo = new Date(currentTime.getTime() - 60 * 60 * 1000);

    // Filter recent data
    const recentRequests = performanceMetrics.requests.filter(
      req => new Date(req.timestamp) > oneHourAgo
    );
    
    const recentErrors = performanceMetrics.errors.filter(
      error => new Date(error.timestamp) > oneHourAgo
    );

    // Calculate key metrics
    const totalRequests = recentRequests.length;
    const errorCount = recentErrors.length;
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;
    const avgResponseTime = totalRequests > 0 
      ? recentRequests.reduce((sum, req) => sum + req.responseTime, 0) / totalRequests 
      : 0;

    const clientMetrics = {
      timestamp: currentTime.toISOString(),
      service: "Backend Service",
      uptime: Math.round(process.uptime()),
      status: "healthy",
      
      // Key performance metrics
      performance: {
        totalRequests: totalRequests,
        requestsPerMinute: Math.round(totalRequests / 60),
        averageResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        activeConnections: recentRequests.length
      },
      
      // System resources
      system: {
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
        },
        nodeVersion: process.version,
        platform: process.platform
      },
      
      // Health indicators
      health: {
        status: errorRate < 5 ? "good" : "warning",
        issues: errorRate >= 5 ? ["High error rate"] : [],
        lastError: recentErrors.length > 0 ? recentErrors[recentErrors.length - 1].timestamp : null
      }
    };

    res.json(clientMetrics);

  } catch (error) {
    Logger.error('Error getting client metrics:', error);
    res.status(500).json({
      timestamp: new Date().toISOString(),
      service: "Backend Service",
      status: "error",
      error: "Failed to retrieve metrics"
    });
  }
};

// Create router
const router = Router();

// Performance monitoring routes
router.get('/dashboard', getPerformanceDashboard);
router.get('/metrics', getRealTimeMetrics);
router.get('/client-metrics', getClientMetrics);

export default router; 