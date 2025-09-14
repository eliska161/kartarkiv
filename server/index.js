const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth-jwt'); // Use JWT auth
const mapRoutes = require('./routes/maps');
const adminRoutes = require('./routes/admin');
const adminUsersRoutes = require('./routes/admin-users');
const announcementRoutes = require('./routes/announcements');
const { requestLogger, getLogs, clearLogs } = require('./middleware/requestLogger');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for rate limiting (needed for Railway/Vercel)
app.set('trust proxy', 1);

// Middleware
app.use(helmet());

// Request logging middleware
app.use(requestLogger);

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
  windowMs: 1 * 60 * 1000, // 1 minute (reduced from 15 minutes)
  max: 30, // limit each IP to 30 requests per minute (increased from 20)
  message: {
    error: 'API er midlertidig utilgjengelig. Vennligst vent et minutt og prøv igjen.',
    retryAfter: '1 minutt',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  }
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
    if (!origin) {
      console.log('🌐 CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    const allowedOrigins = [
      'http://localhost:3000',
      'https://kartarkiv.netlify.app',
      'https://kartarkiv-production.up.railway.app',
      'https://kart.eddypartiet.com',
      'https://kartarkiv.co',
      'https://www.kartarkiv.co',
      'https://kartarkiv-dkq6bcpk5-eliska161s-projects.vercel.app',
      'https://kartarkiv-jk629p4kc-eliska161s-projects.vercel.app',
      process.env.FRONTEND_URL || 'http://localhost:3000'
    ];
    
    // Check for Vercel preview URLs (dynamic)
    if (origin && origin.includes('vercel.app')) {
      console.log('🌐 CORS: Allowing Vercel preview URL:', origin);
      return callback(null, true);
    }
    
    // Check for Railway preview URLs
    if (origin && origin.includes('railway.app')) {
      console.log('🌐 CORS: Allowing Railway preview URL:', origin);
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log('🌐 CORS: Allowing origin:', origin);
      return callback(null, true);
    }
    
    console.log('🚫 CORS blocked origin:', origin);
    console.log('🌐 CORS allowed origins:', allowedOrigins);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'X-Clerk-Auth-Message',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Additional CORS fallback for problematic requests
app.use((req, res, next) => {
  // Set CORS headers manually as fallback
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Clerk-Auth-Message, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🌐 CORS: Handling preflight request for:', req.url);
    res.status(200).end();
    return;
  }
  
  next();
});

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
app.use('/api/admin', adminUsersRoutes);
console.log('✅ Admin users routes registered at /api/admin');
app.use('/api/admin', adminRoutes);
console.log('✅ Admin routes registered at /api/admin');
app.use('/api/announcements', announcementRoutes);
console.log('✅ Announcements routes registered at /api/announcements');

// API Logs endpoints
app.get('/api/logs', getLogs);
app.delete('/api/logs', clearLogs);
console.log('✅ API Logs routes registered at /api/logs');

// Health check endpoint for uptime monitoring
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const result = await pool.query('SELECT 1 as test');
    
    res.json({
      status: 'OK',
      database: 'Connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'Kartarkiv API',
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      database: 'Disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Simple health check endpoint (for UptimeRobot)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'Kartarkiv API'
  });
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
