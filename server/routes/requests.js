const express = require('express');
const router = express.Router();
const pool = require('../database/connection');

/**
 * @swagger
 * /api/requests:
 *   post:
 *     summary: Opprett en ny tilgangsforespørsel
 *     tags:
 *       - Access Requests
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               club_name:
 *                 type: string
 *               contact_name:
 *                 type: string
 *               contact_email:
 *                 type: string
 *               expected_size_gb:
 *                 type: number
 *                 nullable: true
 *               message:
 *                 type: string
 *                 nullable: true
 *             required:
 *               - club_name
 *               - contact_name
 *               - contact_email
 *     responses:
 *       201:
 *         description: Forespørsel registrert
 *       400:
 *         description: Ugyldige inputdata
 *       500:
 *         description: Internt serverproblem
 */
router.post('/', async (req, res) => {
  const { club_name, contact_name, contact_email, expected_size_gb, message } = req.body || {};

  if (!club_name || !contact_name || !contact_email) {
    return res.status(400).json({ error: 'Klubbnavn, kontaktperson og e-post er påkrevd.' });
  }

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
      message ? message.trim() : null,
    ];

    const { rows } = await pool.query(query, values);

    return res.status(201).json({
      id: rows[0]?.id,
      status: rows[0]?.status,
      created_at: rows[0]?.created_at,
    });
  } catch (error) {
    console.error('Feil ved lagring av tilgangsforespørsel:', error);
    return res.status(500).json({ error: 'Kunne ikke lagre forespørselen. Prøv igjen senere.' });
  }
});

module.exports = router;
