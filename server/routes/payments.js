const express = require('express');
const pool = require('../database/connection');
const { authenticateUser, requireSuperAdmin } = require('../middleware/auth-clerk-fixed');

const router = express.Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const clientBaseUrl = process.env.CLIENT_BASE_URL || 'http://localhost:3000';
const stripeApiBase = 'https://api.stripe.com/v1';

const callStripe = async (method, path, params = null) => {
  if (!stripeSecretKey) {
    throw new Error('Stripe er ikke konfigurert');
  }

  const headers = {
    Authorization: `Bearer ${stripeSecretKey}`
  };

  let body;
  if (params) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = params.toString();
  }

  if (typeof globalThis.fetch !== 'function') {
    throw new Error('Fetch API is not available in this environment');
  }

  const response = await globalThis.fetch(`${stripeApiBase}${path}`, {
    method,
    headers,
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Stripe API error (${response.status}): ${text}`);
  }

  return response.json();
};

const ensureTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS club_invoices (
      id SERIAL PRIMARY KEY,
      month VARCHAR(7) NOT NULL,
      due_date DATE,
      notes TEXT,
      total_amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_by VARCHAR(255) NOT NULL,
      created_by_email TEXT,
      stripe_session_id TEXT,
      stripe_payment_intent TEXT,
      invoice_requested_at TIMESTAMP,
      invoice_requested_by TEXT,
      invoice_request_email TEXT,
      invoice_request_name TEXT,
      invoice_request_phone TEXT,
      stripe_invoice_id TEXT,
      stripe_customer_id TEXT,
      stripe_invoice_url TEXT,
      stripe_invoice_pdf TEXT,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS club_invoice_items (
      id SERIAL PRIMARY KEY,
      invoice_id INTEGER NOT NULL REFERENCES club_invoices(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1
    )
  `);

  await pool.query('ALTER TABLE club_invoices ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT');
  await pool.query('ALTER TABLE club_invoices ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT');
  await pool.query('ALTER TABLE club_invoices ADD COLUMN IF NOT EXISTS stripe_invoice_url TEXT');
  await pool.query('ALTER TABLE club_invoices ADD COLUMN IF NOT EXISTS stripe_invoice_pdf TEXT');
  await pool.query('ALTER TABLE club_invoices ADD COLUMN IF NOT EXISTS invoice_request_name TEXT');
  await pool.query('ALTER TABLE club_invoices ADD COLUMN IF NOT EXISTS invoice_request_phone TEXT');
};

ensureTables().catch(error => {
  console.error('❌ Failed to ensure payment tables exist:', error);
});

const getInvoices = async (invoiceId = null) => {
  const params = [];
  let whereClause = '';
  if (invoiceId) {
    params.push(invoiceId);
    whereClause = 'WHERE i.id = $1';
  }

  const { rows } = await pool.query(
    `
      SELECT
        i.id,
        i.month,
        i.due_date,
        i.notes,
        i.total_amount_cents,
        i.status,
        i.created_by,
        i.created_by_email,
        i.stripe_session_id,
        i.stripe_payment_intent,
        i.stripe_invoice_id,
        i.stripe_customer_id,
        i.stripe_invoice_url,
        i.stripe_invoice_pdf,
        i.invoice_requested_at,
        i.invoice_requested_by,
        i.invoice_request_email,
        i.invoice_request_name,
        i.invoice_request_phone,
        i.created_at,
        i.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ii.id,
              'description', ii.description,
              'amount_cents', ii.amount_cents,
              'quantity', ii.quantity
            )
          ) FILTER (WHERE ii.id IS NOT NULL),
          '[]'
        ) AS items
      FROM club_invoices i
      LEFT JOIN club_invoice_items ii ON ii.invoice_id = i.id
      ${whereClause}
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `,
    params
  );

  const invoices = rows.map(row => {
    const items = Array.isArray(row.items) ? row.items : [];

    return {
      ...row,
      total_amount: row.total_amount_cents / 100,
      items: items.map(item => ({
        ...item,
        amount: item.amount_cents / 100
      }))
    };
  });

  if (!stripeSecretKey) {
    return invoices;
  }

  const syncedInvoices = [];

  for (const invoice of invoices) {
    if (invoice.status !== 'paid' && invoice.stripe_invoice_id) {
      try {
        const stripeInvoice = await callStripe('GET', `/invoices/${invoice.stripe_invoice_id}`);

        const isPaid = stripeInvoice?.status === 'paid' || Boolean(stripeInvoice?.paid);

        if (isPaid) {
          const hostedUrl = stripeInvoice.hosted_invoice_url || null;
          const pdfUrl = stripeInvoice.invoice_pdf || null;

          const { rows: updateRows } = await pool.query(
            `
              UPDATE club_invoices
              SET status = 'paid',
                  stripe_invoice_url = $1,
                  stripe_invoice_pdf = $2,
                  updated_at = NOW()
              WHERE id = $3
              RETURNING updated_at
            `,
            [hostedUrl, pdfUrl, invoice.id]
          );

          invoice.status = 'paid';
          invoice.stripe_invoice_url = hostedUrl;
          invoice.stripe_invoice_pdf = pdfUrl;
          if (updateRows[0]?.updated_at) {
            invoice.updated_at = updateRows[0].updated_at;
          }
        }
      } catch (statusError) {
        console.warn('⚠️ Could not refresh Stripe invoice status:', statusError);
      }
    }

    syncedInvoices.push(invoice);
  }

  return syncedInvoices;
};

const createStripeInvoiceForClub = async (invoice, { email, name, phone }) => {
  const customerParams = new URLSearchParams();
  customerParams.append('email', email);
  customerParams.append('metadata[invoiceId]', String(invoice.id));
  customerParams.append('name', name);
  if (phone) {
    customerParams.append('phone', phone);
  }

  const customer = await callStripe('POST', '/customers', customerParams);

  const invoiceParams = new URLSearchParams();
  invoiceParams.append('customer', customer.id);
  invoiceParams.append('collection_method', 'send_invoice');
  invoiceParams.append('auto_advance', 'true');
  invoiceParams.append('metadata[invoiceId]', String(invoice.id));
  invoiceParams.append('metadata[contactName]', name);
  if (phone) {
    invoiceParams.append('metadata[contactPhone]', phone);
  }
  invoiceParams.append('description', invoice.notes || `Kartarkiv ${invoice.month}`);

  const unixDueDate = invoice.due_date ? Math.floor(new Date(invoice.due_date).getTime() / 1000) : null;
  if (unixDueDate) {
    invoiceParams.append('due_date', String(unixDueDate));
  } else {
    invoiceParams.append('days_until_due', '14');
  }

  const stripeInvoice = await callStripe('POST', '/invoices', invoiceParams);

  for (const [index, item] of invoice.items.entries()) {
    const invoiceItemParams = new URLSearchParams();
    invoiceItemParams.append('invoice', stripeInvoice.id);
    invoiceItemParams.append('customer', customer.id);
    const rawQuantity = Number(item.quantity || 1);
    const safeQuantity = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1;
    const formattedDescription =
      safeQuantity > 1 ? `${item.description} (x${safeQuantity})` : item.description;
    invoiceItemParams.append('description', formattedDescription);
    invoiceItemParams.append('metadata[invoiceId]', String(invoice.id));
    invoiceItemParams.append('metadata[lineItemIndex]', String(index));
    const totalAmountCents = Math.round(item.amount * 100) * safeQuantity;
    invoiceItemParams.append('amount', String(totalAmountCents));
    invoiceItemParams.append('currency', 'nok');
    await callStripe('POST', '/invoiceitems', invoiceItemParams);
  }

  await callStripe('POST', `/invoices/${stripeInvoice.id}/finalize`);
  await callStripe('POST', `/invoices/${stripeInvoice.id}/send`);

  const refreshedStripeInvoice = await callStripe('GET', `/invoices/${stripeInvoice.id}`);

  return {
    stripeInvoiceId: refreshedStripeInvoice.id,
    stripeCustomerId: refreshedStripeInvoice.customer || customer.id,
    stripeInvoiceUrl: refreshedStripeInvoice.hosted_invoice_url || null,
    stripeInvoicePdf: refreshedStripeInvoice.invoice_pdf || null
  };
};

router.get('/invoices', authenticateUser, async (req, res) => {
  try {
    const invoices = await getInvoices();
    res.json({ invoices });
  } catch (error) {
    console.error('❌ Failed to fetch invoices:', error);
    res.status(500).json({ error: 'Kunne ikke hente fakturaer' });
  }
});

router.post('/invoices', authenticateUser, requireSuperAdmin, async (req, res) => {
  const { month, dueDate, notes, items } = req.body;

  if (!month) {
    return res.status(400).json({ error: 'Måned er påkrevd' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Legg til minst én kostnadslinje' });
  }

  const normalizedItems = items.map(item => ({
    description: String(item.description || '').trim(),
    amount: Number(item.amount || 0),
    quantity: Number(item.quantity || 1)
  })).filter(item => item.description && item.amount > 0 && item.quantity > 0);

  if (normalizedItems.length === 0) {
    return res.status(400).json({ error: 'Hver linje må ha beskrivelse og beløp' });
  }

  const totalAmountCents = normalizedItems.reduce((sum, item) => {
    return sum + Math.round(item.amount * 100) * item.quantity;
  }, 0);

  if (totalAmountCents <= 0) {
    return res.status(400).json({ error: 'Totalbeløpet må være større enn 0' });
  }

  try {
    const { rows } = await pool.query(
      `
        INSERT INTO club_invoices (
          month, due_date, notes, total_amount_cents, status, created_by, created_by_email
        ) VALUES ($1, $2, $3, $4, 'pending', $5, $6)
        RETURNING *
      `,
      [month, dueDate || null, notes || null, totalAmountCents, req.user.id, req.user.email]
    );

    const invoice = rows[0];

    for (const item of normalizedItems) {
      await pool.query(
        `
          INSERT INTO club_invoice_items (invoice_id, description, amount_cents, quantity)
          VALUES ($1, $2, $3, $4)
        `,
        [invoice.id, item.description, Math.round(item.amount * 100), item.quantity]
      );
    }

    const [createdInvoice] = await getInvoices(invoice.id);

    res.status(201).json({ invoice: createdInvoice });
  } catch (error) {
    console.error('❌ Failed to create invoice:', error);
    res.status(500).json({ error: 'Kunne ikke opprette faktura' });
  }
});

router.post('/invoices/:invoiceId/checkout', authenticateUser, async (req, res) => {
  if (!stripeSecretKey) {
    return res.status(500).json({ error: 'Stripe er ikke konfigurert' });
  }

  const invoiceId = Number(req.params.invoiceId);
  if (!Number.isInteger(invoiceId)) {
    return res.status(400).json({ error: 'Ugyldig faktura-ID' });
  }

  try {
    const [invoice] = await getInvoices(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Fant ikke faktura' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Fakturaen er allerede betalt' });
    }

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('customer_email', req.user.email || '');
    params.append(
      'success_url',
      `${clientBaseUrl}/admin/betaling/fullfort?invoiceId=${invoice.id}&session_id={CHECKOUT_SESSION_ID}`
    );
    params.append('cancel_url', `${clientBaseUrl}/admin/betaling?cancelled=true&invoiceId=${invoice.id}`);
    params.append('metadata[invoiceId]', String(invoice.id));
    params.append('payment_method_types[]', 'card');

    invoice.items.forEach((item, index) => {
      params.append(`line_items[${index}][price_data][currency]`, 'nok');
      params.append(`line_items[${index}][price_data][product_data][name]`, item.description);
      params.append(`line_items[${index}][price_data][unit_amount]`, String(Math.round(item.amount * 100)));
      params.append(`line_items[${index}][quantity]`, String(item.quantity));
    });

    const session = await callStripe('POST', '/checkout/sessions', params);

    await pool.query(
      `
        UPDATE club_invoices
        SET stripe_session_id = $1,
            updated_at = NOW()
        WHERE id = $2
      `,
      [session.id, invoice.id]
    );

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('❌ Failed to create Stripe session:', error);
    res.status(500).json({ error: 'Kunne ikke starte betaling' });
  }
});

router.post('/checkout/confirm', authenticateUser, async (req, res) => {
  if (!stripeSecretKey) {
    return res.status(500).json({ error: 'Stripe er ikke konfigurert' });
  }

  const { sessionId, invoiceId } = req.body;

  if (!sessionId || !invoiceId) {
    return res.status(400).json({ error: 'Mangler sessionId eller invoiceId' });
  }

  try {
    const session = await callStripe('GET', `/checkout/sessions/${sessionId}`);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Betalingen er ikke fullført ennå' });
    }

    const paymentIntentId = session.payment_intent;

    await pool.query(
      `
        UPDATE club_invoices
        SET status = 'paid',
            stripe_payment_intent = $1,
            updated_at = NOW()
        WHERE id = $2
      `,
      [paymentIntentId || null, invoiceId]
    );

    const [invoice] = await getInvoices(invoiceId);

    res.json({ invoice });
  } catch (error) {
    console.error('❌ Failed to confirm Stripe payment:', error);
    res.status(500).json({ error: 'Kunne ikke bekrefte betaling' });
  }
});

router.post('/invoices/:invoiceId/request-invoice', authenticateUser, async (req, res) => {
  if (!stripeSecretKey) {
    return res.status(500).json({ error: 'Stripe er ikke konfigurert' });
  }

  const invoiceId = Number(req.params.invoiceId);
  const { contactEmail, contactName, contactPhone } = req.body || {};

  if (!Number.isInteger(invoiceId)) {
    return res.status(400).json({ error: 'Ugyldig faktura-ID' });
  }

  const normalizedEmail = String(contactEmail || req.user.email || '').trim();
  const normalizedName = String(contactName || '').trim();
  const normalizedPhoneRaw = contactPhone == null ? '' : String(contactPhone).trim();
  const normalizedPhone = normalizedPhoneRaw || null;
  if (!normalizedEmail) {
    return res.status(400).json({ error: 'Oppgi e-postadressen fakturaen skal sendes til' });
  }

  if (!normalizedName) {
    return res.status(400).json({ error: 'Oppgi navnet eller bedriften som skal stå på fakturaen' });
  }

  try {
    const [invoice] = await getInvoices(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Fant ikke faktura' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Fakturaen er allerede betalt' });
    }

    const unixDueDate = invoice.due_date ? Math.floor(new Date(invoice.due_date).getTime() / 1000) : null;

    let stripeInvoiceId = invoice.stripe_invoice_id;
    let stripeCustomerId = invoice.stripe_customer_id;
    let stripeInvoiceUrl = invoice.stripe_invoice_url;
    let stripeInvoicePdf = invoice.stripe_invoice_pdf;

    let existingStripeInvoice = null;
    if (stripeInvoiceId) {
      try {
        existingStripeInvoice = await callStripe('GET', `/invoices/${stripeInvoiceId}`);
      } catch (fetchError) {
        console.warn('⚠️ Could not fetch existing Stripe invoice, recreating it instead:', fetchError);
        existingStripeInvoice = null;
        stripeInvoiceId = null;
      }
    }

    if (!stripeCustomerId && existingStripeInvoice && existingStripeInvoice.customer) {
      stripeCustomerId = existingStripeInvoice.customer;
    }

    if (!stripeInvoiceId || !existingStripeInvoice || !stripeCustomerId) {
      if (stripeInvoiceId && existingStripeInvoice && !existingStripeInvoice.customer) {
        try {
          await callStripe('POST', `/invoices/${stripeInvoiceId}/void`);
        } catch (voidError) {
          console.warn('⚠️ Failed to void incomplete Stripe invoice before recreating:', voidError);
        }
      }

      const createdInvoice = await createStripeInvoiceForClub(invoice, {
        email: normalizedEmail,
        name: normalizedName,
        phone: normalizedPhone
      });

      stripeInvoiceId = createdInvoice.stripeInvoiceId;
      stripeCustomerId = createdInvoice.stripeCustomerId;
      stripeInvoiceUrl = createdInvoice.stripeInvoiceUrl;
      stripeInvoicePdf = createdInvoice.stripeInvoicePdf;
    } else {
      const customerParams = new URLSearchParams();
      customerParams.append('email', normalizedEmail);
      customerParams.append('name', normalizedName);
      if (normalizedPhone) {
        customerParams.append('phone', normalizedPhone);
      }
      await callStripe('POST', `/customers/${stripeCustomerId}`, customerParams);

      const updateInvoiceParams = new URLSearchParams();
      updateInvoiceParams.append('customer', stripeCustomerId);
      updateInvoiceParams.append('description', invoice.notes || `Kartarkiv ${invoice.month}`);
      if (unixDueDate) {
        updateInvoiceParams.append('due_date', String(unixDueDate));
      } else {
        updateInvoiceParams.append('days_until_due', '14');
      }

      await callStripe('POST', `/invoices/${stripeInvoiceId}`, updateInvoiceParams);
      await callStripe('POST', `/invoices/${stripeInvoiceId}/send`);
      const refreshedStripeInvoice = await callStripe('GET', `/invoices/${stripeInvoiceId}`);
      stripeInvoiceUrl = refreshedStripeInvoice.hosted_invoice_url || null;
      stripeInvoicePdf = refreshedStripeInvoice.invoice_pdf || null;
      stripeCustomerId = refreshedStripeInvoice.customer || stripeCustomerId;
    }

    const { rows } = await pool.query(
      `
        UPDATE club_invoices
        SET status = 'invoice_requested',
            invoice_requested_at = NOW(),
            invoice_requested_by = $1,
            invoice_request_email = $2,
            invoice_request_name = $3,
            invoice_request_phone = $4,
            stripe_invoice_id = $5,
            stripe_customer_id = $6,
            stripe_invoice_url = $7,
            stripe_invoice_pdf = $8,
            updated_at = NOW()
        WHERE id = $9
        RETURNING *
      `,
      [
        req.user.email,
        normalizedEmail,
        normalizedName,
        normalizedPhone,
        stripeInvoiceId,
        stripeCustomerId,
        stripeInvoiceUrl,
        stripeInvoicePdf,
        invoiceId
      ]
    );

    const updated = rows[0];
    const [fullInvoice] = await getInvoices(updated.id);

    res.json({ invoice: fullInvoice });
  } catch (error) {
    console.error('❌ Failed to request invoice send-out:', error);
    res.status(500).json({ error: 'Kunne ikke sende faktura' });
  }
});

module.exports = router;
