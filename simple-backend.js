const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Simple backend is running' });
});

// Student registration endpoint
app.post('/api/auth/register/student', (req, res) => {
  console.log('Student registration request:', req.body);
  res.json({ 
    success: true, 
    message: 'Student registered successfully',
    user: {
      id: 'temp-student-123',
      email: req.body.email,
      name: req.body.name,
      role: 'student'
    }
  });
});

// Student login endpoint
app.post('/api/auth/login/student', (req, res) => {
  console.log('Student login request:', req.body);
  res.json({ 
    success: true, 
    message: 'Student logged in successfully',
    token: 'temp-jwt-token-123',
    user: {
      id: 'temp-student-123',
      email: req.body.email,
      name: 'Test Student',
      role: 'student'
    }
  });
});

// Admin registration endpoint
app.post('/api/auth/register/admin', (req, res) => {
  console.log('Admin registration request:', req.body);
  res.json({ 
    success: true, 
    message: 'Admin registered successfully',
    user: {
      id: 'temp-admin-123',
      email: req.body.email,
      name: req.body.name,
      role: 'admin'
    }
  });
});

// Admin login endpoint
app.post('/api/auth/login/admin', (req, res) => {
  console.log('Admin login request:', req.body);
  res.json({ 
    success: true, 
    message: 'Admin logged in successfully',
    token: 'temp-jwt-token-admin-123',
    user: {
      id: 'temp-admin-123',
      email: req.body.email,
      name: 'Test Admin',
      role: 'admin'
    }
  });
});

// Donor registration endpoint
app.post('/api/auth/register/donor', (req, res) => {
  console.log('Donor registration request:', req.body);
  res.json({ 
    success: true, 
    message: 'Donor registered successfully',
    user: {
      id: 'temp-donor-123',
      email: req.body.email,
      name: req.body.name,
      role: 'donor'
    }
  });
});

// Donor login endpoint
app.post('/api/auth/login/donor', (req, res) => {
  console.log('Donor login request:', req.body);
  res.json({ 
    success: true, 
    message: 'Donor logged in successfully',
    token: 'temp-jwt-token-donor-123',
    user: {
      id: 'temp-donor-123',
      email: req.body.email,
      name: 'Test Donor',
      role: 'donor'
    }
  });
});

// Catch-all for other API routes
app.get('/api/*', (req, res) => {
  res.json({ message: 'API endpoint not implemented yet', path: req.path });
});

app.post('/api/*', (req, res) => {
  res.json({ message: 'API endpoint not implemented yet', path: req.path });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'GV Playground Simple Backend',
    status: 'running',
    endpoints: [
      'GET /api/health',
      'POST /api/auth/register/student',
      'POST /api/auth/login/student',
      'POST /api/auth/register/admin',
      'POST /api/auth/login/admin',
      'POST /api/auth/register/donor',
      'POST /api/auth/login/donor'
    ]
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simple backend server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});