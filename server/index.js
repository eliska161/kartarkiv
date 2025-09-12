const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth-jwt'); // Use JWT auth
const mapRoutes = require('./routes/maps');
const settingsRoutes = require('./routes/settings');
const adminRoutes = require('./routes/admin');
const adminUsersRoutes = require('./routes/admin-users');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for rate limiting (needed for Railway/Vercel)
app.set('trust proxy', 1);

// Middleware
app.use(helmet());

// Rate limiting configuration
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'For mange forespørsler fra denne IP-adressen, prøv igjen senere.',
    retryAfter: '15 minutter'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    error: 'For mange forespørsler fra denne IP-adressen, prøv igjen senere.',
    retryAfter: '15 minutter'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 uploads per minute
  message: {
    error: 'For mange filopplastinger, vent litt før du prøver igjen.',
    retryAfter: '1 minutt'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/maps', strictLimiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'https://kartarkiv.netlify.app',
      'https://kartarkiv-production.up.railway.app',
      'https://kart.eddypartiet.com',
      'https://kartarkiv-dkq6bcpk5-eliska161s-projects.vercel.app',
      'https://kartarkiv-jk629p4kc-eliska161s-projects.vercel.app',
      process.env.FRONTEND_URL || 'http://localhost:3000'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log('🚫 CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Clerk-Auth-Message'],
  optionsSuccessStatus: 200
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
app.use('/api/settings', settingsRoutes);
console.log('✅ Settings routes registered at /api/settings');
app.use('/api/admin', adminRoutes);
console.log('✅ Admin routes registered at /api/admin');
app.use('/api/admin', adminUsersRoutes);
console.log('✅ Admin users routes registered at /api/admin');

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

// Global error handler for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION:', err);
  console.error('💥 Stack trace:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
  process.exit(1);
});

// Memory monitoring
setInterval(() => {
  const used = process.memoryUsage();
  const usedMB = Math.round(used.heapUsed / 1024 / 1024);
  const totalMB = Math.round(used.heapTotal / 1024 / 1024);
  
  if (usedMB > 200) { // Warn if using more than 200MB
    console.warn(`⚠️ High memory usage: ${usedMB}MB / ${totalMB}MB`);
  }
  
  // Log memory usage every 5 minutes
  if (Date.now() % 300000 < 1000) {
    console.log(`📊 Memory usage: ${usedMB}MB / ${totalMB}MB`);
  }
}, 30000); // Check every 30 seconds

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 ERROR MIDDLEWARE:', err.stack);
  
  // Don't leak sensitive information in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ 
      message: 'En intern feil oppstod. Prøv igjen senere.',
      error: 'Internal Server Error'
    });
  } else {
    res.status(500).json({ 
      message: 'En feil oppstod: ' + err.message,
      error: err.message,
      stack: err.stack
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.url);
  res.status(404).json({ message: 'Route not found' });
});

try {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Kartarkiv server running on port ${PORT}`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('🔍 DEBUG MODE ENABLED');
    console.log(`🌐 Server accessible from network at: http://[YOUR_IP]:${PORT}`);
  });
} catch (error) {
  console.error('💥 SERVER STARTUP ERROR:', error);
  console.error('💥 Stack trace:', error.stack);
  process.exit(1);
}
