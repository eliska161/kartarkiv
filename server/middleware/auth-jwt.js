const jwt = require('jsonwebtoken');
const pool = require('../database/connection');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Get user from database
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
      
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      const user = result.rows[0];
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_admin: user.is_admin,
        role: user.is_admin ? 'admin' : 'user'
      };
      
      next();
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid token' });
    }

  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = {
  authenticateUser,
  requireAdmin
};
