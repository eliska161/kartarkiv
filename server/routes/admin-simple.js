const express = require('express');
const { authenticateUser, requireAdmin } = require('../middleware/auth-simple');

const router = express.Router();

// Simple admin routes without Clerk
router.get('/users', authenticateUser, requireAdmin, async (req, res) => {
  try {
    console.log('🔐 ADMIN DEBUG - Getting users');
    
    // Return dummy users for testing
    const users = [
      {
        id: 'user_1',
        email: 'admin@example.com',
        username: 'Admin',
        isAdmin: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'user_2', 
        email: 'user@example.com',
        username: 'User',
        isAdmin: false,
        createdAt: new Date().toISOString()
      }
    ];
    
    res.json({ users });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Handle preflight requests
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).end();
});

module.exports = router;
