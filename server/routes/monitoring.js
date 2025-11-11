// server/routes/monitoring.js
const express = require('express');
const router = express.Router();

// Better Stack API configuration
const BETTER_STACK_API_URL = 'https://uptime.betterstack.com/api/v2/monitors';
const BETTER_STACK_API_TOKEN = process.env.BETTER_STACK_API_TOKEN;

router.get('/monitors', async (req, res) => {
  try {
    if (!BETTER_STACK_API_TOKEN) {
      console.error('BETTER_STACK_API_TOKEN is not configured');
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
      console.error(`Better Stack API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      
      return res.status(response.status).json({ 
        error: `Better Stack API error: ${response.status}`,
        data: []
      });
    }

    const data = await response.json();
    
    // Return the data in the expected format
    res.json(data);
    
  } catch (error) {
    console.error('Error fetching Better Stack monitors:', error);
    res.status(500).json({ 
      error: 'Failed to fetch monitor data',
      data: []
    });
  }
});

module.exports = router;
