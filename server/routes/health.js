const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const AWS = require('aws-sdk');

// Health check endpoint for all services
router.get('/', async (req, res) => {
  const healthChecks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {}
  };

  let overallHealthy = true;

  try {
    // Database health check
    const dbStart = Date.now();
    const dbResult = await db.query('SELECT 1 as health_check');
    const dbResponseTime = Date.now() - dbStart;
    
    healthChecks.services.database = {
      status: 'healthy',
      responseTime: `${dbResponseTime}ms`,
      details: 'PostgreSQL connection successful'
    };
  } catch (error) {
    healthChecks.services.database = {
      status: 'unhealthy',
      error: error.message,
      details: 'PostgreSQL connection failed'
    };
    overallHealthy = false;
  }

  try {
    // File storage health check (Wasabi S3)
    const filesStart = Date.now();
    
    // Check if Wasabi environment variables are set
    const wasabiEndpoint = process.env.WASABI_ENDPOINT;
    const wasabiAccessKey = process.env.WASABI_ACCESS_KEY;
    const wasabiSecretKey = process.env.WASABI_SECRET_KEY;
    const wasabiBucket = process.env.WASABI_BUCKET;
    const wasabiRegion = process.env.WASABI_REGION;
    
    if (!wasabiEndpoint || !wasabiAccessKey || !wasabiSecretKey || !wasabiBucket) {
      throw new Error('Wasabi environment variables not configured');
    }
    
    // Configure AWS SDK for Wasabi
    const s3 = new AWS.S3({
      endpoint: wasabiEndpoint,
      accessKeyId: wasabiAccessKey,
      secretAccessKey: wasabiSecretKey,
      region: wasabiRegion || 'us-east-1',
      s3ForcePathStyle: true
    });
    
    // Test Wasabi connection by listing objects
    const listParams = {
      Bucket: wasabiBucket,
      MaxKeys: 1
    };
    
    await s3.listObjectsV2(listParams).promise();
    
    const filesResponseTime = Date.now() - filesStart;
    
    healthChecks.services.fileStorage = {
      status: 'healthy',
      responseTime: `${filesResponseTime}ms`,
      details: `Wasabi S3 storage accessible (${wasabiBucket})`,
      endpoint: wasabiEndpoint,
      region: wasabiRegion || 'us-east-1'
    };
  } catch (error) {
    healthChecks.services.fileStorage = {
      status: 'unhealthy',
      error: error.message,
      details: 'Wasabi S3 storage not accessible or not configured'
    };
    overallHealthy = false;
  }

  try {
    // Clerk authentication health check
    const authStart = Date.now();
    
    // Check if Clerk environment variables are set
    const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY || process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    
    if (!clerkSecretKey) {
      console.log('❌ CLERK_SECRET_KEY not found in environment variables');
      throw new Error('CLERK_SECRET_KEY not configured');
    }
    
    // Publishable key is optional on server-side (it's on frontend)
    if (!clerkPublishableKey) {
      console.log('ℹ️ CLERK_PUBLISHABLE_KEY not found on server (expected - it should be on frontend)');
    }
    
    // Try to make a simple request to Clerk API
    const response = await fetch('https://api.clerk.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const authResponseTime = Date.now() - authStart;
    
    healthChecks.services.clerkAuth = {
      status: 'healthy',
      responseTime: `${authResponseTime}ms`,
      details: 'Clerk authentication service accessible (server-side)',
      clerkStatus: response.status,
      publishableKeyAvailable: !!clerkPublishableKey
    };
  } catch (error) {
    healthChecks.services.clerkAuth = {
      status: 'unhealthy',
      error: error.message,
      details: 'Clerk authentication service not accessible'
    };
    overallHealthy = false;
  }

  try {
    // Map rendering health check
    const mapsStart = Date.now();
    
    // Check if we can query maps from database
    const mapsResult = await db.query(`
      SELECT 
        COUNT(m.id) as map_count, 
        COUNT(CASE WHEN m.area_bounds IS NOT NULL THEN 1 END) as maps_with_bounds,
        COUNT(mf.id) as total_files,
        COUNT(CASE WHEN mf.id IS NOT NULL THEN 1 END) as maps_with_files
      FROM maps m
      LEFT JOIN map_files mf ON m.id = mf.map_id
    `);
    
    const mapsResponseTime = Date.now() - mapsStart;
    const mapData = mapsResult.rows[0];
    
    healthChecks.services.mapRendering = {
      status: 'healthy',
      responseTime: `${mapsResponseTime}ms`,
      details: 'Map data accessible and renderable',
      totalMaps: parseInt(mapData.map_count),
      mapsWithBounds: parseInt(mapData.maps_with_bounds),
      totalFiles: parseInt(mapData.total_files),
      mapsWithFiles: parseInt(mapData.maps_with_files)
    };
  } catch (error) {
    healthChecks.services.mapRendering = {
      status: 'unhealthy',
      error: error.message,
      details: 'Map data not accessible or not renderable'
    };
    overallHealthy = false;
  }

  // Set overall status
  healthChecks.status = overallHealthy ? 'healthy' : 'unhealthy';
  
  // Return appropriate HTTP status
  const httpStatus = overallHealthy ? 200 : 503;
  
  res.status(httpStatus).json(healthChecks);
});

// Individual health check endpoints
router.get('/database', async (req, res) => {
  try {
    const start = Date.now();
    const result = await db.query('SELECT 1 as health_check, NOW() as current_time');
    const responseTime = Date.now() - start;
    
    res.json({
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      database: 'PostgreSQL',
      timestamp: result.rows[0].current_time
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      database: 'PostgreSQL'
    });
  }
});

router.get('/files', async (req, res) => {
  try {
    const start = Date.now();
    
    // Check if Wasabi environment variables are set
    const wasabiEndpoint = process.env.WASABI_ENDPOINT;
    const wasabiAccessKey = process.env.WASABI_ACCESS_KEY;
    const wasabiSecretKey = process.env.WASABI_SECRET_KEY;
    const wasabiBucket = process.env.WASABI_BUCKET;
    const wasabiRegion = process.env.WASABI_REGION;
    
    if (!wasabiEndpoint || !wasabiAccessKey || !wasabiSecretKey || !wasabiBucket) {
      throw new Error('Wasabi environment variables not configured');
    }
    
    // Configure AWS SDK for Wasabi
    const s3 = new AWS.S3({
      endpoint: wasabiEndpoint,
      accessKeyId: wasabiAccessKey,
      secretAccessKey: wasabiSecretKey,
      region: wasabiRegion || 'us-east-1',
      s3ForcePathStyle: true
    });
    
    // Test Wasabi connection by listing objects
    const listParams = {
      Bucket: wasabiBucket,
      MaxKeys: 1
    };
    
    const result = await s3.listObjectsV2(listParams).promise();
    const responseTime = Date.now() - start;
    
    res.json({
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      storage: 'Wasabi S3',
      bucket: wasabiBucket,
      endpoint: wasabiEndpoint,
      region: wasabiRegion || 'us-east-1',
      objectCount: result.KeyCount || 0
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      storage: 'Wasabi S3'
    });
  }
});

router.get('/auth', async (req, res) => {
  try {
    const start = Date.now();
    
    const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY || process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    
    if (!clerkSecretKey) {
      throw new Error('CLERK_SECRET_KEY not configured');
    }
    
    // Publishable key is optional on server-side (it's on frontend)
    if (!clerkPublishableKey) {
      console.log('ℹ️ CLERK_PUBLISHABLE_KEY not found on server (expected - it should be on frontend)');
    }
    
    // Test Clerk API connectivity
    const response = await fetch('https://api.clerk.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const responseTime = Date.now() - start;
    
    res.json({
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      service: 'Clerk Authentication',
      clerkStatus: response.status,
      publishableKeyAvailable: !!clerkPublishableKey,
      note: 'Publishable key is on frontend (Vercel), secret key is on server (Railway)'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      service: 'Clerk Authentication'
    });
  }
});

router.get('/maps', async (req, res) => {
  try {
    const start = Date.now();
    
    // Query maps and check if they have proper data for rendering
    const result = await db.query(`
      SELECT 
        COUNT(m.id) as total_maps,
        COUNT(CASE WHEN m.area_bounds IS NOT NULL THEN 1 END) as maps_with_bounds,
        COUNT(mf.id) as total_files,
        COUNT(CASE WHEN mf.id IS NOT NULL THEN 1 END) as maps_with_files,
        CASE 
          WHEN COUNT(m.id) > 0 THEN ROUND(COUNT(mf.id)::DECIMAL / COUNT(m.id), 1)
          ELSE 0 
        END as avg_files_per_map
      FROM maps m
      LEFT JOIN map_files mf ON m.id = mf.map_id
    `);
    
    const responseTime = Date.now() - start;
    const data = result.rows[0];
    
    res.json({
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      service: 'Map Rendering',
      totalMaps: parseInt(data.total_maps),
      mapsWithBounds: parseInt(data.maps_with_bounds),
      totalFiles: parseInt(data.total_files),
      mapsWithFiles: parseInt(data.maps_with_files),
      avgFilesPerMap: parseFloat(data.avg_files_per_map || 0).toFixed(1)
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      service: 'Map Rendering'
    });
  }
});

module.exports = router;
