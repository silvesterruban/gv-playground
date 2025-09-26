# 📚 GV Playground API Documentation

This document provides comprehensive documentation for the GV Playground Backend API.

## 🔗 Base URL

- **Development**: `http://localhost:3001/api`
- **Staging**: `https://staging.gvplayground.com/api`
- **Production**: `https://api.gvplayground.com/api`

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 📊 Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "message": "Operation successful",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🏥 Health Endpoints

### GET /health
Basic health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "version": "1.0.0",
  "memory": {
    "used": 45,
    "total": 128
  }
}
```

### GET /health/detailed
Detailed health check with system information.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "version": "1.0.0",
  "services": {
    "database": "healthy"
  },
  "memory": {
    "used": 45,
    "total": 128,
    "external": 12
  },
  "system": {
    "platform": "linux",
    "arch": "x64",
    "nodeVersion": "v18.17.0",
    "cpuCount": 4,
    "loadAverage": [0.5, 0.3, 0.2],
    "freeMemory": 2048,
    "totalMemory": 4096
  }
}
```

### GET /health/ready
Readiness probe for Kubernetes.

**Response:**
```json
{
  "status": "ready",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET /health/live
Liveness probe for Kubernetes.

**Response:**
```json
{
  "status": "alive",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

## 🔐 Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Validation Rules:**
- `name`: 2-100 characters, required
- `email`: Valid email format, required
- `password`: Minimum 6 characters, must contain uppercase, lowercase, and number

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt-token"
}
```

**Error Responses:**
- `400`: Validation failed
- `409`: User already exists

### POST /auth/login
Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt-token"
}
```

**Error Responses:**
- `400`: Validation failed
- `401`: Invalid credentials

### GET /auth/verify
Verify JWT token and get user information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

**Error Responses:**
- `401`: Invalid or expired token

### POST /auth/refresh
Refresh JWT token.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "message": "Token refreshed successfully",
  "token": "new-jwt-token",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

## 👤 User Endpoints

### GET /users/profile
Get current user's profile information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "message": "Profile retrieved successfully",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### PUT /users/profile
Update current user's profile.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "name": "John Smith"
}
```

**Validation Rules:**
- `name`: 2-100 characters, optional

**Response:**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Smith",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### DELETE /users/profile
Delete current user's account.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "message": "Account deleted successfully"
}
```

### GET /users
Get all users (paginated).

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

**Example:**
```
GET /users?page=1&limit=10
```

**Response:**
```json
{
  "message": "Users retrieved successfully",
  "users": [
    {
      "id": "uuid",
      "email": "john@example.com",
      "name": "John Doe",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### GET /users/:id
Get user by ID.

**Response:**
```json
{
  "message": "User retrieved successfully",
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `404`: User not found

## 📊 Metrics Endpoint

### GET /metrics
Prometheus metrics endpoint.

**Response:**
```
# HELP http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/health",status_code="200",le="0.1"} 10
http_request_duration_seconds_bucket{method="GET",route="/health",status_code="200",le="0.3"} 15
...

# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/health",status_code="200"} 25
...
```

## 🚨 Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Validation failed |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

## 🔒 Rate Limiting

The API implements rate limiting to prevent abuse:

- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 requests per 15 minutes per IP
- **Registration**: 3 requests per hour per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 📝 Request/Response Examples

### cURL Examples

**Register User:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePassword123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123"
  }'
```

**Get Profile:**
```bash
curl -X GET http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer <jwt-token>"
```

**Update Profile:**
```bash
curl -X PUT http://localhost:3001/api/users/profile \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith"
  }'
```

### JavaScript Examples

**Using Fetch API:**
```javascript
// Register user
const registerUser = async (userData) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  
  return response.json();
};

// Get profile with authentication
const getProfile = async (token) => {
  const response = await fetch('/api/users/profile', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return response.json();
};
```

**Using Axios:**
```javascript
import axios from 'axios';

// Set default base URL
axios.defaults.baseURL = 'http://localhost:3001/api';

// Set auth token
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

// Register user
const registerUser = async (userData) => {
  const response = await axios.post('/auth/register', userData);
  return response.data;
};

// Get profile
const getProfile = async () => {
  const response = await axios.get('/users/profile');
  return response.data;
};
```

## 🔧 Development

### Local Development
```bash
# Start development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format
```

### Environment Variables
```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/gvplayground
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
```

## 📚 Additional Resources

- [Setup Guide](SETUP_GUIDE.md)
- [Architecture Documentation](ARCHITECTURE.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [GitHub Repository](https://github.com/yourusername/gv-playground)

---

**Happy Coding! 🚀**