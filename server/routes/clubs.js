const express = require('express');
const router = express.Router();
const pool = require('../database/connection');
const { createClerkClient } = require('@clerk/backend');
const { authenticateUser, requireSuperAdmin } = require('../middleware/auth-clerk-fixed');

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'admin', 'webmaster']);

const mapClubRow = (row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  subdomain: row.subdomain,
  organizationId: row.organization_id,
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
      slug TEXT,
      subdomain TEXT UNIQUE,
      organization_id TEXT,
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

  const ensureColumn = async (columnName, definition) => {
    const { rows } = await pool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'clubs' AND column_name = $1 LIMIT 1`,
      [columnName]
    );
    if (rows.length === 0) {
      await pool.query(`ALTER TABLE clubs ADD COLUMN ${columnName} ${definition}`);
    }
  };

  await ensureColumn('slug', 'TEXT');
  await ensureColumn('organization_id', 'TEXT');
  await ensureColumn('contact_phone', 'TEXT');
  await ensureColumn('billing_name', 'TEXT');
  await ensureColumn('billing_email', 'TEXT');
  await ensureColumn('billing_address', 'TEXT');
  await ensureColumn('billing_reference', 'TEXT');
  await ensureColumn('notes', 'TEXT');
  await ensureColumn('updated_at', "TIMESTAMPTZ NOT NULL DEFAULT NOW()");

  await pool.query(`
    UPDATE clubs
       SET slug = subdomain
     WHERE (slug IS NULL OR slug = '')
       AND subdomain IS NOT NULL
  `);

  const { rows: slugNullRows } = await pool.query(`SELECT COUNT(*)::int AS count FROM clubs WHERE slug IS NULL OR slug = ''`);
  if (slugNullRows[0]?.count === 0) {
    await pool.query(`ALTER TABLE clubs ALTER COLUMN slug SET NOT NULL`);
  }

  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS clubs_slug_unique ON clubs(slug)`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS clubs_subdomain_unique ON clubs(subdomain)`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS clubs_organization_unique ON clubs(organization_id) WHERE organization_id IS NOT NULL`);
};

ensureClubsTable().catch((error) => {
  console.error('❌ Failed to ensure clubs table exists:', error);
});

router.use(authenticateUser);
router.use(requireSuperAdmin);

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, slug, subdomain, organization_id, contact_name, contact_email, contact_phone, billing_name, billing_email,
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

const resolveClerkClient = () => {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error('Clerk secret key is not configured');
  }

  return createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });
};

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

    let clerkOrganization = null;
    try {
      const clerkClient = resolveClerkClient();
      clerkOrganization = await clerkClient.organizations.createOrganization({
        name: trimmedName,
        slug: normalizedSlug,
        publicMetadata: {
          subdomain: normalizedSubdomain,
          contactName: trimmedContactName,
          contactEmail: normalizedContactEmail,
          contactPhone: optional(contactPhone),
          billingName: optional(billingName),
          billingEmail: optional(billingEmail ? billingEmail.trim().toLowerCase() : null),
          billingAddress: optional(billingAddress),
          billingReference: optional(billingReference),
        },
      });
    } catch (clerkError) {
      console.error('❌ Failed to create Clerk organization:', clerkError);
      const message = clerkError?.errors?.[0]?.message || clerkError?.message;
      if (message && message.toLowerCase().includes('slug')) {
        return res.status(409).json({ error: 'Subdomene er allerede tatt i Clerk. Velg et annet subdomene.' });
      }
      return res.status(500).json({ error: 'Kunne ikke opprette klubben hos Clerk' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO clubs (
          name,
          slug,
          subdomain,
          organization_id,
          contact_name,
          contact_email,
          contact_phone,
          billing_name,
          billing_email,
          billing_address,
          billing_reference,
          notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING id, name, slug, subdomain, organization_id, contact_name, contact_email, contact_phone, billing_name, billing_email,
                  billing_address, billing_reference, notes, created_at, updated_at`,
        [
          trimmedName,
          normalizedSlug,
          normalizedSubdomain,
          clerkOrganization?.id || null,
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
      await client.query('COMMIT');

      const clubRow = mapClubRow(result.rows[0]);

      if (clerkOrganization?.id) {
        try {
          const clerkClient = resolveClerkClient();
          await clerkClient.organizations.updateOrganization(clerkOrganization.id, {
            publicMetadata: {
              ...clerkOrganization.publicMetadata,
              clubId: clubRow.id,
              clubDatabaseId: clubRow.id,
            },
          });
        } catch (metadataError) {
          console.warn('⚠️ Failed to update Clerk organization metadata:', metadataError);
        }
      }

      res.status(201).json(clubRow);
    } catch (dbError) {
      await client.query('ROLLBACK');
      if (clerkOrganization?.id) {
        try {
          const clerkClient = resolveClerkClient();
          await clerkClient.organizations.deleteOrganization(clerkOrganization.id);
        } catch (cleanupError) {
          console.error('⚠️ Failed to clean up Clerk organization after DB error:', cleanupError);
        }
      }
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Failed to create club:', error);
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'En klubb med dette subdomenet finnes allerede.' });
    }
    res.status(500).json({ error: 'Kunne ikke opprette klubb' });
  }
});

module.exports = router;
