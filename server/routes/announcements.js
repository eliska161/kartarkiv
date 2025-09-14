const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { authenticateUser, requireAdmin } = require('../middleware/auth-clerk-fixed');

// Get active announcements (public endpoint)
router.get('/', async (req, res) => {
  console.log('🔍 ANNOUNCEMENTS: GET / - Fetching active announcements');
  try {
    const query = `
      SELECT id, title, message, type, priority, created_at, expires_at
      FROM announcements 
      WHERE is_active = true 
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY priority DESC, created_at DESC
    `;
    
    console.log('🔍 ANNOUNCEMENTS: Executing query:', query);
    const result = await db.query(query);
    console.log('🔍 ANNOUNCEMENTS: Query result:', result.rows.length, 'announcements found');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ ANNOUNCEMENTS: Error fetching announcements:', error);
    res.status(500).json({ error: 'Kunne ikke hente kunngjøringer' });
  }
});

// Get all announcements (admin only)
router.get('/admin', authenticateUser, requireAdmin, async (req, res) => {
  console.log('🔍 ANNOUNCEMENTS: GET /admin - Fetching all announcements');
  try {
    const query = `
      SELECT id, title, message, type, is_active, created_by, 
             created_at, updated_at, expires_at, priority
      FROM announcements 
      ORDER BY priority DESC, created_at DESC
    `;
    
    console.log('🔍 ANNOUNCEMENTS: Executing admin query:', query);
    const result = await db.query(query);
    console.log('🔍 ANNOUNCEMENTS: Admin query result:', result.rows.length, 'announcements found');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ ANNOUNCEMENTS: Error fetching all announcements:', error);
    res.status(500).json({ error: 'Kunne ikke hente alle kunngjøringer' });
  }
});

// Create announcement (admin only)
router.post('/', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { title, message, type = 'info', expires_at, priority = 0 } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ error: 'Tittel og melding er påkrevd' });
    }

    const query = `
      INSERT INTO announcements (title, message, type, created_by, expires_at, priority)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [title, message, type, req.user.id, expires_at || null, priority];
    const result = await db.query(query, values);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ error: 'Kunne ikke opprette kunngjøring' });
  }
});

// Update announcement (admin only)
router.put('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message, type, is_active, expires_at, priority } = req.body;
    
    const query = `
      UPDATE announcements 
      SET title = $1, message = $2, type = $3, is_active = $4, 
          expires_at = $5, priority = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    
    const values = [title, message, type, is_active, expires_at, priority, id];
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kunngjøring ikke funnet' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ error: 'Kunne ikke oppdatere kunngjøring' });
  }
});

// Delete announcement (admin only)
router.delete('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM announcements WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kunngjøring ikke funnet' });
    }
    
    res.json({ message: 'Kunngjøring slettet' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ error: 'Kunne ikke slette kunngjøring' });
  }
});

// Toggle announcement status (admin only)
router.patch('/:id/toggle', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      UPDATE announcements 
      SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kunngjøring ikke funnet' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling announcement:', error);
    res.status(500).json({ error: 'Kunne ikke endre kunngjøring' });
  }
});

module.exports = router;
