// NO AUTH - Just let everything through for testing
const authenticateUser = async (req, res, next) => {
  console.log('🔐 NO AUTH - Allowing request through');
  
  // Create a dummy user
  req.user = {
    id: 'test_user_123',
    email: 'test@example.com',
    username: 'TestUser',
    isAdmin: true
  };
  
  next();
};

const requireAdmin = (req, res, next) => {
  next(); // Allow everything
};

module.exports = {
  authenticateUser,
  requireAdmin
};
