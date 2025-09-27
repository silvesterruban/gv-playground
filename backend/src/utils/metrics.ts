import { register, Counter, Histogram, Gauge } from 'prom-client';

// Create custom metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

export const databaseConnections = new Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections'
});

export const userRegistrations = new Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations'
});

export const userLogins = new Counter({
  name: 'user_logins_total',
  help: 'Total number of user logins'
});

export const errorsTotal = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'endpoint']
});

// Memory usage metrics
export const memoryUsage = new Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
  labelNames: ['type']
});

// CPU usage metrics
export const cpuUsage = new Gauge({
  name: 'cpu_usage_percent',
  help: 'CPU usage percentage'
});

// Function to update memory metrics
export const updateMemoryMetrics = () => {
  const memUsage = process.memoryUsage();
  memoryUsage.set({ type: 'rss' }, memUsage.rss);
  memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
  memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
  memoryUsage.set({ type: 'external' }, memUsage.external);
};

// Function to update CPU metrics
export const updateCpuMetrics = () => {
  const cpuUsage = process.cpuUsage();
  const totalUsage = cpuUsage.user + cpuUsage.system;
  const usagePercent = (totalUsage / 1000000) * 100; // Convert to percentage
  
  // Update the CPU usage gauge
  cpuUsageGauge.set(usagePercent);
};

// Metrics endpoint
export const getMetrics = async (): Promise<string> => {
  updateMemoryMetrics();
  updateCpuMetrics();
  return register.metrics();
};

// Default metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeConnections);
register.registerMetric(databaseConnections);
register.registerMetric(userRegistrations);
register.registerMetric(userLogins);
register.registerMetric(errorsTotal);
register.registerMetric(memoryUsage);
register.registerMetric(cpuUsage);