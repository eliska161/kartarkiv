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
      console.log('🔐 AUTH DEBUG - Verifying token...');
      
      // Add timeout to prevent hanging
      const verifyPromise = verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Token verification timeout')), 10000);
      });
      
      // Verify Clerk JWT token with timeout
      const payload = await Promise.race([verifyPromise, timeoutPromise]);
      
      console.log('🔐 AUTH DEBUG - Token verified successfully');
      console.log('🔐 AUTH DEBUG - User ID:', payload.sub);
      console.log('🔐 AUTH DEBUG - Full payload keys:', Object.keys(payload));
      console.log('🔐 AUTH DEBUG - Public metadata:', payload.publicMetadata);
      console.log('🔐 AUTH DEBUG - Private metadata:', payload.privateMetadata);
      console.log('🔐 AUTH DEBUG - Is Admin:', payload.publicMetadata?.isAdmin);
      
      // Extract user data from JWT payload
      const email = payload.email || payload.email_addresses?.[0]?.email_address;
      const username = payload.username || payload.preferred_username || email?.split('@')[0] || 'Unknown';
      const isAdmin = Boolean(payload.publicMetadata?.isAdmin);
      
      console.log('🔐 AUTH DEBUG - Extracted email:', email);
      console.log('🔐 AUTH DEBUG - Extracted username:', username);
      console.log('🔐 AUTH DEBUG - Extracted isAdmin:', isAdmin);
      
      // Add user info to request
      req.user = {
        id: payload.sub,
        email: email,
        username: username,
        isAdmin: isAdmin
      };
      
      console.log('🔐 AUTH DEBUG - User object created:', req.user);
      
      // Add timeout for next() call
      setTimeout(() => {
        console.log('🔐 AUTH DEBUG - Calling next()...');
        next();
      }, 100);
    } catch (jwtError) {
      console.error('🔐 AUTH DEBUG - Clerk token verification failed:', jwtError);
      console.error('🔐 AUTH DEBUG - Error details:', {
        name: jwtError.name,
        message: jwtError.message,
        code: jwtError.code,
        stack: jwtError.stack
      });
      
      if (jwtError.message === 'Token verification timeout') {
        return res.status(408).json({ error: 'Token verification timeout' });
      }
      
      return res.status(401).json({ error: 'Invalid token' });
    }

  } catch (error) {
    console.error('🔐 AUTH DEBUG - Auth middleware error:', error);
    console.error('🔐 AUTH DEBUG - Error stack:', error.stack);
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
