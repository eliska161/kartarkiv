const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth-jwt'); // Use JWT auth
const mapRoutes = require('./routes/maps');
const userRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://kartarkiv.netlify.app',
    'https://kartarkiv-production.up.railway.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Debug middleware
app.use((req, res, next) => {
  console.log('🔍 REQUEST DEBUG:', req.method, req.url);
  console.log('🌐 Origin:', req.headers.origin);
  console.log('📝 Request body:', req.body);
  next();
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
console.log('🔧 Registering routes...');
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes registered at /api/auth');
app.use('/api/maps', mapRoutes);
console.log('✅ Maps routes registered at /api/maps');
app.use('/api/users', userRoutes);
console.log('✅ Users routes registered at /api/users');
app.use('/api/settings', settingsRoutes);
console.log('✅ Settings routes registered at /api/settings');
app.use('/api/admin', adminRoutes);
console.log('✅ Admin routes registered at /api/admin');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Kartarkiv server is running' });
});

// Debug: List all available routes
app.get('/api/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      routes.push({
        method: Object.keys(middleware.route.methods)[0].toUpperCase(),
        path: middleware.route.path
      });
    } else if (middleware.name === 'router') {
      const basePath = middleware.regexp.source
        .replace(/\\|\^|\$|\?/g, '')
        .replace('(?:', '')
        .replace(')', '')
        .replace('\\', '');
      
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          routes.push({
            method: Object.keys(handler.route.methods)[0].toUpperCase(),
            path: basePath + handler.route.path
          });
        }
      });
    }
  });
  res.json({ routes });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 ERROR MIDDLEWARE:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.url);
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Kartarkiv server running on port ${PORT}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('🔍 DEBUG MODE ENABLED');
  console.log(`🌐 Server accessible from network at: http://[YOUR_IP]:${PORT}`);
});
