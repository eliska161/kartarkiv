const express = require('express');
const router = express.Router();

// Simple login route for testing
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Simple login attempt:', req.body);
    
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required',
        received: { username: !!username, password: !!password }
      });
    }

    // For now, just return a success response
    res.json({
      message: 'Login successful (test mode)',
      user: {
        id: 1,
        username: username,
        email: username,
        is_admin: true
      },
      token: 'test-token-123'
    });

  } catch (error) {
    console.error('💥 Simple login error:', error);
    res.status(500).json({ 
      error: 'Login failed', 
      details: error.message
    });
  }
});

// Simple health check
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth route is working!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
