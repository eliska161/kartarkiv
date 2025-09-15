const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { authenticateUser, requireAdmin } = require('../middleware/auth-clerk-fixed');

// Get active announcements (public endpoint)
router.get('/', async (req, res) => {
  console.log('🔍 ANNOUNCEMENTS: GET / - Fetching active announcements');
  try {
    const query = `
      SELECT a.id, a.title, a.message, a.type, a.priority, a.created_at, a.updated_at, a.expires_at,
             av.version_number, av.created_at as version_created_at
      FROM announcements a
      LEFT JOIN announcement_versions av ON a.id = av.announcement_id AND av.is_current_version = true
      WHERE a.is_active = true 
        AND (a.expires_at IS NULL OR a.expires_at > NOW())
      ORDER BY a.priority DESC, a.created_at DESC
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
    
    const values = [title, message, type, req.user.id, expires_at && expires_at.trim() !== '' ? expires_at : null, priority];
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
    
    console.log('🔍 ANNOUNCEMENTS: PUT /:id - Updating announcement', id);
    console.log('🔍 ANNOUNCEMENTS: Request body:', req.body);
    
    const query = `
      UPDATE announcements 
      SET title = $1, message = $2, type = $3, is_active = $4, 
          expires_at = $5, priority = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    
    const values = [title, message, type, is_active, expires_at && expires_at.trim() !== '' ? expires_at : null, priority, id];
    console.log('🔍 ANNOUNCEMENTS: Query values:', values);
    
    const result = await db.query(query, values);
    console.log('🔍 ANNOUNCEMENTS: Update result:', result.rows.length, 'rows affected');
    
    if (result.rows.length === 0) {
      console.log('❌ ANNOUNCEMENTS: Announcement not found:', id);
      return res.status(404).json({ error: 'Kunngjøring ikke funnet' });
    }
    
    console.log('✅ ANNOUNCEMENTS: Announcement updated successfully');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ ANNOUNCEMENTS: Error updating announcement:', error);
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

// Get announcement version history (admin only)
router.get('/:id/versions', authenticateUser, requireAdmin, async (req, res) => {
  console.log('🔍 ANNOUNCEMENTS: GET /:id/versions - Fetching version history for announcement', req.params.id);
  try {
    const query = `
      SELECT av.id, av.version_number, av.title, av.message, av.type, av.is_active, 
             av.expires_at, av.priority, av.created_by, av.created_at, av.change_reason,
             av.is_current_version
      FROM announcement_versions av
      WHERE av.announcement_id = $1
      ORDER BY av.version_number DESC
    `;
    
    const result = await db.query(query, [req.params.id]);
    console.log('🔍 ANNOUNCEMENTS: Version history result:', result.rows.length, 'versions found');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ ANNOUNCEMENTS: Error fetching version history:', error);
    res.status(500).json({ error: 'Kunne ikke hente versjonshistorikk' });
  }
});

// Restore announcement to previous version (admin only)
router.post('/:id/restore/:versionId', authenticateUser, requireAdmin, async (req, res) => {
  console.log('🔍 ANNOUNCEMENTS: POST /:id/restore/:versionId - Restoring to version', req.params.versionId);
  try {
    const { reason } = req.body;
    
    // Get the version to restore
    const versionQuery = `
      SELECT title, message, type, is_active, expires_at, priority
      FROM announcement_versions
      WHERE id = $1 AND announcement_id = $2
    `;
    const versionResult = await db.query(versionQuery, [req.params.versionId, req.params.id]);
    
    if (versionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Versjon ikke funnet' });
    }
    
    const version = versionResult.rows[0];
    
    // Update the announcement
    const updateQuery = `
      UPDATE announcements 
      SET title = $1, message = $2, type = $3, is_active = $4, 
          expires_at = $5, priority = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    
    const updateResult = await db.query(updateQuery, [
      version.title,
      version.message,
      version.type,
      version.is_active,
      version.expires_at,
      version.priority,
      req.params.id
    ]);
    
    console.log('🔍 ANNOUNCEMENTS: Announcement restored to version', req.params.versionId);
    res.json(updateResult.rows[0]);
  } catch (error) {
    console.error('❌ ANNOUNCEMENTS: Error restoring version:', error);
    res.status(500).json({ error: 'Kunne ikke gjenopprette versjon' });
  }
});

module.exports = router;
