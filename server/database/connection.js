const { Pool } = require('pg');
require('dotenv').config();

// Use Supabase DATABASE_URL if available, otherwise fall back to individual variables
const connectionConfig = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5, // Reduce connection pool size for Supabase
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
} : {
  connectionString: `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'kartarkiv'}`,
  ssl: false,
  max: 10,
  idleTimeoutMillis: 15000,
  connectionTimeoutMillis: 5000,
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

pool.on('error', (err, client) => {
  console.error('❌ Database connection error:', err.message);
  console.log('🔄 Database error occurred, but continuing...');
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
