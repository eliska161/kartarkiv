const express = require('express');
const { ClerkExpressRequireAuth } = require('@clerk/backend');
const { clerkClient } = require('@clerk/backend');

// Initialize Clerk with secret key
clerkClient.__unstable_options = {
  secretKey: process.env.CLERK_SECRET_KEY
};

const router = express.Router();

// Middleware to require authentication and admin role
const requireAdmin = async (req, res, next) => {
  try {
    const { userId } = req.auth;
    
    if (!userId) {
      return res.status(401).json({ message: 'Ikke autentisert' });
    }

    // Get user from Clerk
    const user = await clerkClient.users.getUser(userId);
    
    if (!user.publicMetadata?.isAdmin) {
      return res.status(403).json({ message: 'Kun administratorer har tilgang' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ message: 'Autentiseringsfeil' });
  }
};

// Get all users
router.get('/users', ClerkExpressRequireAuth(), requireAdmin, async (req, res) => {
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
router.post('/users', ClerkExpressRequireAuth(), requireAdmin, async (req, res) => {
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
router.delete('/users/:userId', ClerkExpressRequireAuth(), requireAdmin, async (req, res) => {
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
router.patch('/users/:userId/admin', ClerkExpressRequireAuth(), requireAdmin, async (req, res) => {
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
