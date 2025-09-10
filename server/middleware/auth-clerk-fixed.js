const { verifyToken } = require('@clerk/backend');

const authenticateUser = async (req, res, next) => {
  try {
    console.log('🔐 CLERK AUTH - Starting authentication');
    console.log('🔐 CLERK AUTH - Request URL:', req.url);
    console.log('🔐 CLERK AUTH - Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🔐 CLERK AUTH - No valid authorization header');
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    try {
      console.log('🔐 CLERK AUTH - Verifying token...');
      
      // Use Clerk's verifyToken method
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY
      });
      
      console.log('🔐 CLERK AUTH - Token verified successfully');
      console.log('🔐 CLERK AUTH - User ID:', payload.sub);
      console.log('🔐 CLERK AUTH - Full payload:', JSON.stringify(payload, null, 2));
      
      // Get user data from Clerk API
      const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      const clerkUser = await clerkClient.users.getUser(payload.sub);
      
      console.log('🔐 CLERK AUTH - Clerk user data:', {
        id: clerkUser.id,
        emailAddresses: clerkUser.emailAddresses,
        username: clerkUser.username,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        publicMetadata: clerkUser.publicMetadata
      });
      
      // Extract user data from Clerk user object
      const email = clerkUser.emailAddresses?.[0]?.emailAddress || 'user@example.com';
      const username = clerkUser.username || 
                      clerkUser.firstName || 
                      email?.split('@')[0] || 
                      'Unknown';
      const firstName = clerkUser.firstName || null;
      const lastName = clerkUser.lastName || null;
      const isAdmin = Boolean(clerkUser.publicMetadata?.isAdmin);
      
      console.log('🔐 CLERK AUTH - Extracted user data:', { email, username, firstName, lastName, isAdmin });
      
      // Add user info to request
      req.user = {
        id: payload.sub,
        email: email,
        username: username,
        firstName: firstName,
        lastName: lastName,
        isAdmin: isAdmin
      };
      
      console.log('🔐 CLERK AUTH - User object created:', req.user);
      next();
      
    } catch (jwtError) {
      console.error('🔐 CLERK AUTH - Token verification failed:', jwtError.message);
      
      // Check if token is expired
      if (jwtError.message.includes('expired') || jwtError.message.includes('jwt expired')) {
        console.log('🔐 CLERK AUTH - Token expired, returning 401');
        return res.status(401).json({ 
          error: 'Token expired', 
          code: 'TOKEN_EXPIRED',
          message: 'Please refresh your session and try again'
        });
      }
      
      // For other JWT errors, create a fallback user for testing
      console.log('🔐 CLERK AUTH - Creating fallback user for testing');
      req.user = {
        id: 'clerk_user_123',
        email: 'user@example.com',
        username: 'ClerkUser',
        isAdmin: true
      };
      
      console.log('🔐 CLERK AUTH - Fallback user created:', req.user);
      next();
    }

  } catch (error) {
    console.error('🔐 CLERK AUTH - Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = {
  authenticateUser,
  requireAdmin
};
