// TEMPORARY: Simple auth bypass for testing
const authenticateUser = async (req, res, next) => {
  try {
    console.log('🔐 AUTH DEBUG - Using temporary auth bypass');
    console.log('🔐 AUTH DEBUG - Request URL:', req.url);
    console.log('🔐 AUTH DEBUG - Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
    
    // Create a dummy user for testing
    req.user = {
      id: 'temp_user_123',
      email: 'test@example.com',
      username: 'TestUser',
      isAdmin: true // Allow all operations for testing
    };
    
    console.log('🔐 AUTH DEBUG - Dummy user created:', req.user);
    next();
  } catch (error) {
    console.error('🔐 AUTH DEBUG - Auth middleware error:', error);
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
