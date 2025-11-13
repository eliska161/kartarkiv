const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const pool = require('./database/connection');

const authRoutes = require('./routes/auth-jwt'); // Use JWT auth
const mapRoutes = require('./routes/maps');
const adminRoutes = require('./routes/admin');
const adminUsersRoutes = require('./routes/admin-users');
const announcementRoutes = require('./routes/announcements');
const restartRoutes = require('./routes/restart');
const healthRoutes = require('./routes/health');
const paymentRoutes = require('./routes/payments');
const storageRoutes = require('./routes/storage');
const { requestLogger, getLogs, clearLogs } = require('./middleware/requestLogger');
const monitoringRoutes = require('./routes/monitoring');
const { startInvoiceReminderWorker } = require('./jobs/invoiceReminders');

const app = express();
const PORT = process.env.PORT || 5001;
// Cron-based reconciliation removed; manual payment flow only

// Trust proxy for rate limiting (needed for Railway/Vercel)
app.set('trust proxy', 1);

// Middleware
app.use(helmet());

// Request logging middleware
app.use(requestLogger);


// OpenAPI JSON (for Theneo)
app.get('/docs-json', (req, res) => res.json(swaggerSpec));

// Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Lightweight HTML API documentation generated from the Swagger spec
const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

app.get('/api-doc', (req, res) => {
  const { info = {}, tags = [], paths = {} } = swaggerSpec;

  const renderedTags = tags
    .map(tag => `
        <li><strong>${escapeHtml(tag.name)}</strong><br /><small>${escapeHtml(tag.description || '')}</small></li>
      `)
    .join('');

  const renderedPaths = Object.entries(paths)
    .flatMap(([pathKey, methods]) =>
      Object.entries(methods).map(([method, details]) => ({
        method: method.toUpperCase(),
        path: pathKey,
        summary: details.summary || details.description || 'No description available',
        tag: Array.isArray(details.tags) && details.tags.length > 0 ? details.tags[0] : 'General'
      }))
    )
    .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))
    .map(
      entry => `
        <tr>
          <td class="method method-${entry.method.toLowerCase()}">${escapeHtml(entry.method)}</td>
          <td class="path">${escapeHtml(entry.path)}</td>
          <td>${escapeHtml(entry.summary)}</td>
          <td>${escapeHtml(entry.tag)}</td>
        </tr>
      `
    )
    .join('');

  const html = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(info.title || 'Kartarkiv API Documentation')}</title>
        <style>
          :root {
            color-scheme: light dark;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0d1117;
            color: #e6edf3;
          }
          body {
            margin: 0 auto;
            padding: 32px 24px 48px;
            max-width: 960px;
            line-height: 1.6;
          }
          a {
            color: #2f81f7;
          }
          header {
            margin-bottom: 32px;
          }
          header h1 {
            margin-bottom: 8px;
          }
          .meta {
            color: #8b949e;
          }
          section {
            margin-bottom: 40px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background: rgba(13, 17, 23, 0.6);
            border: 1px solid rgba(240, 246, 252, 0.1);
            border-radius: 12px;
            overflow: hidden;
          }
          th, td {
            padding: 12px 16px;
            border-bottom: 1px solid rgba(240, 246, 252, 0.08);
            vertical-align: top;
          }
          th {
            background: rgba(36, 41, 47, 0.9);
            text-align: left;
            font-weight: 600;
          }
          tr:last-child td {
            border-bottom: none;
          }
          .method {
            font-weight: 700;
            text-transform: uppercase;
            font-size: 0.85rem;
            white-space: nowrap;
          }
          .method-get { color: #2ea043; }
          .method-post { color: #2f81f7; }
          .method-put { color: #d29922; }
          .method-delete { color: #f85149; }
          .method-patch { color: #8a2be2; }
          .method-head { color: #a371f7; }
          .method-options { color: #fb8c00; }
          .path {
            font-family: 'Fira Code', 'Source Code Pro', monospace;
            font-size: 0.95rem;
            color: #e6edf3;
          }
          ul {
            list-style: disc;
            padding-left: 24px;
          }
          .tag-list li {
            margin-bottom: 8px;
          }
          .empty {
            color: #8b949e;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <header>
          <h1>${escapeHtml(info.title || 'Kartarkiv API')}</h1>
          <p class="meta">
            Version ${escapeHtml(info.version || '1.0.0')} · ${escapeHtml(info.description || 'API documentation overview')}<br />
            Generated ${escapeHtml(new Date().toISOString())}
          </p>
          <p>
            Denne oversikten henter endepunktene direkte fra Swagger-spesifikasjonen og gir en
            rask referanse for tilgjengelige ruter. For interaktiv prøving, besøk
            <a href="/docs">/docs</a> eller hent JSON-spesifikasjonen via <a href="/docs-json">/docs-json</a>.
          </p>
        </header>
        <section>
          <h2>Tagger</h2>
          ${renderedTags ? `<ul class="tag-list">${renderedTags}</ul>` : '<p class="empty">Ingen tagger definert.</p>'}
        </section>
        <section>
          <h2>Endepunkter</h2>
          ${renderedPaths ? `<table>
            <thead>
              <tr>
                <th>Metode</th>
                <th>Rute</th>
                <th>Beskrivelse</th>
                <th>Tagg</th>
              </tr>
            </thead>
            <tbody>
              ${renderedPaths}
            </tbody>
          </table>` : '<p class="empty">Ingen endepunkter funnet i Swagger-spesifikasjonen.</p>'}
        </section>
      </body>
    </html>`;

  res.type('html').send(html);
});

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
app.use('/api/announcements', announcementRoutes);
console.log('✅ Announcements routes registered at /api/announcements');
app.use('/api/restart', restartRoutes);
console.log('✅ Restart routes registered at /api/restart');
app.use('/api/health', healthRoutes);
console.log('✅ Health check routes registered at /api/health');
app.use('/api/payments', paymentRoutes);
app.use('/api/storage', storageRoutes);
console.log('✅ Payments routes registered at /api/payments');
app.use('/api/monitoring', monitoringRoutes);
console.log('✅ Monitoring routes registered at /api/monitoring');

// Test route to verify announcements are working
app.get('/api/announcements/test', (req, res) => {
  console.log('🔍 TEST: Announcements test route called');
  res.json({ message: 'Announcements routes are working!' });
});
app.use('/api/admin', adminUsersRoutes);
console.log('✅ Admin users routes registered at /api/admin');
app.use('/api/admin', adminRoutes);
console.log('✅ Admin routes registered at /api/admin');

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

// Simple health check endpoint (for Better Stack)
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
  startInvoiceReminderWorker();
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
