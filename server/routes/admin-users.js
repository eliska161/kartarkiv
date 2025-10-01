const express = require('express');
const { createClerkClient } = require('@clerk/backend');
const { authenticateUser, requireAdmin } = require('../middleware/auth-clerk-fixed');
const router = express.Router();

// Initialize Clerk client
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

// Apply auth middleware to all routes
router.use(authenticateUser);
router.use(requireAdmin);

// Get all users from Clerk
router.get('/users', async (req, res) => {
  try {
    console.log('🔍 ADMIN - Fetching users from Clerk...');
    console.log('🌐 CORS: Admin users request origin:', req.headers.origin);
    
    // Set CORS headers explicitly for admin users endpoint
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Clerk-Auth-Message, Accept, Origin');
    
    // Get all users from Clerk with pagination (no organization needed)
    let allUsers = [];
    let hasMore = true;
    let offset = 0;
    const limit = 100;

    while (hasMore) {
      const users = await clerkClient.users.getUserList({
        limit: limit,
        offset: offset
      });

      allUsers = allUsers.concat(users.data);
      hasMore = users.hasMore;
      offset += limit;

      // Safety break to prevent infinite loops
      if (offset > 1000) {
        console.warn('⚠️ ADMIN - Stopping pagination at 1000 users');
        break;
      }
    }

    const formattedUsers = allUsers.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      emailAddresses: user.emailAddresses,
      publicMetadata: user.publicMetadata || {},
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt,
      // Add status information
      status: user.banned ? 'banned' : (user.locked ? 'locked' : 'active')
    }));

    console.log('✅ ADMIN - Found', formattedUsers.length, 'users from Clerk');
    res.json(formattedUsers);
  } catch (error) {
    console.error('❌ ADMIN - Error fetching users from Clerk:', error);
    
    // Set CORS headers even for errors
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    res.status(500).json({ message: 'Failed to fetch users from Clerk' });
  }
});

// Update user role
router.put('/users/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { isAdmin } = req.body;

    console.log('🔍 ADMIN - Updating user role:', userId, 'isAdmin:', isAdmin);
    
    // Set CORS headers explicitly
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Clerk-Auth-Message, Accept, Origin');

    // Update user metadata directly
    await clerkClient.users.updateUser(userId, {
      publicMetadata: {
        isAdmin: isAdmin
      }
    });

    console.log('✅ ADMIN - User role updated successfully');
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('❌ ADMIN - Error updating user role:', error);
    
    // Set CORS headers even for errors
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    res.status(500).json({ message: 'Failed to update user role' });
  }
});

// Delete user
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('🔍 ADMIN - Deleting user:', userId);
    
    // Set CORS headers explicitly
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Clerk-Auth-Message, Accept, Origin');

    await clerkClient.users.deleteUser(userId);

    console.log('✅ ADMIN - User deleted successfully');
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('❌ ADMIN - Error deleting user:', error);
    
    // Set CORS headers even for errors
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Invite user
router.post('/users/invite', async (req, res) => {
  try {
    const { email, role } = req.body;

    console.log('🔍 ADMIN - Inviting user:', email, 'role:', role);
    
    // Set CORS headers explicitly
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Clerk-Auth-Message, Accept, Origin');

    const invitation = await clerkClient.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: {
        isAdmin: role === 'admin'
      }
    });

    console.log('✅ ADMIN - Invitation sent successfully');
    res.json({ 
      message: 'Invitation sent successfully',
      invitationId: invitation.id
    });
  } catch (error) {
    console.error('❌ ADMIN - Error sending invitation:', error);
    
    // Set CORS headers even for errors
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    res.status(500).json({ message: 'Failed to send invitation' });
  }
});

// Get all invitations
router.get('/invitations', async (req, res) => {
  try {
    console.log('🔍 ADMIN - Fetching invitations from Clerk...');
    
    // Set CORS headers explicitly
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Clerk-Auth-Message, Accept, Origin');

    // Get all invitations from Clerk
    let allInvitations = [];
    let hasMore = true;
    let offset = 0;
    const limit = 100;

    while (hasMore) {
      const invitations = await clerkClient.invitations.getInvitationList({
        limit: limit,
        offset: offset,
        status: 'pending'
      });

      allInvitations = allInvitations.concat(invitations.data);
      hasMore = invitations.hasMore;
      offset += limit;

      // Safety break to prevent infinite loops
      if (offset > 1000) {
        console.warn('⚠️ ADMIN - Stopping pagination at 1000 invitations');
        break;
      }
    }

    const formattedInvitations = allInvitations.map(invitation => ({
      id: invitation.id,
      emailAddress: invitation.emailAddress,
      publicMetadata: invitation.publicMetadata || {},
      createdAt: invitation.createdAt,
      status: invitation.status
    }));

    console.log('✅ ADMIN - Found', formattedInvitations.length, 'invitations from Clerk');
    res.json(formattedInvitations);
  } catch (error) {
    console.error('❌ ADMIN - Error fetching invitations from Clerk:', error);
    
    // Set CORS headers even for errors
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    res.status(500).json({ message: 'Failed to fetch invitations from Clerk' });
  }
});

/**
 * @swagger
 * /admin-users/users:
 *   get:
 *     summary: Hent alle brukere fra Clerk
 *     tags: [AdminUsers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste over brukere fra Clerk
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/users', async (req, res) => { /* ... */ });

/**
 * @swagger
 * /admin-users/users/{userId}/role:
 *   put:
 *     summary: Oppdater brukerrolle (admin)
 *     tags: [AdminUsers]
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
 *         description: Rolle oppdatert
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
router.put('/users/:userId/role', async (req, res) => { /* ... */ });

/**
 * @swagger
 * /admin-users/users/{userId}:
 *   delete:
 *     summary: Slett bruker (admin)
 *     tags: [AdminUsers]
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
router.delete('/users/:userId', async (req, res) => { /* ... */ });

/**
 * @swagger
 * /admin-users/users/invite:
 *   post:
 *     summary: Inviter ny bruker via Clerk
 *     tags: [AdminUsers]
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
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invitasjon sendt
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 invitationId:
 *                   type: string
 */
router.post('/users/invite', async (req, res) => { /* ... */ });

/**
 * @swagger
 * /admin-users/invitations:
 *   get:
 *     summary: Hent alle invitasjoner fra Clerk
 *     tags: [AdminUsers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste over invitasjoner
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/invitations', async (req, res) => { /* ... */ });

module.exports = router;
