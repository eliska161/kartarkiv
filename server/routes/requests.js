const express = require('express');
const { body, validationResult } = require('express-validator');
const { createClerkClient } = require('@clerk/backend');
const Stripe = require('stripe');
const { randomUUID } = require('crypto');
const pool = require('../database/connection');
const { authenticateUser, requireSuperAdmin } = require('../middleware/auth-clerk-fixed');
const { slugify } = require('../utils/slugify');

const router = express.Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeClient = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
  : null;

const ensureClerkClient = () => {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error('Clerk secret key is not configured');
  }
  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
};

const formatAccessRequest = row => ({
  id: row.id,
  club_name: row.club_name,
  contact_name: row.contact_name,
  contact_email: row.contact_email,
  expected_size_gb: row.expected_size_gb,
  message: row.message,
  status: row.status,
  decision_reason: row.decision_reason,
  decided_at: row.decided_at,
  club_id: row.club_id,
  created_at: row.created_at,
  club: row.club_id
    ? {
        id: row.club_id,
        name: row.club_name_resolved || row.club_name,
        subdomain: row.club_subdomain || null,
        status: row.club_status || null
      }
    : null
});

const sanitizeStatus = status => {
  if (!status) {
    return null;
  }
  const normalized = String(status).toLowerCase();
  return ['pending', 'approved', 'rejected'].includes(normalized) ? normalized : null;
};

const ensureUniqueSubdomain = async (client, base) => {
  let candidate = base;
  let suffix = 1;
  while (true) {
    const { rows } = await client.query('select 1 from clubs where subdomain = $1 limit 1', [candidate]);
    if (rows.length === 0) {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
};

const createOrganizationWithFallback = async (clerkClient, name, baseSlug) => {
  let attempt = baseSlug;
  let suffix = 1;
  while (suffix < 10) {
    try {
      const organization = await clerkClient.organizations.createOrganization({
        name,
        slug: attempt,
        publicMetadata: {
          displayName: name
        }
      });
      return { organization, slug: attempt };
    } catch (error) {
      const clerkErrors = Array.isArray(error?.errors) ? error.errors.map(err => err.code || err.message) : [];
      const isSlugConflict = clerkErrors.some(code => typeof code === 'string' && code.includes('slug'));
      if (isSlugConflict) {
        attempt = `${baseSlug}-${suffix}`;
        suffix += 1;
        continue;
      }
      throw error;
    }
  }
  throw new Error('Unable to create unique Clerk organization slug');
};

const maybeCreateStripeCustomer = async ({ name, email, clubId }) => {
  if (!stripeClient) {
    console.warn('⚠️ Stripe secret key missing; skipping customer creation');
    return null;
  }
  return stripeClient.customers.create({
    name,
    email,
    metadata: {
      clubName: name,
      contactEmail: email,
      clubId: clubId || '',
      source: 'kartarkiv-access-request'
    }
  });
};

const sendInvitations = async (clerkClient, organizationId, invites = [], inviterUserId) => {
  if (!Array.isArray(invites) || invites.length === 0) {
    return [];
  }

  const uniqueEmails = Array.from(
    new Set(
      invites
        .map(invite => invite?.email || invite?.emailAddress || invite?.contact_email)
        .filter(Boolean)
        .map(email => String(email).toLowerCase())
    )
  );

  return Promise.all(
    uniqueEmails.map(async email => {
      const requested = invites.find(invite =>
        String(invite?.email || invite?.emailAddress || invite?.contact_email).toLowerCase() === email
      );
      const role = requested?.role || requested?.orgRole || 'admin';

      try {
        return await clerkClient.organizations.createOrganizationInvitation({
          organizationId,
          emailAddress: email,
          role,
          inviterUserId
        });
      } catch (inviteError) {
        console.error('❌ Failed to send Clerk invitation', { email, role, error: inviteError });
        return null;
      }
    })
  );
};

router.post(
  '/',
  [
    body('club_name').isString().trim().notEmpty(),
    body('contact_name').isString().trim().notEmpty(),
    body('contact_email').isEmail().normalizeEmail(),
    body('expected_size_gb').optional({ checkFalsy: true }).isNumeric(),
    body('message').optional({ checkFalsy: true }).isString()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Ugyldige inputdata', details: errors.array() });
    }

    const { club_name, contact_name, contact_email, expected_size_gb, message } = req.body || {};

    try {
      const query = `
        INSERT INTO access_requests (club_name, contact_name, contact_email, expected_size_gb, message)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, status, created_at
      `;

      const values = [
        club_name.trim(),
        contact_name.trim(),
        contact_email.trim(),
        typeof expected_size_gb === 'number' && !Number.isNaN(expected_size_gb) ? expected_size_gb : null,
        message ? message.trim() : null
      ];

      const { rows } = await pool.query(query, values);

      return res.status(201).json({
        id: rows[0]?.id,
        status: rows[0]?.status,
        created_at: rows[0]?.created_at
      });
    } catch (error) {
      console.error('Feil ved lagring av tilgangsforespørsel:', error);
      return res.status(500).json({ error: 'Kunne ikke lagre forespørselen. Prøv igjen senere.' });
    }
  }
);

router.get('/', authenticateUser, requireSuperAdmin, async (req, res) => {
  try {
    const statusFilter = sanitizeStatus(req.query.status);
    const values = [];
    let query = `
      select
        ar.*,
        c.name as club_name_resolved,
        c.subdomain as club_subdomain,
        c.status as club_status
      from access_requests ar
      left join clubs c on ar.club_id = c.id
    `;

    if (statusFilter) {
      query += ' where ar.status = $1';
      values.push(statusFilter);
    }

    query += ' order by ar.created_at desc';

    const { rows } = await pool.query(query, values);

    return res.json({
      requests: rows.map(formatAccessRequest)
    });
  } catch (error) {
    console.error('❌ Failed to fetch access requests:', error);
    return res.status(500).json({ error: 'Kunne ikke hente forespørsler.' });
  }
});

router.post('/:id/approve', authenticateUser, requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    clubName,
    subdomain,
    color,
    logoUrl,
    invites = [],
    decisionReason
  } = req.body || {};

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: requestRows } = await client.query('select * from access_requests where id = $1 for update', [id]);
    if (requestRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Forespørselen finnes ikke.' });
    }

    const requestRow = requestRows[0];
    if (requestRow.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Forespørselen er allerede behandlet.' });
    }

    const resolvedName = (clubName || requestRow.club_name || '').trim();
    if (!resolvedName) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Klubbnavn mangler.' });
    }

    const baseSlug = slugify(subdomain || resolvedName);
    const uniqueSubdomain = await ensureUniqueSubdomain(client, baseSlug);

    const clerkClient = ensureClerkClient();
    const { organization, slug: organizationSlug } = await createOrganizationWithFallback(clerkClient, resolvedName, uniqueSubdomain);

    const b2Prefix = req.body?.b2Prefix || `clubs/${organizationSlug}-${randomUUID().slice(0, 8)}`;

    const { rows: clubRows } = await client.query(
      `insert into clubs (name, subdomain, color, logo_url, stripe_customer_id, clerk_org_id, b2_prefix, status)
       values ($1, $2, $3, $4, $5, $6, $7, 'active')
       returning id, name, subdomain, color, logo_url, stripe_customer_id, clerk_org_id, b2_prefix, status, created_at`,
      [
        resolvedName,
        organizationSlug,
        color || '#109771',
        logoUrl || null,
        null,
        organization.id,
        b2Prefix
      ]
    );

    let club = clubRows[0];

    try {
      const stripeCustomer = await maybeCreateStripeCustomer({
        name: resolvedName,
        email: requestRow.contact_email,
        clubId: club.id
      });

      if (stripeCustomer?.id) {
        await client.query('update clubs set stripe_customer_id = $1 where id = $2', [stripeCustomer.id, club.id]);
        club = { ...club, stripe_customer_id: stripeCustomer.id };
      }
    } catch (stripeError) {
      console.error('⚠️ Failed to create Stripe customer during approval:', stripeError);
    }

    await client.query(
      `update access_requests
         set status = 'approved',
             decided_at = now(),
             decision_reason = $2,
             club_id = $3
       where id = $1`,
      [id, decisionReason || null, club.id]
    );

    await client.query('COMMIT');

    const finalInvites = Array.isArray(invites) && invites.length > 0
      ? invites
      : [{ email: requestRow.contact_email, role: 'admin' }];

    await sendInvitations(clerkClient, organization.id, finalInvites, req.user.id);

    return res.json({
      club,
      organization: {
        id: organization.id,
        slug: organization.slug,
        name: organization.name
      },
      stripeCustomerId: club.stripe_customer_id || null
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to approve access request:', error);
    return res.status(500).json({ error: 'Kunne ikke godkjenne forespørselen.' });
  } finally {
    client.release();
  }
});

router.post('/:id/reject', authenticateUser, requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};

  try {
    const { rows } = await pool.query('select status from access_requests where id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Forespørselen finnes ikke.' });
    }
    if (rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Forespørselen er allerede behandlet.' });
    }

    await pool.query(
      `update access_requests
         set status = 'rejected',
             decision_reason = $2,
             decided_at = now()
       where id = $1`,
      [id, reason || null]
    );

    return res.json({ status: 'rejected' });
  } catch (error) {
    console.error('❌ Failed to reject access request:', error);
    return res.status(500).json({ error: 'Kunne ikke avvise forespørselen.' });
  }
});

module.exports = router;
