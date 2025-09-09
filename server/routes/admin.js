const express = require('express');
const { createClerkClient, verifyToken } = require('@clerk/backend');

// Initialize Clerk with secret key
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

const router = express.Router();

// Handle preflight requests for admin routes
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Middleware to require authentication and admin role
const requireAdmin = async (req, res, next) => {
  try {
    console.log('🔐 ADMIN DEBUG - CLERK_SECRET_KEY exists:', !!process.env.CLERK_SECRET_KEY);
    console.log('🔐 ADMIN DEBUG - Request URL:', req.url);
    console.log('🔐 ADMIN DEBUG - Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🔐 ADMIN DEBUG - No valid authorization header');
      return res.status(401).json({ message: 'Ikke autentisert' });
    }

    const token = authHeader.substring(7);
    
    // Verify token with Clerk
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY
    });

    if (!payload || !payload.sub) {
      return res.status(401).json({ message: 'Ugyldig token' });
    }

    // Get user from Clerk
    const user = await clerkClient.users.getUser(payload.sub);
    
    if (!user.publicMetadata?.isAdmin) {
      return res.status(403).json({ message: 'Kun administratorer har tilgang' });
    }

    req.user = user;
    req.auth = { userId: payload.sub };
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ message: 'Autentiseringsfeil' });
  }
};

// Get all users
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const users = await clerkClient.users.getUserList({
      limit: 100,
      orderBy: '-created_at'
    });

    res.json({ users: users.data });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Kunne ikke hente brukere' });
  }
});

// Create new user
router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { email, firstName, lastName, isAdmin } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'E-post er påkrevd' });
    }

    // Create user in Clerk
    const user = await clerkClient.users.createUser({
      emailAddress: [email],
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      publicMetadata: {
        isAdmin: isAdmin || false
      },
      skipPasswordChecks: true, // User will need to set password on first login
      skipPasswordRequirement: true
    });

    res.json({ user });
  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error.errors) {
      const errorMessage = error.errors[0]?.message || 'Kunne ikke opprette bruker';
      return res.status(400).json({ message: errorMessage });
    }
    
    res.status(500).json({ message: 'Kunne ikke opprette bruker' });
  }
});

// Delete user
router.delete('/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Don't allow deleting yourself
    if (userId === req.auth.userId) {
      return res.status(400).json({ message: 'Du kan ikke slette deg selv' });
    }

    await clerkClient.users.deleteUser(userId);
    res.json({ message: 'Bruker slettet' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Kunne ikke slette bruker' });
  }
});

// Toggle admin status
router.patch('/users/:userId/admin', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isAdmin } = req.body;

    // Don't allow removing admin from yourself
    if (userId === req.auth.userId && !isAdmin) {
      return res.status(400).json({ message: 'Du kan ikke fjerne admin-rettigheter fra deg selv' });
    }

    const user = await clerkClient.users.updateUser(userId, {
      publicMetadata: {
        isAdmin: isAdmin
      }
    });

    res.json({ user });
  } catch (error) {
    console.error('Error updating admin status:', error);
    res.status(500).json({ message: 'Kunne ikke oppdatere admin-status' });
  }
});

module.exports = router;
