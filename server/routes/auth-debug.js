const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../database/connection');

const router = express.Router();

// Login user with DEBUG
router.post('/login', [
  body('username').trim().escape(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    console.log('🔍 LOGIN DEBUG - Request received');
    console.log('📝 Request body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { username, password } = req.body;
    console.log('👤 Username:', username);
    console.log('🔑 Password length:', password.length);

    // Find user
    console.log('🔍 Searching for user in database...');
    const result = await pool.query(
      'SELECT id, username, email, password_hash, first_name, last_name, is_admin, is_active FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    console.log('📊 Database query result:', result.rows.length, 'rows found');
    if (result.rows.length > 0) {
      console.log('👤 User found:', {
        id: result.rows[0].id,
        username: result.rows[0].username,
        email: result.rows[0].email,
        is_admin: result.rows[0].is_admin,
        is_active: result.rows[0].is_active,
        password_hash_length: result.rows[0].password_hash.length
      });
    }

    if (result.rows.length === 0) {
      console.log('❌ No user found with username:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      console.log('❌ User account is inactive');
      return res.status(401).json({ message: 'Account is inactive' });
    }

    // Verify password
    console.log('🔐 Verifying password...');
    console.log('🔑 Input password:', password);
    console.log('🔑 Stored hash:', user.password_hash);
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('✅ Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Password verification failed');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    console.log('🎫 Generating JWT token...');
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log('✅ Login successful for user:', user.username);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isAdmin: user.is_admin
      }
    });
  } catch (error) {
    console.error('💥 LOGIN ERROR:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Register new user with DEBUG
router.post('/register', [
  body('username').isLength({ min: 3 }).trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().escape(),
  body('lastName').trim().escape()
], async (req, res) => {
  try {
    console.log('🔍 REGISTER DEBUG - Request received');
    console.log('📝 Request body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { username, email, password, firstName, lastName } = req.body;
    console.log('👤 Registration data:', { username, email, firstName, lastName });

    // Check if user already exists
    console.log('🔍 Checking if user already exists...');
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    console.log('📊 Existing user check:', existingUser.rows.length, 'users found');
    if (existingUser.rows.length > 0) {
      console.log('❌ User already exists');
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    console.log('🔑 Password hashed, length:', passwordHash.length);

    // Create user
    console.log('👤 Creating user in database...');
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, first_name, last_name, is_admin',
      [username, email, passwordHash, firstName, lastName]
    );

    const user = result.rows[0];
    console.log('✅ User created:', user);

    // Generate JWT token
    console.log('🎫 Generating JWT token...');
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    console.log('✅ Registration successful for user:', user.username);
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        isAdmin: user.is_admin
      }
    });
  } catch (error) {
    console.error('💥 REGISTRATION ERROR:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

module.exports = router;
