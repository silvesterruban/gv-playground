import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';
import { storePerformanceData } from '../routes/performance';

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  // Store request start data
  const requestData = {
    type: 'request',
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  };

  // Override res.end to capture response data
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): Response {
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const responseTime = endTime - startTime;
    const memoryDelta = {
      rss: endMemory.rss - startMemory.rss,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      external: endMemory.external - startMemory.external
    };

    // Store performance data
    storePerformanceData({
      ...requestData,
      responseTime,
      statusCode: res.statusCode,
      contentLength: res.get('Content-Length'),
      memoryDelta
    });

    // Log slow requests
    if (responseTime > 1000) {
      Logger.warn(`🐌 Slow request: ${req.method} ${req.path} took ${responseTime}ms`);
    }

    // Log errors
    if (res.statusCode >= 400) {
      storePerformanceData({
        type: 'error',
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime,
        error: `HTTP ${res.statusCode}`,
        timestamp: new Date().toISOString()
      });
    }

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Memory usage monitoring
export const memoryMonitor = () => {
  const memUsage = process.memoryUsage();
  
  storePerformanceData({
    type: 'memory',
    rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
    external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100,
    timestamp: new Date().toISOString()
  });

  // Log high memory usage
  if (memUsage.heapUsed / 1024 / 1024 > 500) {
    Logger.warn(`⚠️ High memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
  }
};

// CPU usage monitoring (simplified - in production use os.cpus())
export const cpuMonitor = () => {
  const startUsage = process.cpuUsage();
  
  // Simple CPU monitoring (in production, use proper CPU monitoring)
  const cpuData = {
    type: 'cpu',
    user: startUsage.user,
    system: startUsage.system,
    timestamp: new Date().toISOString()
  };

  storePerformanceData(cpuData);
};

// Start monitoring intervals
export const startPerformanceMonitoring = () => {
  // Monitor memory every 30 seconds
  setInterval(memoryMonitor, 30000);
  
  // Monitor CPU every 30 seconds
  setInterval(cpuMonitor, 30000);
  
  Logger.info('📊 Performance monitoring started');
}; 