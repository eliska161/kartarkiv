const express = require('express');

// Store logs in memory (in production, use a proper database)
let apiLogs = [];

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log the request
  const logEntry = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent') || 'Unknown',
    ip: req.ip || req.connection.remoteAddress || 'Unknown',
    userId: req.user?.id || null,
    status: null, // Will be set after response
    responseTime: null, // Will be calculated after response
    error: null // Will be set if there's an error
  };

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const endTime = Date.now();
    logEntry.status = res.statusCode;
    logEntry.responseTime = endTime - startTime;
    
    // Add to logs (keep only last 1000 entries)
    apiLogs.unshift(logEntry);
    if (apiLogs.length > 1000) {
      apiLogs = apiLogs.slice(0, 1000);
    }
    
    // Call original end
    originalEnd.call(this, chunk, encoding);
  };

  // Override res.json to capture errors
  const originalJson = res.json;
  res.json = function(obj) {
    if (res.statusCode >= 400) {
      logEntry.error = obj.error || obj.message || 'Unknown error';
    }
    return originalJson.call(this, obj);
  };

  next();
};

// Get logs endpoint
const getLogs = (req, res) => {
  try {
    const { 
      limit = 100, 
      offset = 0, 
      method, 
      status, 
      search,
      startDate,
      endDate 
    } = req.query;

    let filteredLogs = [...apiLogs];

    // Filter by method
    if (method && method !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.method === method);
    }

    // Filter by status
    if (status && status !== 'all') {
      if (status === 'success') {
        filteredLogs = filteredLogs.filter(log => log.status >= 200 && log.status < 300);
      } else if (status === 'client-error') {
        filteredLogs = filteredLogs.filter(log => log.status >= 400 && log.status < 500);
      } else if (status === 'server-error') {
        filteredLogs = filteredLogs.filter(log => log.status >= 500);
      }
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.url.toLowerCase().includes(searchLower) ||
        log.method.toLowerCase().includes(searchLower) ||
        (log.userId && log.userId.toLowerCase().includes(searchLower))
      );
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(startDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= end);
    }

    // Apply pagination
    const total = filteredLogs.length;
    const paginatedLogs = filteredLogs.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      logs: paginatedLogs,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

// Clear logs endpoint (admin only)
const clearLogs = (req, res) => {
  try {
    apiLogs = [];
    res.json({ message: 'Logs cleared successfully' });
  } catch (error) {
    console.error('Error clearing logs:', error);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
};

module.exports = {
  requestLogger,
  getLogs,
  clearLogs
};
