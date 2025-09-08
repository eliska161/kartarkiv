const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Sign up
router.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      message: 'User created successfully. Please check your email to confirm your account.',
      user: data.user 
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Sign in (alias for /login)
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt:', { username: req.body.username });
    
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    console.log('🔑 Attempting Supabase auth...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: username, // Use username as email
      password
    });

    if (error) {
      console.error('❌ Supabase auth error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('✅ Supabase auth successful, user ID:', data.user.id);

    // Get user data from our users table using email instead of ID
    console.log('🔍 Fetching user data from users table...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', username) // Use email to match user
      .single();

    if (userError) {
      console.error('❌ User data fetch error:', userError);
      // If user doesn't exist in our table, create a basic user record
      console.log('🔧 Creating user record...');
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          username: username,
          email: username,
          password_hash: 'supabase_managed',
          first_name: 'User',
          last_name: 'Name',
          is_admin: false
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ User creation error:', createError);
        return res.status(500).json({ error: 'Failed to create user data', details: createError.message });
      }

      console.log('✅ User record created successfully');
      return res.json({
        user: newUser,
        token: data.session.access_token,
        session: data.session
      });
    }

    console.log('✅ User data fetched successfully');

    res.json({
      user: userData,
      token: data.session.access_token,
      session: data.session
    });
  } catch (error) {
    console.error('💥 Login error:', error);
    res.status(500).json({ 
      error: 'Login failed', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Sign in (original)
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Get user data from our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (userError) {
      return res.status(500).json({ error: 'Failed to get user data' });
    }

    res.json({
      user: userData,
      session: data.session
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Signin failed' });
  }
});

// Sign out
router.post('/signout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error('Signout error:', error);
    res.status(500).json({ error: 'Signout failed' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user data from our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user: userData });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user role (admin only)
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    // Verify admin access
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (adminError || !adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Update user role
    const { data, error: updateError } = await supabase
      .from('users')
      .update({ role })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.json({ user: data });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

module.exports = router;