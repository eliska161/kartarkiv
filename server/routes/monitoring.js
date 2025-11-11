// server/routes/monitoring.js
const express = require('express');
const router = express.Router();

// Better Stack API configuration
const BETTER_STACK_API_URL = 'https://uptime.betterstack.com/api/v2/monitors';
const BETTER_STACK_API_TOKEN = process.env.BETTER_STACK_API_TOKEN;

// CORS middleware
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

router.get('/monitors', async (req, res) => {
  try {
    console.log('🔍 Fetching Better Stack monitors...');
    
    if (!BETTER_STACK_API_TOKEN) {
      console.error('❌ BETTER_STACK_API_TOKEN is not configured');
      return res.status(500).json({ 
        error: 'Better Stack API token not configured',
        data: [] 
      });
    }

    const response = await fetch(BETTER_STACK_API_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${BETTER_STACK_API_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Better Stack API error: ${response.status} ${response.statusText}`);
      console.error('Error response:', errorText);
      
      return res.status(response.status).json({ 
        error: `Better Stack API error: ${response.status}`,
        message: errorText,
        data: []
      });
    }

    const data = await response.json();
    console.log('✅ Successfully fetched', data?.data?.length || 0, 'monitors from Better Stack');
    
    // Return the data in the expected format
    res.json(data);
    
  } catch (error) {
    console.error('❌ Error fetching Better Stack monitors:', error);
    res.status(500).json({ 
      error: 'Failed to fetch monitor data',
      message: error.message,
      data: []
    });
  }
});

// Health check endpoint for the monitoring route itself
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    configured: Boolean(BETTER_STACK_API_TOKEN),
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
