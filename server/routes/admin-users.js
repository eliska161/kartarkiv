const express = require('express');
const { clerkClient } = require('@clerk/clerk-sdk-node');
const router = express.Router();

// Middleware to verify admin access
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    const token = authHeader.substring(7);
    const payload = await clerkClient.verifyToken(token);
    
    if (!payload.publicMetadata?.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.user = payload;
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Apply admin middleware to all routes
router.use(verifyAdmin);

// Get all users
router.get('/users', async (req, res) => {
  try {
    console.log('🔍 ADMIN - Fetching users...');
    
    const users = await clerkClient.users.getUserList({
      limit: 100,
      orderBy: '-created_at'
    });

    const formattedUsers = users.data.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      emailAddresses: user.emailAddresses,
      publicMetadata: user.publicMetadata || {},
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt
    }));

    console.log('✅ ADMIN - Found', formattedUsers.length, 'users');
    res.json(formattedUsers);
  } catch (error) {
    console.error('❌ ADMIN - Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Update user role
router.put('/users/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { isAdmin } = req.body;

    console.log('🔍 ADMIN - Updating user role:', userId, 'isAdmin:', isAdmin);

    await clerkClient.users.updateUser(userId, {
      publicMetadata: {
        isAdmin: isAdmin
      }
    });

    console.log('✅ ADMIN - User role updated successfully');
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('❌ ADMIN - Error updating user role:', error);
    res.status(500).json({ message: 'Failed to update user role' });
  }
});

// Delete user
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    console.log('🔍 ADMIN - Deleting user:', userId);

    await clerkClient.users.deleteUser(userId);

    console.log('✅ ADMIN - User deleted successfully');
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('❌ ADMIN - Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Invite user
router.post('/users/invite', async (req, res) => {
  try {
    const { email, role } = req.body;

    console.log('🔍 ADMIN - Inviting user:', email, 'role:', role);

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
    res.status(500).json({ message: 'Failed to send invitation' });
  }
});

module.exports = router;
