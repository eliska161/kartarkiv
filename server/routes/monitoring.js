const express = require('express');

const router = express.Router();

const BETTERSTACK_API_URL = 'https://uptime.betterstack.com/api/v2/monitors';
const REQUEST_TIMEOUT_MS = 15000;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache to avoid hammering the API

let cache = {
  data: null,
  expiresAt: 0
};

const hasValidCache = () => cache.data && cache.expiresAt > Date.now();

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    return response;
  } finally {
    clearTimeout(timeout);
  }
};

router.get('/monitors', async (req, res) => {
  const apiKey = process.env.BETTERSTACK_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: 'Monitoring integration is not configured.'
    });
  }

  if (hasValidCache()) {
    return res.json(cache.data);
  }

  try {
    const response = await fetchWithTimeout(BETTERSTACK_API_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: 'Failed to fetch monitor status.',
        status: response.status,
        detail: errorText
      });
    }

    const data = await response.json();

    cache = {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS
    };

    return res.json(data);
  } catch (error) {
    const isAbortError = error && error.name === 'AbortError';
    return res.status(504).json({
      error: isAbortError ? 'Monitoring request timed out.' : 'Unable to retrieve monitor status.',
      detail: error.message
    });
  }
});

module.exports = router;
