# 📊 Performance Monitoring Guide

## 🎯 Overview

The GradVillage application includes comprehensive performance monitoring that tracks:
- **Request response times** and throughput
- **Memory usage** (RSS, Heap, External)
- **CPU usage** patterns
- **Error rates** and slow queries
- **System alerts** for performance issues

## 🔍 Available Endpoints

### 1. Performance Dashboard
```
GET /api/performance/dashboard
```
**Full performance overview including:**
- System metrics (memory, CPU, uptime)
- Request statistics (last hour)
- Performance alerts
- Top slow endpoints
- Recent errors
- Memory and CPU trends

### 2. Real-time Metrics
```
GET /api/performance/metrics
```
**Current system state:**
- Live memory usage
- Active connections
- Recent error count
- Current uptime

## 📈 Understanding the Metrics

### Memory Usage
- **RSS (Resident Set Size)**: Total memory allocated to the process
- **Heap Total**: Total heap memory allocated
- **Heap Used**: Currently used heap memory
- **External**: Memory used by C++ objects bound to JavaScript

### Performance Alerts
- **High Memory Usage**: > 500MB heap used
- **High CPU Usage**: > 80% CPU utilization
- **High Error Rate**: > 5% error rate
- **Slow Response Time**: > 1000ms average

### Request Statistics
- **Total Requests**: Number of requests in the last hour
- **Average Response Time**: Mean response time in milliseconds
- **Slow Requests**: Requests taking > 1000ms
- **Error Rate**: Percentage of requests resulting in errors
- **Requests Per Minute**: Current request rate

## 🛠️ How to Monitor Performance

### 1. Command Line Monitoring

```bash
# Get full performance dashboard
curl -s http://localhost:3001/api/performance/dashboard | jq '.'

# Get real-time metrics
curl -s http://localhost:3001/api/performance/metrics | jq '.'

# Monitor specific metrics
curl -s http://localhost:3001/api/performance/dashboard | jq '.data.requests'
curl -s http://localhost:3001/api/performance/dashboard | jq '.data.system.memory'
curl -s http://localhost:3001/api/performance/dashboard | jq '.data.alerts'
```

### 2. Continuous Monitoring

```bash
# Monitor every 30 seconds
watch -n 30 'curl -s http://localhost:3001/api/performance/metrics | jq ".data.memory.heapUsed"'

# Monitor alerts
watch -n 30 'curl -s http://localhost:3001/api/performance/dashboard | jq ".data.alerts"'
```

### 3. Performance Testing

```bash
# Generate test traffic
for i in {1..10}; do
  curl -s http://localhost:3001/health > /dev/null
  echo "Request $i completed"
done

# Test specific endpoints
curl -s http://localhost:3001/api/donors/students?page=1&limit=5
curl -s http://localhost:3001/api/students/profile
```

## 🚨 Performance Alerts

### Memory Alerts
- **Warning**: Heap usage > 400MB
- **Critical**: Heap usage > 500MB
- **Action**: Monitor for memory leaks, consider restarting

### CPU Alerts
- **Warning**: CPU usage > 60%
- **Critical**: CPU usage > 80%
- **Action**: Check for expensive operations, optimize queries

### Response Time Alerts
- **Warning**: Average response time > 500ms
- **Critical**: Average response time > 1000ms
- **Action**: Optimize database queries, add caching

### Error Rate Alerts
- **Warning**: Error rate > 2%
- **Critical**: Error rate > 5%
- **Action**: Check logs, fix bugs, monitor database

## 📊 Log Analysis

### Performance Logs
The application logs performance data with these prefixes:
- `📊 PERFORMANCE`: General performance metrics
- `🐌 Slow request`: Requests taking > 1000ms
- `⚠️ High memory usage`: Memory usage alerts
- `❌ Error`: Request errors

### Example Log Output
```
2025-07-20 17:32:36:3236 info: PERFORMANCE
2025-07-20 17:32:36:3236 http: GET /students?page=1&limit=10 304
192.168.0.16 - - [20/Jul/2025:21:32:36 +0000] "GET /api/donors/students?page=1&limit=10 HTTP/1.1" 304
2025-07-20 17:32:50:3250 info: CPU Usage
```

## 🔧 Performance Optimization

### Database Optimization
- Monitor slow queries in the dashboard
- Add database indexes for frequently queried fields
- Use connection pooling
- Implement query caching

### Memory Optimization
- Monitor memory trends for leaks
- Implement garbage collection monitoring
- Use streaming for large file uploads
- Optimize image processing

### Response Time Optimization
- Implement caching strategies
- Use pagination for large datasets
- Optimize database queries
- Add CDN for static assets

## 📱 Production Monitoring

### Environment Variables
```bash
# Enable detailed performance logging
NODE_ENV=production
LOG_LEVEL=info
PERFORMANCE_MONITORING=true
```

### Monitoring Tools Integration
- **Prometheus**: Export metrics for time-series monitoring
- **Grafana**: Create dashboards for visualization
- **New Relic**: APM monitoring
- **DataDog**: Infrastructure monitoring

### Health Checks
```bash
# Application health
curl http://localhost:3001/health

# Performance health
curl http://localhost:3001/api/performance/metrics
```

## 🎯 Best Practices

1. **Monitor Regularly**: Check performance metrics every 15-30 minutes
2. **Set Up Alerts**: Configure notifications for critical alerts
3. **Track Trends**: Monitor performance over time, not just current state
4. **Optimize Proactively**: Don't wait for alerts to optimize
5. **Document Issues**: Keep track of performance problems and solutions

## 🚀 Quick Start Commands

```bash
# Start monitoring
npm run dev

# Check performance
curl -s http://localhost:3001/api/performance/dashboard | jq '.'

# Monitor memory
watch -n 30 'curl -s http://localhost:3001/api/performance/metrics | jq ".data.memory.heapUsed"'

# Test performance
for i in {1..20}; do curl -s http://localhost:3001/health > /dev/null; done
```

## 📞 Troubleshooting

### High Memory Usage
1. Check for memory leaks in the logs
2. Restart the application
3. Increase server memory
4. Optimize database queries

### Slow Response Times
1. Check database performance
2. Review slow endpoint logs
3. Implement caching
4. Optimize queries

### High Error Rates
1. Check application logs
2. Verify database connectivity
3. Check external service status
4. Review recent code changes

---

**📊 Performance monitoring is now active and collecting data!** 
Monitor your application's health and performance in real-time using the provided endpoints and tools. 