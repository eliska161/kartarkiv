const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const fs = require('fs').promises;
const path = require('path');

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
    // File storage health check
    const filesStart = Date.now();
    const uploadsDir = path.join(__dirname, '../../client/public/uploads');
    
    // Check if uploads directory exists and is writable
    await fs.access(uploadsDir, fs.constants.F_OK | fs.constants.W_OK);
    
    // Try to create a test file
    const testFile = path.join(uploadsDir, '.health-check-test');
    await fs.writeFile(testFile, 'health check test');
    await fs.unlink(testFile);
    
    const filesResponseTime = Date.now() - filesStart;
    
    healthChecks.services.fileStorage = {
      status: 'healthy',
      responseTime: `${filesResponseTime}ms`,
      details: 'File storage accessible and writable'
    };
  } catch (error) {
    healthChecks.services.fileStorage = {
      status: 'unhealthy',
      error: error.message,
      details: 'File storage not accessible or not writable'
    };
    overallHealthy = false;
  }

  try {
    // Clerk authentication health check
    const authStart = Date.now();
    
    // Check if Clerk environment variables are set
    const clerkPublishableKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    
    if (!clerkPublishableKey || !clerkSecretKey) {
      throw new Error('Clerk environment variables not configured');
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
      details: 'Clerk authentication service accessible',
      clerkStatus: response.status
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
      SELECT COUNT(*) as map_count, 
             COUNT(CASE WHEN area_bounds IS NOT NULL THEN 1 END) as maps_with_bounds
      FROM maps 
      WHERE is_active = true
    `);
    
    const mapsResponseTime = Date.now() - mapsStart;
    const mapData = mapsResult.rows[0];
    
    healthChecks.services.mapRendering = {
      status: 'healthy',
      responseTime: `${mapsResponseTime}ms`,
      details: 'Map data accessible and renderable',
      totalMaps: parseInt(mapData.map_count),
      mapsWithBounds: parseInt(mapData.maps_with_bounds)
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
    const uploadsDir = path.join(__dirname, '../../client/public/uploads');
    
    // Check directory exists and is writable
    await fs.access(uploadsDir, fs.constants.F_OK | fs.constants.W_OK);
    
    // Test write/delete
    const testFile = path.join(uploadsDir, '.health-check-test');
    await fs.writeFile(testFile, 'health check test');
    await fs.unlink(testFile);
    
    const responseTime = Date.now() - start;
    
    res.json({
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      storage: 'Local file system',
      path: uploadsDir
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      storage: 'Local file system'
    });
  }
});

router.get('/auth', async (req, res) => {
  try {
    const start = Date.now();
    
    const clerkPublishableKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    
    if (!clerkPublishableKey || !clerkSecretKey) {
      throw new Error('Clerk environment variables not configured');
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
      clerkStatus: response.status
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
        COUNT(*) as total_maps,
        COUNT(CASE WHEN area_bounds IS NOT NULL THEN 1 END) as maps_with_bounds,
        COUNT(CASE WHEN file_count > 0 THEN 1 END) as maps_with_files,
        AVG(file_count) as avg_files_per_map
      FROM maps 
      WHERE is_active = true
    `);
    
    const responseTime = Date.now() - start;
    const data = result.rows[0];
    
    res.json({
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      service: 'Map Rendering',
      totalMaps: parseInt(data.total_maps),
      mapsWithBounds: parseInt(data.maps_with_bounds),
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
