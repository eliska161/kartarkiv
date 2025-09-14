const express = require('express');
const { exec } = require('child_process');
const router = express.Router();

// CORS middleware for restart routes
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://www.kartarkiv.co');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// Restart Railway server
router.post('/restart', async (req, res) => {
  try {
    console.log('🔄 RESTART: Server restart requested');
    
    // Log the restart request
    console.log('🔄 RESTART: Initiating server restart...');
    
    // Send response before restarting
    res.json({ 
      success: true, 
      message: 'Server restart initiated',
      timestamp: new Date().toISOString()
    });
    
    // Try Railway CLI with proper environment setup
    console.log('🔄 RESTART: Attempting Railway CLI redeploy...');
    
    // Check if Railway CLI environment variables are set
    if (!process.env.RAILWAY_TOKEN || !process.env.RAILWAY_PROJECT_ID) {
      console.log('🔄 RESTART: Railway CLI environment variables not set, using process.exit fallback');
      console.log('Missing: RAILWAY_TOKEN or RAILWAY_PROJECT_ID');
      setTimeout(() => {
        console.log('🔄 RESTART: Executing process.exit(1) to trigger restart...');
        process.exit(1);
      }, 1000);
      return;
    }
    
    // Set up environment for Railway CLI
    const env = {
      ...process.env,
      RAILWAY_TOKEN: process.env.RAILWAY_TOKEN,
      RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID
    };
    
    console.log('🔄 RESTART: Using Railway CLI with project ID:', process.env.RAILWAY_PROJECT_ID);
    
    exec('npx @railway/cli up --detach', { 
      env: env,
      cwd: process.cwd(),
      timeout: 30000 // 30 second timeout
    }, (error, stdout, stderr) => {
      if (error) {
        console.log('🔄 RESTART: Railway CLI failed, using process.exit fallback');
        console.log('Error:', error.message);
        console.log('Stderr:', stderr);
        
        // Fallback to process.exit if Railway CLI fails
        setTimeout(() => {
          console.log('🔄 RESTART: Executing process.exit(1) to trigger restart...');
          process.exit(1);
        }, 2000);
      } else {
        console.log('🔄 RESTART: Railway CLI redeploy initiated successfully');
        console.log('Output:', stdout);
        if (stderr) {
          console.log('Stderr:', stderr);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ RESTART ERROR:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to restart server',
      error: error.message 
    });
  }
});

// Get restart status/logs
router.get('/status', (req, res) => {
  const uptime = process.uptime();
  const startTime = new Date(Date.now() - (uptime * 1000));
  
  console.log(`📊 STATUS: Server uptime: ${uptime}s, started: ${startTime.toISOString()}`);
  
  res.json({
    status: 'running',
    uptime: uptime,
    startTime: startTime.toISOString(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
