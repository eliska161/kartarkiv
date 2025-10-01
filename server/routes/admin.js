const express = require('express');
const { authenticateUser, requireAdmin } = require('../middleware/auth-clerk-fixed');

const router = express.Router();

// Handle preflight requests for admin routes
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Get all users - SIMPLIFIED
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

// Create new user - SIMPLIFIED
router.post('/users', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { email, firstName, lastName, isAdmin } = req.body;
    
    console.log('🔐 ADMIN DEBUG - Creating user:', { email, firstName, lastName, isAdmin });
    
    // Return dummy created user
    const user = {
      id: `user_${Date.now()}`,
      email: email || 'newuser@example.com',
      firstName: firstName || 'New',
      lastName: lastName || 'User',
      isAdmin: isAdmin || false,
      createdAt: new Date().toISOString()
    };
    
    res.json({ user });
  } catch (error) {
    console.error('❌ Error creating user:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

// Delete user - SIMPLIFIED
router.delete('/users/:userId', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('🔐 ADMIN DEBUG - Deleting user:', userId);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// Toggle admin status - SIMPLIFIED
router.patch('/users/:userId/admin', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isAdmin } = req.body;
    
    console.log('🔐 ADMIN DEBUG - Updating admin status:', { userId, isAdmin });
    
    // Return dummy updated user
    const user = {
      id: userId,
      email: 'user@example.com',
      username: 'User',
      isAdmin: isAdmin,
      updatedAt: new Date().toISOString()
    };
    
    res.json({ user });
  } catch (error) {
    console.error('❌ Error updating admin status:', error);
    res.status(500).json({ message: 'Error updating admin status' });
  }
});

/**
 * @swagger
 * /admin:
 *   options:
 *     summary: Preflight CORS-request for admin
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: OK
 */
router.options('*', (req, res) => { /* ... */ });

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Hent dummy-brukere (admin, test)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste over brukere
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/users', authenticateUser, requireAdmin, async (req, res) => { /* ... */ });

/**
 * @swagger
 * /admin/users:
 *   post:
 *     summary: Opprett dummy-bruker (admin, test)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               isAdmin:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Bruker opprettet
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 */
router.post('/users', authenticateUser, requireAdmin, async (req, res) => { /* ... */ });

/**
 * @swagger
 * /admin/users/{userId}:
 *   delete:
 *     summary: Slett dummy-bruker (admin, test)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bruker slettet
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.delete('/users/:userId', authenticateUser, requireAdmin, async (req, res) => { /* ... */ });

/**
 * @swagger
 * /admin/users/{userId}/admin:
 *   patch:
 *     summary: Toggle admin-status (dummy, test)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isAdmin:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Bruker oppdatert
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 */
router.patch('/users/:userId/admin', authenticateUser, requireAdmin, async (req, res) => { /* ... */ });

module.exports = router;