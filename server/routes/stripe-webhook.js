const express = require('express');
const Stripe = require('stripe');
const pool = require('../database/connection');

const router = express.Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripeClient = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' })
  : null;

const applyInvoiceUpdate = async invoice => {
  if (!invoice?.id) {
    return;
  }
  const status = invoice.status || null;
  const hostedUrl = invoice.hosted_invoice_url || null;
  const invoicePdf = invoice.invoice_pdf || null;
  const stripeCustomerId = invoice.customer || invoice.customer_id || null;
  const rawClubId = invoice.metadata?.club_id || invoice.metadata?.clubId || null;
  const normalizedClubId = typeof rawClubId === 'string' && rawClubId.trim() ? rawClubId.trim() : null;

  const params = [status, hostedUrl, invoicePdf, stripeCustomerId, invoice.id];
  let setClause = `status = coalesce($1, status), stripe_invoice_url = coalesce($2, stripe_invoice_url), stripe_invoice_pdf = coalesce($3, stripe_invoice_pdf), stripe_customer_id = coalesce($4, stripe_customer_id), updated_at = now()`;

  if (normalizedClubId) {
    params.splice(4, 0, normalizedClubId);
    setClause = `club_id = coalesce($5::uuid, club_id), ` + setClause;
  }

  const result = await pool.query(
    `update club_invoices set ${setClause} where stripe_invoice_id = $${normalizedClubId ? 6 : 5} returning id`,
    params
  );

  if (result.rowCount === 0) {
    console.warn('⚠️ Stripe webhook received invoice for unknown club invoice record', invoice.id);
  }
};

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripeClient || !webhookSecret) {
    console.error('❌ Stripe webhook missing configuration');
    return res.status(500).send('Stripe not configured');
  }

  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripeClient.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    console.error('❌ Stripe webhook signature verification failed:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    switch (event.type) {
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
      case 'invoice.voided':
      case 'invoice.marked_uncollectible': {
        await applyInvoiceUpdate(event.data.object);
        break;
      }
      default:
        console.log('ℹ️ Stripe webhook event ignored:', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Failed processing Stripe webhook:', error);
    res.status(500).send('Webhook processing failed');
  }
});

module.exports = router;
