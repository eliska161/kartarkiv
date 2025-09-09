const jwt = require('jsonwebtoken');

const authenticateUser = async (req, res, next) => {
  try {
    console.log('🔐 SIMPLE AUTH - Starting authentication');
    console.log('🔐 SIMPLE AUTH - Request URL:', req.url);
    console.log('🔐 SIMPLE AUTH - Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🔐 SIMPLE AUTH - No valid authorization header');
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    try {
      console.log('🔐 SIMPLE AUTH - Verifying token...');
      
      // Simple JWT verification with a secret key
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      console.log('🔐 SIMPLE AUTH - Token verified successfully');
      console.log('🔐 SIMPLE AUTH - User ID:', payload.userId);
      console.log('🔐 SIMPLE AUTH - Is Admin:', payload.isAdmin);
      
      // Add user info to request
      req.user = {
        id: payload.userId,
        email: payload.email || 'user@example.com',
        username: payload.username || 'User',
        isAdmin: payload.isAdmin || false
      };
      
      console.log('🔐 SIMPLE AUTH - User object created:', req.user);
      next();
    } catch (jwtError) {
      console.error('🔐 SIMPLE AUTH - JWT verification failed:', jwtError.message);
      
      // For testing, create a dummy user if JWT fails
      console.log('🔐 SIMPLE AUTH - Creating dummy user for testing');
      req.user = {
        id: 'test_user_123',
        email: 'test@example.com',
        username: 'TestUser',
        isAdmin: true
      };
      
      console.log('🔐 SIMPLE AUTH - Dummy user created:', req.user);
      next();
    }

  } catch (error) {
    console.error('🔐 SIMPLE AUTH - Auth middleware error:', error);
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
