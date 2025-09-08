const { Pool } = require('pg');
require('dotenv').config();

// Use Supabase DATABASE_URL if available, otherwise fall back to individual variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'kartarkiv'}`,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Force IPv4 connection to avoid IPv6 issues
  host: process.env.DATABASE_URL ? undefined : (process.env.DB_HOST || 'localhost'),
  port: process.env.DATABASE_URL ? undefined : (process.env.DB_PORT || 5432),
  // Additional connection options for Railway
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
});

// Test database connection
pool.on('connect', (client) => {
  console.log('📊 Connected to PostgreSQL database');
  console.log('🔗 Connection details:', {
    host: client.host,
    port: client.port,
    database: client.database,
    user: client.user
  });
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
  console.error('❌ Error details:', {
    code: err.code,
    message: err.message,
    address: err.address,
    port: err.port
  });
});

// Test connection on startup
pool.connect()
  .then(client => {
    console.log('✅ Database connection test successful');
    client.release();
  })
  .catch(err => {
    console.error('❌ Database connection test failed:', err);
  });

module.exports = pool;
