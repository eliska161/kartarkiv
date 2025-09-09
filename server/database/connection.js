const { Pool } = require('pg');
require('dotenv').config();

// Use Supabase DATABASE_URL if available, otherwise fall back to individual variables
const connectionConfig = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10, // Reduce connection pool size for Supabase
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 15000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
} : {
  connectionString: `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'kartarkiv'}`,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
};

const pool = new Pool(connectionConfig);

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
    console.error('❌ DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.error('❌ Connection config:', connectionConfig);
  });

module.exports = pool;
