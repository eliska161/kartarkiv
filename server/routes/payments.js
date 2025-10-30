const express = require('express');
const pool = require('../database/connection');
const { authenticateUser, requireSuperAdmin } = require('../middleware/auth-clerk-fixed');

const router = express.Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const clientBaseUrl = process.env.CLIENT_BASE_URL || 'http://localhost:3000';
const stripeApiBase = 'https://api.stripe.com/v1';

const STRIPE_FEE_DESCRIPTION = 'Stripe-gebyr';
const STRIPE_LOCALE = 'nb';
const STRIPE_FEE_PERCENT_NUMERATOR = 24; // 2.4%
const STRIPE_FEE_PERCENT_DENOMINATOR = 1000;
const STRIPE_FEE_FIXED_CENTS = 200; // NOK 2,00

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

const COUNTRY_CODE = 'NO';

const calculateStripeFeeCents = totalWithoutFeeCents => {
  if (!totalWithoutFeeCents || totalWithoutFeeCents <= 0) {
    return 0;
  }

  const percentFee = Math.round((totalWithoutFeeCents * STRIPE_FEE_PERCENT_NUMERATOR) / STRIPE_FEE_PERCENT_DENOMINATOR);
  return percentFee + STRIPE_FEE_FIXED_CENTS;
};

const computeStripeDueDateSeconds = dueDateValue => {
  if (!dueDateValue) {
    return null;
  }

  const parsed = new Date(dueDateValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const endOfDayMillis = parsed.getTime() + (23 * 60 * 60 + 59 * 60 + 59) * 1000;
  const minimumFutureMillis = Date.now() + 60 * 60 * 1000; // At least one hour from now
  const safeDueDateMillis = Math.max(endOfDayMillis, minimumFutureMillis);

  return Math.floor(safeDueDateMillis / 1000);
};

const parseAddressForStripe = address => {
  if (!address) {
    return {};
  }

  const rawSegments = String(address)
    .split(/\n|,/)
    .map(segment => segment.trim())
    .filter(Boolean);

  if (rawSegments.length === 0) {
    return {};
  }

  const [line1, ...tailSegments] = rawSegments;
  const normalizedSegments = tailSegments.map(segment => segment.replace(/\s+/g, ' ').trim()).filter(Boolean);

  const countryIndices = normalizedSegments
    .map((segment, index) => ({ segment: segment.toLowerCase(), index }))
    .filter(({ segment }) => segment === 'norge' || segment === 'norway')
    .map(({ index }) => index);

  let postalCode;
  let postalIndex = -1;
  normalizedSegments.forEach((segment, index) => {
    if (postalIndex !== -1) {
      return;
    }
    const match = segment.match(/(\d{4})/);
    if (match) {
      postalCode = match[1];
      postalIndex = index;
    }
  });

  const sanitize = value =>
    value
      .replace(/[^\p{L}\p{M}\s-]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

  let city;
  let cityIndex = -1;

  if (postalIndex !== -1) {
    const segment = normalizedSegments[postalIndex];
    const afterPostal = sanitize(segment.replace(postalCode, ''));
    if (afterPostal) {
      city = afterPostal;
      cityIndex = postalIndex;
    }
  }

  if (!city && postalIndex !== -1) {
    const nextIndex = postalIndex + 1;
    if (nextIndex < normalizedSegments.length && !countryIndices.includes(nextIndex)) {
      const nextSegment = normalizedSegments[nextIndex];
      if (!/\d/.test(nextSegment)) {
        city = sanitize(nextSegment);
        cityIndex = nextIndex;
      }
    }
  }

  if (!city) {
    for (let index = 0; index < normalizedSegments.length; index += 1) {
      if (countryIndices.includes(index) || /\d/.test(normalizedSegments[index])) {
        continue;
      }
      city = sanitize(normalizedSegments[index]);
      cityIndex = index;
      break;
    }
  }

  const line2Parts = normalizedSegments
    .map((segment, index) => ({ segment, index }))
    .filter(({ index }) => index !== postalIndex && index !== cityIndex && !countryIndices.includes(index))
    .map(({ segment }) => sanitize(segment))
    .filter(part => Boolean(part) && part !== line1 && part !== city);

  const seen = new Set();
  const uniqueLine2Parts = [];
  for (const part of line2Parts) {
    if (!seen.has(part)) {
      seen.add(part);
      uniqueLine2Parts.push(part);
    }
  }

  const line2 = uniqueLine2Parts.length > 0 ? uniqueLine2Parts.join(', ') : undefined;

  return {
    line1,
    line2,
    postal_code: postalCode,
    city: city || undefined
  };
};

const applyStripeAddressParams = (params, address) => {
  if (!params || !address) {
    return;
  }

  const { line1, line2, postal_code, city } = parseAddressForStripe(address);
  if (line1) {
    params.append('address[line1]', line1);
  }
  if (line2 && line2 !== line1 && line2 !== city) {
    params.append('address[line2]', line2);
  }
  if (postal_code) {
    params.append('address[postal_code]', postal_code);
  }
  if (city) {
    params.append('address[city]', city);
  }
  params.append('address[country]', COUNTRY_CODE);
};

const ensureStripeFeeForInvoice = async invoice => {
  if (!invoice || !Array.isArray(invoice.items)) {
    return invoice;
  }

  const normalizedDescription = STRIPE_FEE_DESCRIPTION.toLowerCase();
  let feeItem = invoice.items.find(item => (item.description || '').toLowerCase() === normalizedDescription) || null;

  const itemsWithoutFee = feeItem
    ? invoice.items.filter(item => item !== feeItem)
    : invoice.items;

  const baseTotalCents = itemsWithoutFee.reduce((sum, item) => {
    const amountCents = Number.isFinite(item.amount_cents)
      ? Number(item.amount_cents)
      : Math.round(Number(item.amount || 0) * 100);
    const quantity = Number.isFinite(item.quantity) && item.quantity > 0 ? Number(item.quantity) : 1;
    return sum + amountCents * quantity;
  }, 0);

  if (baseTotalCents <= 0) {
    return invoice;
  }

  const desiredFeeCents = calculateStripeFeeCents(baseTotalCents);
  if (desiredFeeCents <= 0) {
    return invoice;
  }

  if (!feeItem) {
    const { rows: feeRows } = await pool.query(
      `
        WITH existing AS (
          SELECT id, amount_cents, quantity
          FROM club_invoice_items
          WHERE invoice_id = $1 AND description = $2
          LIMIT 1
        ),
        inserted AS (
          INSERT INTO club_invoice_items (invoice_id, description, amount_cents, quantity)
          SELECT $1, $2, $3, 1
          WHERE NOT EXISTS (SELECT 1 FROM existing)
          RETURNING id, amount_cents, quantity, TRUE AS inserted
        )
        SELECT id, amount_cents, quantity, inserted
        FROM inserted
        UNION ALL
        SELECT id, amount_cents, quantity, FALSE AS inserted
        FROM existing
        LIMIT 1
      `,
      [invoice.id, STRIPE_FEE_DESCRIPTION, desiredFeeCents]
    );

    const feeRow = feeRows[0];
    if (!feeRow) {
      return invoice;
    }

    if (!feeRow.inserted && (Number(feeRow.amount_cents) !== desiredFeeCents || Number(feeRow.quantity) !== 1)) {
      await pool.query(
        `UPDATE club_invoice_items SET amount_cents = $1, quantity = 1 WHERE id = $2`,
        [desiredFeeCents, feeRow.id]
      );
    }

    feeItem = {
      id: feeRow.id,
      description: STRIPE_FEE_DESCRIPTION,
      amount_cents: desiredFeeCents,
      amount: desiredFeeCents / 100,
      quantity: 1
    };

    invoice.items.push(feeItem);
  } else {
    const needsUpdate =
      Number(feeItem.amount_cents) !== desiredFeeCents || Number(feeItem.quantity) !== 1;

    if (needsUpdate) {
      await pool.query(
        `UPDATE club_invoice_items SET amount_cents = $1, quantity = 1 WHERE id = $2`,
        [desiredFeeCents, feeItem.id]
      );
      feeItem.amount_cents = desiredFeeCents;
    }

    feeItem.amount = desiredFeeCents / 100;
    feeItem.quantity = 1;
  }

  const targetTotalCents = baseTotalCents + desiredFeeCents;

  const { rows: updatedRows } = await pool.query(
    `
      UPDATE club_invoices
      SET total_amount_cents = $1,
          updated_at = CASE WHEN total_amount_cents = $1 THEN updated_at ELSE NOW() END
      WHERE id = $2
      RETURNING total_amount_cents, updated_at
    `,
    [targetTotalCents, invoice.id]
  );

  invoice.total_amount = (updatedRows[0]?.total_amount_cents ?? targetTotalCents) / 100;
  if (updatedRows[0]?.updated_at) {
    invoice.updated_at = updatedRows[0].updated_at;
  }

  return invoice;
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
      invoice_request_address TEXT,
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
  await pool.query('ALTER TABLE club_invoices ADD COLUMN IF NOT EXISTS invoice_request_address TEXT');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS club_invoice_recipients (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      created_by TEXT,
      created_by_email TEXT,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
    )
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'club_invoice_recipients'
          AND column_name = 'phone'
      ) THEN
        ALTER TABLE club_invoice_recipients ADD COLUMN phone TEXT NOT NULL DEFAULT '';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'club_invoice_recipients'
          AND column_name = 'address'
      ) THEN
        ALTER TABLE club_invoice_recipients ADD COLUMN address TEXT NOT NULL DEFAULT '';
      END IF;

      UPDATE club_invoice_recipients
      SET phone = COALESCE(NULLIF(TRIM(phone), ''), 'Mangler telefon')
      WHERE phone IS NULL OR TRIM(phone) = '';

      UPDATE club_invoice_recipients
      SET address = COALESCE(NULLIF(TRIM(address), ''), 'Adresse ikke registrert')
      WHERE address IS NULL OR TRIM(address) = '';

      ALTER TABLE club_invoice_recipients ALTER COLUMN phone DROP DEFAULT;
      ALTER TABLE club_invoice_recipients ALTER COLUMN address DROP DEFAULT;
      ALTER TABLE club_invoice_recipients ALTER COLUMN phone SET NOT NULL;
      ALTER TABLE club_invoice_recipients ALTER COLUMN address SET NOT NULL;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'club_invoice_recipients_email_key'
          AND conrelid = 'club_invoice_recipients'::regclass
      ) THEN
        ALTER TABLE club_invoice_recipients
        ADD CONSTRAINT club_invoice_recipients_email_key UNIQUE (email);
      END IF;
    END;
    $$;
  `);
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
        i.invoice_request_address,
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

  const invoices = [];

  for (const row of rows) {
    const items = Array.isArray(row.items) ? row.items : [];
    const invoice = {
      ...row,
      total_amount: row.total_amount_cents / 100,
      items: items.map(item => ({
        ...item,
        amount: item.amount_cents / 100
      }))
    };

    await ensureStripeFeeForInvoice(invoice);
    invoices.push(invoice);
  }

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

const createStripeInvoiceForClub = async (invoice, { email, name, phone, address }) => {
  if (!email || !name || !phone || !address) {
    throw new Error('Mangler nødvendig kundeinformasjon for Stripe-faktura');
  }

  const customerParams = new URLSearchParams();
  customerParams.append('email', email);
  customerParams.append('metadata[invoiceId]', String(invoice.id));
  customerParams.append('name', name);
  customerParams.append('preferred_locales[]', STRIPE_LOCALE);
  customerParams.append('phone', phone);
  customerParams.append('tax_exempt', 'exempt');
  applyStripeAddressParams(customerParams, address);

  const customer = await callStripe('POST', '/customers', customerParams);

  const invoiceParams = new URLSearchParams();
  invoiceParams.append('customer', customer.id);
  invoiceParams.append('collection_method', 'send_invoice');
  invoiceParams.append('auto_advance', 'true');
  invoiceParams.append('metadata[invoiceId]', String(invoice.id));
  invoiceParams.append('metadata[contactName]', name);
  invoiceParams.append('metadata[contactAddress]', address);
  invoiceParams.append('metadata[contactPhone]', phone);
  invoiceParams.append('description', invoice.notes || `Kartarkiv ${invoice.month}`);

  const unixDueDate = computeStripeDueDateSeconds(invoice.due_date);
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
    params.append('locale', STRIPE_LOCALE);
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
  const { contactEmail, contactName, contactPhone, contactAddress } = req.body || {};

  if (!Number.isInteger(invoiceId)) {
    return res.status(400).json({ error: 'Ugyldig faktura-ID' });
  }

  const normalizedEmail = String(contactEmail || req.user.email || '').trim();
  const normalizedName = String(contactName || '').trim();
  const normalizedPhoneRaw = contactPhone == null ? '' : String(contactPhone).trim();
  const normalizedPhone = normalizedPhoneRaw;
  const normalizedAddressRaw = contactAddress == null ? '' : String(contactAddress).trim();
  const normalizedAddress = normalizedAddressRaw;
  if (!normalizedEmail) {
    return res.status(400).json({ error: 'Oppgi e-postadressen fakturaen skal sendes til' });
  }

  if (!normalizedName) {
    return res.status(400).json({ error: 'Oppgi navnet eller bedriften som skal stå på fakturaen' });
  }

  if (!normalizedPhone) {
    return res.status(400).json({ error: 'Oppgi telefonnummer til mottakeren' });
  }

  if (!normalizedAddress) {
    return res.status(400).json({ error: 'Oppgi fakturaadressen' });
  }

  try {
    const [invoice] = await getInvoices(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Fant ikke faktura' });
    }

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Fakturaen er allerede betalt' });
    }

    const unixDueDate = computeStripeDueDateSeconds(invoice.due_date);

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
        phone: normalizedPhone,
        address: normalizedAddress
      });

      stripeInvoiceId = createdInvoice.stripeInvoiceId;
      stripeCustomerId = createdInvoice.stripeCustomerId;
      stripeInvoiceUrl = createdInvoice.stripeInvoiceUrl;
      stripeInvoicePdf = createdInvoice.stripeInvoicePdf;
    } else {
      const customerParams = new URLSearchParams();
      customerParams.append('email', normalizedEmail);
      customerParams.append('name', normalizedName);
      customerParams.append('preferred_locales[]', STRIPE_LOCALE);
      customerParams.append('phone', normalizedPhone);
      customerParams.append('tax_exempt', 'exempt');
      applyStripeAddressParams(customerParams, normalizedAddress);
      await callStripe('POST', `/customers/${stripeCustomerId}`, customerParams);

      const updateInvoiceParams = new URLSearchParams();
      updateInvoiceParams.append('description', invoice.notes || `Kartarkiv ${invoice.month}`);
      updateInvoiceParams.append('metadata[contactAddress]', normalizedAddress);
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
            invoice_request_address = $5,
            stripe_invoice_id = $6,
            stripe_customer_id = $7,
            stripe_invoice_url = $8,
            stripe_invoice_pdf = $9,
            updated_at = NOW()
        WHERE id = $10
        RETURNING *
      `,
      [
        req.user.email,
        normalizedEmail,
        normalizedName,
        normalizedPhone,
        normalizedAddress,
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

router.get('/recipients', authenticateUser, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
        SELECT id, name, email, phone, address, created_at, updated_at
        FROM club_invoice_recipients
        ORDER BY LOWER(name), LOWER(email)
      `
    );

    res.json({ recipients: rows });
  } catch (error) {
    console.error('❌ Failed to fetch invoice recipients:', error);
    res.status(500).json({ error: 'Kunne ikke hente lagrede mottakere' });
  }
});

router.post('/recipients', authenticateUser, requireSuperAdmin, async (req, res) => {
  const { name, email, phone, address } = req.body || {};

  const normalizedName = String(name || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPhone = String(phone || '').trim();
  const normalizedAddress = String(address || '').trim();

  if (!normalizedName) {
    return res.status(400).json({ error: 'Oppgi navn eller bedrift for mottakeren' });
  }

  if (!normalizedEmail) {
    return res.status(400).json({ error: 'Oppgi e-postadresse for mottakeren' });
  }

  if (!normalizedPhone) {
    return res.status(400).json({ error: 'Telefonnummer er påkrevd' });
  }

  if (!normalizedAddress) {
    return res.status(400).json({ error: 'Adresse er påkrevd' });
  }

  try {
    const { rows } = await pool.query(
      `
        INSERT INTO club_invoice_recipients (name, email, phone, address, created_by, created_by_email, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (email)
        DO UPDATE SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          address = EXCLUDED.address,
          updated_at = NOW()
        RETURNING id, name, email, phone, address, created_at, updated_at
      `,
      [normalizedName, normalizedEmail, normalizedPhone, normalizedAddress, req.user.id, req.user.email]
    );

    res.status(201).json({ recipient: rows[0] });
  } catch (error) {
    console.error('❌ Failed to save invoice recipient:', error);
    res.status(500).json({ error: 'Kunne ikke lagre mottaker' });
  }
});

module.exports = router;
