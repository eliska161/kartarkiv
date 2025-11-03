const express = require('express');
const router = express.Router();
const pool = require('../database/connection');
const { authenticateUser, requireSuperAdmin } = require('../middleware/auth-clerk-fixed');

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'admin', 'webmaster']);

const mapClubRow = (row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  subdomain: row.subdomain,
  contactName: row.contact_name,
  contactEmail: row.contact_email,
  contactPhone: row.contact_phone,
  billingName: row.billing_name,
  billingEmail: row.billing_email,
  billingAddress: row.billing_address,
  billingReference: row.billing_reference,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const ensureClubsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clubs (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      subdomain TEXT NOT NULL UNIQUE,
      contact_name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      contact_phone TEXT,
      billing_name TEXT,
      billing_email TEXT,
      billing_address TEXT,
      billing_reference TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS clubs_slug_unique ON clubs(slug)');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS clubs_subdomain_unique ON clubs(subdomain)');

  const columnMigrations = [
    "ALTER TABLE clubs ADD COLUMN IF NOT EXISTS billing_reference TEXT",
    "ALTER TABLE clubs ADD COLUMN IF NOT EXISTS notes TEXT",
    "ALTER TABLE clubs ADD COLUMN IF NOT EXISTS contact_phone TEXT",
    "ALTER TABLE clubs ADD COLUMN IF NOT EXISTS billing_name TEXT",
    "ALTER TABLE clubs ADD COLUMN IF NOT EXISTS billing_email TEXT",
    "ALTER TABLE clubs ADD COLUMN IF NOT EXISTS billing_address TEXT",
    "ALTER TABLE clubs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
  ];

  for (const statement of columnMigrations) {
    await pool.query(statement);
  }
};

ensureClubsTable().catch((error) => {
  console.error('❌ Failed to ensure clubs table exists:', error);
});

router.use(authenticateUser);
router.use(requireSuperAdmin);

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, slug, subdomain, contact_name, contact_email, contact_phone, billing_name, billing_email,
              billing_address, billing_reference, notes, created_at, updated_at
         FROM clubs
        ORDER BY name ASC`
    );

    res.json(rows.map(mapClubRow));
  } catch (error) {
    console.error('❌ Failed to fetch clubs:', error);
    res.status(500).json({ error: 'Kunne ikke hente klubber' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      name,
      subdomain,
      contactName,
      contactEmail,
      contactPhone,
      billingName,
      billingEmail,
      billingAddress,
      billingReference,
      notes,
    } = req.body || {};

    const trimmedName = String(name || '').trim();
    const normalizedSubdomain = String(subdomain || '').trim().toLowerCase();
    const normalizedSlug = normalizedSubdomain;
    const trimmedContactName = String(contactName || '').trim();
    const normalizedContactEmail = String(contactEmail || '').trim().toLowerCase();

    if (!trimmedName) {
      return res.status(400).json({ error: 'Klubbnavn er påkrevd.' });
    }

    if (!normalizedSubdomain || !SLUG_REGEX.test(normalizedSubdomain)) {
      return res.status(400).json({ error: 'Ugyldig subdomene. Bruk kun små bokstaver, tall og bindestrek.' });
    }

    if (RESERVED_SUBDOMAINS.has(normalizedSubdomain)) {
      return res.status(400).json({ error: 'Dette subdomenet er reservert for plattformen.' });
    }

    if (!trimmedContactName) {
      return res.status(400).json({ error: 'Kontaktperson er påkrevd.' });
    }

    if (!normalizedContactEmail) {
      return res.status(400).json({ error: 'Kontaktpersonens e-post er påkrevd.' });
    }

    const { rows: existing } = await pool.query(
      'SELECT id FROM clubs WHERE slug = $1 OR subdomain = $2',
      [normalizedSlug, normalizedSubdomain]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'En klubb med dette subdomenet finnes allerede.' });
    }

    const optional = (value) => {
      const trimmed = typeof value === 'string' ? value.trim() : '';
      return trimmed ? trimmed : null;
    };

    const result = await pool.query(
      `INSERT INTO clubs (
        name,
        slug,
        subdomain,
        contact_name,
        contact_email,
        contact_phone,
        billing_name,
        billing_email,
        billing_address,
        billing_reference,
        notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING id, name, slug, subdomain, contact_name, contact_email, contact_phone, billing_name, billing_email,
                billing_address, billing_reference, notes, created_at, updated_at`,
      [
        trimmedName,
        normalizedSlug,
        normalizedSubdomain,
        trimmedContactName,
        normalizedContactEmail,
        optional(contactPhone),
        optional(billingName),
        optional(billingEmail ? billingEmail.trim().toLowerCase() : null),
        optional(billingAddress),
        optional(billingReference),
        optional(notes),
      ]
    );

    res.status(201).json(mapClubRow(result.rows[0]));
  } catch (error) {
    console.error('❌ Failed to create club:', error);
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'En klubb med dette subdomenet finnes allerede.' });
    }
    res.status(500).json({ error: 'Kunne ikke opprette klubb' });
  }
});

module.exports = router;
