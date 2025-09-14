const express = require('express');
const { exec } = require('child_process');
const router = express.Router();

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
  res.json({
    status: 'running',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
