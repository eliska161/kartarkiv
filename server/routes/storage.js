const express = require('express');
const router = express.Router();

const pool = require('../database/connection');
const { authenticateUser, requireAdmin } = require('../middleware/auth-clerk-fixed');
const { b2Client, bucketName } = require('../config/backblaze');

const PRICE_PER_GB_NOK = 1;
const BASE_PRICE_NOK = 49;

const isBackblazeConfigured = () =>
  Boolean(process.env.B2_KEY_ID && process.env.B2_APPLICATION_KEY && process.env.B2_BUCKET);

const listBucketObjects = async () => {
  let continuationToken;
  const objects = [];

  do {
    const params = {
      Bucket: bucketName,
      ContinuationToken: continuationToken
    };

    const response = await b2Client.listObjectsV2(params).promise();
    objects.push(...(response.Contents || []));
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return objects;
};

router.get('/usage', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const configured = isBackblazeConfigured();
    let totalBytes = 0;
    let objectCount = 0;
    let backblazeStatus = 'Backblaze B2 ikke konfigurert';

    if (configured) {
      try {
        const objects = await listBucketObjects();
        totalBytes = objects.reduce((acc, object) => acc + (object.Size || 0), 0);
        objectCount = objects.length;
        backblazeStatus = `Backblaze B2 tilgjengelig (${bucketName})`;
      } catch (error) {
        console.error('❌ Failed to read Backblaze bucket usage:', error.message);
        backblazeStatus = 'Kunne ikke lese lagringsdata fra Backblaze B2';
      }
    }

    const mapUsageResult = await pool.query(`
      SELECT
        m.id,
        m.name,
        COALESCE(SUM(mf.file_size), 0) AS total_bytes,
        COUNT(mf.id) AS file_count
      FROM maps m
      LEFT JOIN map_files mf ON mf.map_id = m.id
      GROUP BY m.id, m.name
    `);

    const maps = mapUsageResult.rows
      .map(row => ({
        mapId: row.id,
        name: row.name,
        bytes: Number(row.total_bytes) || 0,
        fileCount: Number(row.file_count) || 0
      }))
      .sort((a, b) => b.bytes - a.bytes);

    const totalGigabytes = totalBytes / (1024 ** 3);
    const storageCostNok = Number((totalGigabytes * PRICE_PER_GB_NOK).toFixed(2));
    const estimatedMonthlyNok = Number((storageCostNok + BASE_PRICE_NOK).toFixed(2));

    res.json({
      bucket: bucketName,
      totalBytes,
      objectCount,
      backblazeConfigured: configured,
      backblazeStatus,
      maps,
      storageCostNok,
      basePriceNok: BASE_PRICE_NOK,
      estimatedMonthlyNok,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to fetch storage usage:', error);
    res.status(500).json({ error: 'Kunne ikke hente lagringsdata' });
  }
});

module.exports = router;
