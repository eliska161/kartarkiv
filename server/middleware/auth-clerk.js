const { verifyToken } = require('@clerk/backend');

const authenticateUser = async (req, res, next) => {
  try {
    console.log('🔐 AUTH DEBUG - CLERK_SECRET_KEY exists:', !!process.env.CLERK_SECRET_KEY);
    console.log('🔐 AUTH DEBUG - Request URL:', req.url);
    console.log('🔐 AUTH DEBUG - Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🔐 AUTH DEBUG - No valid authorization header');
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    try {
      // Verify Clerk JWT token
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY
      });
      
      // Add user info to request
      req.user = {
        id: payload.sub,
        email: payload.email,
        username: payload.username || payload.email,
        isAdmin: payload.publicMetadata?.isAdmin || false
      };
      
      next();
    } catch (jwtError) {
      console.error('Clerk token verification failed:', jwtError);
      return res.status(401).json({ error: 'Invalid token' });
    }

  } catch (error) {
    console.error('Auth middleware error:', error);
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
