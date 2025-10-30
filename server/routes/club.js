const express = require('express');
const pool = require('../database/connection');
const { authenticateUser } = require('../middleware/auth-clerk-fixed');

const router = express.Router();

const formatClub = row => ({
  id: row.id,
  name: row.name,
  subdomain: row.subdomain,
  logo_url: row.logo_url,
  color: row.color,
  stripe_customer_id: row.stripe_customer_id,
  clerk_org_id: row.clerk_org_id,
  b2_prefix: row.b2_prefix,
  status: row.status,
  created_at: row.created_at
});

const sanitizeColor = value => {
  if (!value) {
    return null;
  }
  const normalized = String(value).trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized) ? normalized.toLowerCase() : null;
};

router.get('/', authenticateUser, async (req, res) => {
  try {
    if (!req.auth?.organizationId && !req.user?.isSuperAdmin) {
      return res.status(400).json({ error: 'Organization context is required.' });
    }

    const identifier = req.user?.isSuperAdmin && !req.auth?.organizationId
      ? req.query.organizationId
      : req.auth?.organizationId;

    if (!identifier) {
      return res.status(400).json({ error: 'Organization context is required.' });
    }

    const { rows } = await pool.query(
      `select id, name, subdomain, logo_url, color, stripe_customer_id, clerk_org_id, b2_prefix, status, created_at
       from clubs
       where clerk_org_id = $1
       limit 1`,
      [identifier]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Klubben finnes ikke.' });
    }

    return res.json({ club: formatClub(rows[0]) });
  } catch (error) {
    console.error('❌ Failed to fetch club profile:', error);
    return res.status(500).json({ error: 'Kunne ikke hente klubbprofilen.' });
  }
});

router.patch('/', authenticateUser, async (req, res) => {
  if (!req.user?.isAdmin && !req.user?.isSuperAdmin) {
    return res.status(403).json({ error: 'Administrator-tilgang kreves.' });
  }

  const organizationId = req.auth?.organizationId || req.query.organizationId;
  if (!organizationId) {
    return res.status(400).json({ error: 'Organization context is required.' });
  }

  const updates = [];
  const values = [];
  let index = 1;

  if (typeof req.body?.name === 'string' && req.body.name.trim()) {
    updates.push(`name = $${index++}`);
    values.push(req.body.name.trim());
  }

  if (typeof req.body?.logoUrl === 'string') {
    updates.push(`logo_url = $${index++}`);
    values.push(req.body.logoUrl.trim() || null);
  }

  if (req.body?.color) {
    const validatedColor = sanitizeColor(req.body.color);
    if (!validatedColor) {
      return res.status(400).json({ error: 'Ugyldig fargeformat. Bruk HEX-kode (#RRGGBB).' });
    }
    updates.push(`color = $${index++}`);
    values.push(validatedColor);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Ingen gyldige felter å oppdatere.' });
  }

  values.push(organizationId);

  try {
    await pool.query(`update clubs set ${updates.join(', ')} where clerk_org_id = $${index}`, values);

    const { rows } = await pool.query(
      `select id, name, subdomain, logo_url, color, stripe_customer_id, clerk_org_id, b2_prefix, status, created_at
       from clubs
       where clerk_org_id = $1
       limit 1`,
      [organizationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Klubben finnes ikke.' });
    }

    return res.json({ club: formatClub(rows[0]) });
  } catch (error) {
    console.error('❌ Failed to update club profile:', error);
    return res.status(500).json({ error: 'Kunne ikke oppdatere klubbprofilen.' });
  }
});

module.exports = router;
