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
    
    // Restart the server after a short delay
    setTimeout(() => {
      console.log('🔄 RESTART: Executing restart command...');
      process.exit(0); // This will trigger Railway to restart the container
    }, 1000);
    
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
