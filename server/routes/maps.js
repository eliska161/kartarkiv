const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const pool = require('../database/connection');
const { authenticateUser, requireAdmin } = require('../middleware/auth-clerk-fixed');
const { uploadToWasabi, getWasabiUrl, getSignedUrl } = require('../config/wasabi');

// Function to convert Norwegian characters to ASCII-friendly equivalents
function sanitizeFilename(filename) {
  return filename
    .replace(/[åÅ]/g, 'a')
    .replace(/[æÆ]/g, 'ae')
    .replace(/[øØ]/g, 'o')
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace any other special characters with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single underscore
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}
// const pdf = require('pdf-poppler'); // Removed - not supported on Linux
const router = express.Router();

// Upload rate limiting
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 uploads per minute
  message: {
    error: 'For mange filopplastinger, vent litt før du prøver igjen.',
    retryAfter: '1 minutt'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Function to generate preview from PDF - DISABLED (pdf-poppler not supported on Linux)
const generatePreviewFromPDF = async (pdfPath, outputDir) => {
  console.log('PDF preview generation disabled - pdf-poppler not supported on Linux');
  return null;
};


// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    let uploadDir;
    if (file.fieldname === 'previewImage') {
      uploadDir = path.join(__dirname, '../uploads/previews');
    } else {
      uploadDir = path.join(__dirname, '../uploads/maps');
    }
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and image files are allowed.'));
    }
  }
});

// Separate upload for preview images
const previewUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for preview images
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files are allowed for previews.'));
    }
  }
});

// Generate share link for a map (one-time download)
router.post('/:id/share', authenticateUser, async (req, res) => {
  try {
    const mapId = parseInt(req.params.id);
    
    // Verify map exists
    const mapResult = await pool.query('SELECT id, name FROM maps WHERE id = $1', [mapId]);
    if (mapResult.rows.length === 0) {
      return res.status(404).json({ message: 'Map not found' });
    }
    
    // Generate unique token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set expiration to 5 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 5);
    
    // Create share link
    const result = await pool.query(`
      INSERT INTO share_links (map_id, token, created_by, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id, token, expires_at
    `, [mapId, token, req.user.id, expiresAt]);
    
    const shareLink = result.rows[0];
    const publicUrl = `${process.env.FRONTEND_URL || 'https://www.kartarkiv.co'}/download/${shareLink.token}`;
    
    console.log('✅ Share link created:', {
      mapId,
      token: shareLink.token,
      expiresAt: shareLink.expires_at,
      createdBy: req.user.id
    });
    
    res.json({
      message: 'Share link created successfully',
      shareLink: {
        id: shareLink.id,
        token: shareLink.token,
        url: publicUrl,
        expiresAt: shareLink.expires_at,
        expiresIn: '5 timer'
      }
    });
    
  } catch (error) {
    console.error('Error creating share link:', error);
    res.status(500).json({ message: 'Error creating share link' });
  }
});

// Public download endpoint for share links (no authentication required)
router.get('/download/:token', async (req, res) => {
  try {
    const token = req.params.token;
    
    // Find valid share link
    const shareResult = await pool.query(`
      SELECT 
        sl.*,
        m.name as map_name,
        m.description,
        m.scale,
        m.contour_interval,
        m.created_at as map_created_at
      FROM share_links sl
      JOIN maps m ON sl.map_id = m.id
      WHERE sl.token = $1 
        AND sl.is_used = FALSE 
        AND sl.expires_at > NOW()
    `, [token]);
    
    if (shareResult.rows.length === 0) {
      return res.status(404).json({ 
        message: 'Delings-lenke ikke funnet, utløpt eller allerede brukt',
        error: 'INVALID_OR_EXPIRED_LINK'
      });
    }
    
    const shareLink = shareResult.rows[0];
    
    // Mark as used and increment download count
    await pool.query(`
      UPDATE share_links 
      SET is_used = TRUE, used_at = NOW(), download_count = download_count + 1
      WHERE id = $1
    `, [shareLink.id]);
    
    // Get all files for this map
    const filesResult = await pool.query(`
      SELECT 
        mf.id,
        mf.filename,
        mf.file_path,
        mf.file_size,
        mf.mime_type,
        mf.created_at
      FROM map_files mf
      WHERE mf.map_id = $1
      ORDER BY mf.created_at ASC
    `, [shareLink.map_id]);
    
    const files = filesResult.rows;
    
    console.log('✅ Share link used:', {
      token,
      mapId: shareLink.map_id,
      mapName: shareLink.map_name,
      downloadCount: shareLink.download_count + 1
    });
    
    // Set CORS headers for public access
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    res.json({
      message: 'Kart lastet ned via delings-lenke',
      map: {
        id: shareLink.map_id,
        name: shareLink.map_name,
        description: shareLink.description,
        scale: shareLink.scale,
        contour_interval: shareLink.contour_interval,
        created_at: shareLink.map_created_at
      },
      files: files.map(file => ({
        id: file.id,
        filename: file.filename,
        file_size: file.file_size,
        mime_type: file.mime_type,
        download_url: `/api/maps/download/${token}/file/${file.id}`
      })),
      shareInfo: {
        expiresAt: shareLink.expires_at,
        downloadCount: shareLink.download_count + 1,
        isOneTime: true
      }
    });
    
  } catch (error) {
    console.error('Error processing share link download:', error);
    res.status(500).json({ message: 'Error processing download' });
  }
});

// Download individual file via share link
router.get('/download/:token/file/:fileId', async (req, res) => {
  try {
    const token = req.params.token;
    const fileId = parseInt(req.params.fileId);
    
    // Verify share link is still valid
    const shareResult = await pool.query(`
      SELECT sl.*, m.name as map_name
      FROM share_links sl
      JOIN maps m ON sl.map_id = m.id
      WHERE sl.token = $1 AND sl.is_used = TRUE
    `, [token]);
    
    if (shareResult.rows.length === 0) {
      return res.status(404).json({ message: 'Delings-lenke ikke gyldig' });
    }
    
    // Get file info
    const fileResult = await pool.query(`
      SELECT mf.*
      FROM map_files mf
      JOIN share_links sl ON mf.map_id = sl.map_id
      WHERE mf.id = $1 AND sl.token = $2
    `, [fileId, token]);
    
    if (fileResult.rows.length === 0) {
      return res.status(404).json({ message: 'Fil ikke funnet' });
    }
    
    const file = fileResult.rows[0];
    
    // Handle file download (same logic as authenticated download)
    if (file.file_path.startsWith('maps/')) {
      // Wasabi file
      if (process.env.WASABI_ACCESS_KEY && process.env.WASABI_SECRET_KEY) {
        try {
          const AWS = require('aws-sdk');
          const wasabi = new AWS.S3({
            endpoint: process.env.WASABI_ENDPOINT || 'https://s3.wasabisys.com',
            accessKeyId: process.env.WASABI_ACCESS_KEY,
            secretAccessKey: process.env.WASABI_SECRET_KEY,
            region: process.env.WASABI_REGION || 'us-east-1',
            s3ForcePathStyle: true,
            signatureVersion: 'v4'
          });
          
          const bucketName = process.env.WASABI_BUCKET || 'kartarkiv-storage';
          const params = {
            Bucket: bucketName,
            Key: file.file_path
          };
          
          const data = await wasabi.getObject(params).promise();
          
          res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
          res.setHeader('Content-Length', data.ContentLength);
          
          res.send(data.Body);
          return;
        } catch (error) {
          console.error('Error downloading from Wasabi:', error);
          return res.status(500).json({ message: 'Error downloading file' });
        }
      }
    }
    
    // Fallback to local file
    const path = require('path');
    const fs = require('fs').promises;
    
    try {
      const filePath = path.join(__dirname, '../uploads', file.file_path);
      const fileBuffer = await fs.readFile(filePath);
      
      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.setHeader('Content-Length', fileBuffer.length);
      
      res.send(fileBuffer);
    } catch (error) {
      console.error('Error reading local file:', error);
      res.status(500).json({ message: 'Error downloading file' });
    }
    
  } catch (error) {
    console.error('Error downloading file via share link:', error);
    res.status(500).json({ message: 'Error downloading file' });
  }
});

// Get version history for a map
router.get('/:id/versions', authenticateUser, async (req, res) => {
  try {
    const mapId = parseInt(req.params.id);
    
    const result = await pool.query(`
      SELECT 
        vh.*,
        CASE 
          WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL THEN 
            u.first_name || ' ' || u.last_name
          WHEN u.first_name IS NOT NULL THEN 
            u.first_name
          WHEN u.username IS NOT NULL THEN 
            u.username
          ELSE 
            'Ukjent bruker'
        END as username,
        u.first_name,
        u.last_name
      FROM map_version_history vh
      LEFT JOIN users u ON vh.changed_by = u.clerk_id
      WHERE vh.map_id = $1
      ORDER BY vh.changed_at DESC
    `, [mapId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching version history:', error);
    res.status(500).json({ message: 'Error fetching version history' });
  }
});

// Create version history entry
const createVersionHistory = async (mapId, versionNumber, changeDescription, changedBy, changes) => {
  try {
    await pool.query(`
      INSERT INTO map_version_history (map_id, version_number, change_description, changed_by, changes)
      VALUES ($1, $2, $3, $4, $5)
    `, [mapId, versionNumber, changeDescription, changedBy, JSON.stringify(changes)]);
  } catch (error) {
    console.error('Error creating version history:', error);
  }
};

// Delete file
router.delete('/files/:fileId', authenticateUser, async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId);
    
    // Get file info from database
    const fileResult = await pool.query('SELECT * FROM map_files WHERE id = $1', [fileId]);
    if (fileResult.rows.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    const file = fileResult.rows[0];
    const filePath = file.file_path;
    
    // Delete from Wasabi if it's a Wasabi file
    if (filePath.startsWith('maps/')) {
      if (process.env.WASABI_ACCESS_KEY && process.env.WASABI_SECRET_KEY) {
        try {
          const AWS = require('aws-sdk');
          const wasabi = new AWS.S3({
            endpoint: process.env.WASABI_ENDPOINT || 'https://s3.wasabisys.com',
            accessKeyId: process.env.WASABI_ACCESS_KEY,
            secretAccessKey: process.env.WASABI_SECRET_KEY,
            region: process.env.WASABI_REGION || 'us-east-1',
            s3ForcePathStyle: true,
            signatureVersion: 'v4'
          });
          
          const bucketName = process.env.WASABI_BUCKET || 'kartarkiv-storage';
          const params = {
            Bucket: bucketName,
            Key: filePath
          };
          
          await wasabi.deleteObject(params).promise();
          console.log('✅ File deleted from Wasabi:', filePath);
        } catch (error) {
          console.error('Error deleting from Wasabi:', error);
          // Continue with database deletion even if Wasabi deletion fails
        }
      }
    }
    
    // Delete from database
    await pool.query('DELETE FROM map_files WHERE id = $1', [fileId]);
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Error deleting file' });
  }
});

// Download file with signed URL
router.get('/files/:fileId/download', authenticateUser, async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId);
    console.log('🌐 CORS: File download request origin:', req.headers.origin);
    
    // Set CORS headers explicitly for file download
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Clerk-Auth-Message, Accept, Origin');
    
    // Get file info from database
    const fileResult = await pool.query('SELECT * FROM map_files WHERE id = $1', [fileId]);
    if (fileResult.rows.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    const file = fileResult.rows[0];
    const filePath = file.file_path;
    
    // Check if it's a Wasabi key, full Wasabi URL, or local file
    if (filePath.startsWith('maps/')) {
      // It's a Wasabi key, download via server-side proxy
      if (process.env.WASABI_ACCESS_KEY && process.env.WASABI_SECRET_KEY) {
        try {
          const AWS = require('aws-sdk');
          const wasabi = new AWS.S3({
            endpoint: process.env.WASABI_ENDPOINT || 'https://s3.wasabisys.com',
            accessKeyId: process.env.WASABI_ACCESS_KEY,
            secretAccessKey: process.env.WASABI_SECRET_KEY,
            region: process.env.WASABI_REGION || 'us-east-1',
            s3ForcePathStyle: true,
            signatureVersion: 'v4'
          });
          
          const bucketName = process.env.WASABI_BUCKET || 'kartarkiv-storage';
          const params = {
            Bucket: bucketName,
            Key: filePath
          };
          
          // Get the file from Wasabi
          const data = await wasabi.getObject(params).promise();
          
          // Set appropriate headers
          res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${file.original_filename || file.filename}"`);
          res.setHeader('Content-Length', data.ContentLength);
          
          // Send the file
          res.send(data.Body);
          
        } catch (error) {
          console.error('Error downloading from Wasabi:', error);
          return res.status(500).json({ message: 'Error downloading file from Wasabi' });
        }
      } else {
        return res.status(500).json({ message: 'Wasabi not configured' });
      }
    } else if (filePath.startsWith('https://')) {
      // It's a full Wasabi URL (old format), download via server-side proxy
      try {
        const axios = require('axios');
        const response = await axios.get(filePath, { responseType: 'stream' });
        
        // Set appropriate headers
        res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${file.original_filename || file.filename}"`);
        
        // Pipe the response to the client
        response.data.pipe(res);
        
      } catch (error) {
        console.error('Error downloading from Wasabi URL:', error);
        return res.status(500).json({ message: 'Error downloading file from Wasabi URL' });
      }
    } else {
      // It's a local file, redirect to static file
      return res.redirect(`/uploads/maps/${filePath}`);
    }
  } catch (error) {
    console.error('Error in file download:', error);
    res.status(500).json({ message: 'Error processing download request' });
  }
});

// Get all maps
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Fetching maps...');
    console.log('📊 Database connection status:', pool.totalCount, 'total connections');
    console.log('🌐 CORS: Request origin:', req.headers.origin);
    console.log('🌐 CORS: Request headers:', req.headers);
    
    const result = await pool.query(`
      SELECT 
        m.*,
        CASE 
          WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL THEN 
            u.first_name || ' ' || u.last_name
          WHEN u.first_name IS NOT NULL THEN 
            u.first_name
          WHEN u.username IS NOT NULL THEN 
            u.username
          ELSE 
            'Ukjent bruker'
        END as created_by_username,
        COUNT(mf.id) as file_count
      FROM maps m
      LEFT JOIN users u ON m.created_by = u.clerk_id
      LEFT JOIN map_files mf ON m.id = mf.map_id
      GROUP BY m.id, u.first_name, u.last_name, u.username
      ORDER BY m.created_at DESC
    `);

    console.log('✅ Maps query successful, found', result.rows.length, 'maps');
    
    // Set CORS headers explicitly for maps endpoint
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Clerk-Auth-Message, Accept, Origin');
    
    res.json({
      maps: result.rows.map(map => ({
        ...map,
        area_bounds: map.area_bounds ? (typeof map.area_bounds === 'string' ? JSON.parse(map.area_bounds) : map.area_bounds) : null
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching maps:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position
    });
    
    // Set CORS headers even for errors
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    res.status(500).json({ 
      message: 'Error fetching maps',
      error: error.message,
      code: error.code
    });
  }
});

// Get single map with details
router.get('/:id', async (req, res) => {
  try {
    const mapId = parseInt(req.params.id);
    console.log('🌐 CORS: Single map request origin:', req.headers.origin);
    
    // Set CORS headers explicitly for single map endpoint
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Clerk-Auth-Message, Accept, Origin');
    
    // Get map details
    const mapResult = await pool.query(`
      SELECT 
        m.*,
        CASE 
          WHEN u.first_name IS NOT NULL AND u.last_name IS NOT NULL THEN 
            u.first_name || ' ' || u.last_name
          WHEN u.first_name IS NOT NULL THEN 
            u.first_name
          WHEN u.username IS NOT NULL THEN 
            u.username
          ELSE 
            'Ukjent bruker'
        END as created_by_username
      FROM maps m
      LEFT JOIN users u ON m.created_by = u.clerk_id
      WHERE m.id = $1
    `, [mapId]);

    if (mapResult.rows.length === 0) {
      return res.status(404).json({ message: 'Map not found' });
    }

    const map = mapResult.rows[0];

    // Get map files
    const filesResult = await pool.query(
      'SELECT * FROM map_files WHERE map_id = $1 ORDER BY created_at DESC',
      [mapId]
    );

    // Map metadata is stored in the maps table itself (area_bounds, center_lat, center_lng, etc.)
    const metadata = {
      area_bounds: map.area_bounds,
      center_lat: map.center_lat,
      center_lng: map.center_lng,
      zoom_level: map.zoom_level
    };

    // Get preview image
    const previewResult = await pool.query(
      'SELECT * FROM preview_images WHERE map_id = $1',
      [mapId]
    );

    res.json({
      map: {
        ...map,
        area_bounds: map.area_bounds ? (typeof map.area_bounds === 'string' ? JSON.parse(map.area_bounds) : map.area_bounds) : null,
        files: filesResult.rows,
        preview_image: previewResult.rows[0] || null,
        metadata
      }
    });
  } catch (error) {
    console.error('Error fetching map:', error);
    res.status(500).json({ message: 'Error fetching map' });
  }
});

// Create new map (Temporarily allow all authenticated users)
router.post('/', authenticateUser, [
  body('name').trim().notEmpty(),
  body('scale').optional().trim(),
  body('contourInterval').optional().isNumeric(),
  body('centerLat').isNumeric(),
  body('centerLng').isNumeric(),
  body('zoomLevel').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const {
      name,
      description,
      scale,
      contourInterval,
      areaBounds,
      centerLat,
      centerLng,
      zoomLevel = 13
    } = req.body;

    console.log('🔍 Creating map with data:', {
      name, description, scale, contourInterval, 
      areaBounds: areaBounds ? 'Present' : 'None', 
      centerLat, centerLng, zoomLevel, 
      createdBy: req.user.id
    });

    // First, ensure user exists in database with Clerk ID
    const userEmail = req.user.email || 'user@example.com';
    const userUsername = req.user.username || 'Unknown';
    const passwordHash = 'clerk_user_no_password'; // Clerk handles auth, we don't need password
    
    // Check if user exists by clerk_id first
    const existingUser = await pool.query(`
      SELECT id, clerk_id, email FROM users WHERE clerk_id = $1
    `, [req.user.id]);
    
    if (existingUser.rows.length === 0) {
      // User doesn't exist, create new one
      // Handle potential username and email conflicts by adding a suffix
      let finalUsername = userUsername;
      let finalEmail = userEmail;
      let counter = 1;
      
      while (true) {
        try {
          await pool.query(`
            INSERT INTO users (clerk_id, email, username, password_hash, is_admin) 
            VALUES ($1, $2, $3, $4, $5)
          `, [req.user.id, finalEmail, finalUsername, passwordHash, req.user.isAdmin]);
          console.log('✅ Created new user:', req.user.id, 'with username:', finalUsername, 'and email:', finalEmail);
          break;
        } catch (error) {
          if (error.code === '23505') {
            if (error.constraint === 'users_username_key') {
              // Username already exists, try with a number suffix
              finalUsername = `${userUsername}${counter}`;
              console.log('⚠️ Username conflict, trying:', finalUsername);
            } else if (error.constraint === 'users_email_key') {
              // Email already exists, try with a number suffix
              finalEmail = `${userEmail.split('@')[0]}+${counter}@${userEmail.split('@')[1]}`;
              console.log('⚠️ Email conflict, trying:', finalEmail);
            }
            counter++;
          } else {
            throw error; // Re-throw if it's a different error
          }
        }
      }
    } else {
      // User exists, update if needed (but don't change username to avoid conflicts)
      // Check if email already exists for another user before updating
      const emailCheck = await pool.query(`
        SELECT id FROM users WHERE email = $1 AND clerk_id != $2
      `, [userEmail, req.user.id]);
      
      if (emailCheck.rows.length > 0) {
        // Email already exists for another user, don't update it
        console.log('⚠️ Email already exists for another user, keeping existing email for:', req.user.id);
        await pool.query(`
          UPDATE users SET 
            password_hash = COALESCE($2, password_hash),
            is_admin = $3
          WHERE clerk_id = $1
        `, [req.user.id, passwordHash, req.user.isAdmin]);
      } else {
        // Email is unique, safe to update
        await pool.query(`
          UPDATE users SET 
            email = COALESCE($2, email),
            password_hash = COALESCE($3, password_hash),
            is_admin = $4
          WHERE clerk_id = $1
        `, [req.user.id, userEmail, passwordHash, req.user.isAdmin]);
        console.log('✅ Updated existing user:', req.user.id, 'with new email:', userEmail);
      }
    }

    const result = await pool.query(`
      INSERT INTO maps (
        name, description, scale, contour_interval, area_bounds,
        center_lat, center_lng, zoom_level, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      name, description, scale, contourInterval, 
      areaBounds ? JSON.stringify(areaBounds) : null, centerLat, centerLng, zoomLevel, req.user.id
    ]);

    console.log('✅ Map created successfully:', result.rows[0]);

    res.status(201).json({
      message: 'Map created successfully',
      map: {
        ...result.rows[0],
        area_bounds: result.rows[0].area_bounds ? (typeof result.rows[0].area_bounds === 'string' ? JSON.parse(result.rows[0].area_bounds) : result.rows[0].area_bounds) : null
      }
    });
  } catch (error) {
    console.error('❌ Error creating map:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Error creating map',
      error: error.message,
      code: error.code
    });
  }
});

// Upload preview image for a map (Admin only)
router.post('/:id/preview', authenticateUser, requireAdmin, previewUpload.single('previewImage'), async (req, res) => {
  try {
    const mapId = parseInt(req.params.id);

    // Verify map exists
    const mapResult = await pool.query('SELECT id FROM maps WHERE id = $1', [mapId]);
    if (mapResult.rows.length === 0) {
      return res.status(404).json({ message: 'Map not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No preview image uploaded' });
    }

    // Delete existing preview image if it exists
    const existingPreview = await pool.query('SELECT file_path FROM preview_images WHERE map_id = $1', [mapId]);
    if (existingPreview.rows.length > 0) {
      try {
        const fullPath = path.join(__dirname, '../uploads/previews', existingPreview.rows[0].file_path);
        await fs.unlink(fullPath);
      } catch (error) {
        console.warn('Could not delete existing preview image:', error.message);
      }
      await pool.query('DELETE FROM preview_images WHERE map_id = $1', [mapId]);
    }

    // Generate a sanitized filename for storage (without Norwegian characters)
    const originalName = path.basename(req.file.originalname, path.extname(req.file.originalname));
    const extension = path.extname(req.file.originalname);
    const sanitizedBaseName = sanitizeFilename(originalName);
    const fileName = `${sanitizedBaseName}${extension}`;

    const result = await pool.query(`
      INSERT INTO preview_images (
        map_id, filename, file_path, file_size, mime_type, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      mapId,
      req.file.originalname,
      fileName,
      req.file.size,
      req.file.mimetype || 'image/jpeg', // mime_type
      req.user.id // created_by
    ]);

    res.status(201).json({
      message: 'Preview image uploaded successfully',
      preview: result.rows[0]
    });
  } catch (error) {
    console.error('Error uploading preview image:', error);
    res.status(500).json({ message: 'Error uploading preview image' });
  }
});

// Upload files for a map (All authenticated users)
router.post('/:id/files', authenticateUser, uploadLimiter, upload.array('files', 10), async (req, res) => {
  try {
    const mapId = parseInt(req.params.id);
    const { version, isPrimary } = req.body;

    // Verify map exists
    const mapResult = await pool.query('SELECT id FROM maps WHERE id = $1', [mapId]);
    if (mapResult.rows.length === 0) {
      return res.status(404).json({ message: 'Map not found' });
    }

    // Use clerk_id directly for created_by (VARCHAR field)
    console.log('🔍 Using clerk_id for file upload:', req.user.id);
    const uploadedFiles = [];

    for (const file of req.files) {
      const fileType = path.extname(file.originalname).toLowerCase().substring(1).toUpperCase();
      
      // Generate a sanitized filename for storage (without Norwegian characters)
      const originalName = path.basename(file.originalname, path.extname(file.originalname));
      const extension = path.extname(file.originalname);
      const sanitizedBaseName = sanitizeFilename(originalName);
      const fileName = `${sanitizedBaseName}${extension}`;
      
      // Try to upload to Wasabi if configured, otherwise use local path
      let fileUrl = fileName; // Default to local filename
      
      if (process.env.WASABI_ACCESS_KEY && process.env.WASABI_SECRET_KEY) {
        try {
          const wasabiKey = `maps/${mapId}/${fileName}`;
          await uploadToWasabi(file.path, wasabiKey, file.mimetype);
          fileUrl = wasabiKey; // Store the key, not the URL
          console.log('✅ File uploaded to Wasabi with key:', wasabiKey);
        } catch (wasabiError) {
          console.error('❌ Wasabi upload failed, using local storage:', wasabiError.message);
          // Fallback to local storage
        }
      } else {
        console.log('⚠️ Wasabi not configured, using local storage');
      }
      
      console.log('🔍 Inserting file with created_by:', req.user.id, 'for map:', mapId);
      
      const result = await pool.query(`
        INSERT INTO map_files (
          map_id, filename, original_filename, file_path, file_type, file_size, mime_type, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        mapId,
        fileName, // filename - stored file name
        file.originalname, // original_filename - user's original file name
        fileUrl, // file_path - Wasabi URL or local filename
        fileType,
        file.size,
        file.mimetype || 'application/octet-stream', // mime_type
        req.user.id // created_by - use clerk_id directly (VARCHAR)
      ]);

      uploadedFiles.push(result.rows[0]);
      
      // Generate preview and extract data based on file type
      if (fileType === 'PDF') {
        try {
          const previewDir = path.join(__dirname, '../uploads/previews');
          await fs.mkdir(previewDir, { recursive: true });
          
          const previewPath = await generatePreviewFromPDF(file.path, previewDir);
          
          if (previewPath) {
            const previewFileName = path.basename(previewPath);
            
            // Delete any existing preview for this map
            await pool.query('DELETE FROM preview_images WHERE map_id = $1', [mapId]);
            
            // Insert new preview
            await pool.query(`
              INSERT INTO preview_images (map_id, file_name, file_path, file_size)
              VALUES ($1, $2, $3, $4)
            `, [mapId, `preview_${mapId}.png`, previewFileName, (await fs.stat(previewPath)).size]);
            
            console.log(`Generated preview from PDF: ${previewFileName}`);
          }
        } catch (error) {
          console.error('Error generating preview from PDF:', error);
          // Don't fail the upload if preview generation fails
        }
      }
    }

    res.status(201).json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ message: 'Error uploading files' });
  }
});

// Update map (Admin only)
router.put('/:id', authenticateUser, requireAdmin, [
  body('name').optional().trim().notEmpty(),
  body('scale').optional().trim(),
  body('contourInterval').optional().isNumeric(),
  body('centerLat').optional().isNumeric(),
  body('centerLng').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const mapId = parseInt(req.params.id);
    const updates = req.body;
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        if (key === 'areaBounds') {
          updateFields.push(`area_bounds = $${paramCount}`);
          values.push(updates[key] ? JSON.stringify(updates[key]) : null);
        } else {
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          updateFields.push(`${dbKey} = $${paramCount}`);
          values.push(updates[key]);
        }
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    values.push(mapId);
    const query = `UPDATE maps SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Map not found' });
    }

    // Create version history entry
    const changedBy = req.user.id;
    const versionNumber = result.rows[0].current_version || '1.0';
    const changeDescription = `Updated map: ${Object.keys(updates).join(', ')}`;
    
    await createVersionHistory(
      mapId, 
      versionNumber, 
      changeDescription, 
      changedBy, 
      updates
    );

    // Update last_updated fields
    await pool.query(`
      UPDATE maps 
      SET last_updated_by = $1, last_updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `, [changedBy, mapId]);

    res.json({
      message: 'Map updated successfully',
      map: {
        ...result.rows[0],
        area_bounds: result.rows[0].area_bounds ? (typeof result.rows[0].area_bounds === 'string' ? JSON.parse(result.rows[0].area_bounds) : result.rows[0].area_bounds) : null
      }
    });
  } catch (error) {
    console.error('Error updating map:', error);
    res.status(500).json({ message: 'Error updating map' });
  }
});

// Delete map (Admin only)
router.delete('/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const mapId = parseInt(req.params.id);

    // Get map files to delete from filesystem
    const filesResult = await pool.query('SELECT file_path FROM map_files WHERE map_id = $1', [mapId]);
    
    // Delete files from filesystem
    for (const file of filesResult.rows) {
      try {
        // Reconstruct full path for deletion
        const fullPath = path.join(__dirname, '../uploads/maps', file.file_path);
        await fs.unlink(fullPath);
      } catch (error) {
        console.warn('Could not delete file:', file.file_path, error.message);
      }
    }

    // Delete from database (cascade will handle related records)
    const result = await pool.query('DELETE FROM maps WHERE id = $1', [mapId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Map not found' });
    }

    res.json({ message: 'Map deleted successfully' });
  } catch (error) {
    console.error('Error deleting map:', error);
    res.status(500).json({ message: 'Error deleting map' });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Map:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique map identifier
 *         name:
 *           type: string
 *           description: Map name
 *         description:
 *           type: string
 *           description: Map description
 *         scale:
 *           type: string
 *           description: Map scale (e.g., "1:10000")
 *         contour_interval:
 *           type: number
 *           description: Contour interval in meters
 *         area_bounds:
 *           type: object
 *           description: Geographic bounds of the map area
 *         center_lat:
 *           type: number
 *           description: Center latitude
 *         center_lng:
 *           type: number
 *           description: Center longitude
 *         zoom_level:
 *           type: integer
 *           description: Default zoom level
 *         created_by:
 *           type: string
 *           description: Clerk ID of creator
 *         created_by_username:
 *           type: string
 *           description: Username of creator
 *         created_at:
 *           type: string
 *           format: date-time
 *         last_updated_at:
 *           type: string
 *           format: date-time
 *         file_count:
 *           type: integer
 *           description: Number of files attached to map
 *     
 *     MapFile:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         map_id:
 *           type: integer
 *         filename:
 *           type: string
 *         original_filename:
 *           type: string
 *         file_path:
 *           type: string
 *         file_type:
 *           type: string
 *           enum: [PDF, JPG, JPEG, PNG, GIF]
 *         file_size:
 *           type: integer
 *         mime_type:
 *           type: string
 *         metadata:
 *           type: object
 *         created_by:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *     
 *     ShareLink:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         token:
 *           type: string
 *         url:
 *           type: string
 *         expiresAt:
 *           type: string
 *           format: date-time
 *         expiresIn:
 *           type: string
 *     
 *     VersionHistory:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         map_id:
 *           type: integer
 *         version_number:
 *           type: string
 *         change_description:
 *           type: string
 *         changed_by:
 *           type: string
 *         username:
 *           type: string
 *         changes:
 *           type: object
 *         changed_at:
 *           type: string
 *           format: date-time
 *     
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         error:
 *           type: string
 *         code:
 *           type: string
 *   
 *   securitySchemes:
 *     ClerkAuth:
 *       type: apiKey
 *       in: header
 *       name: Authorization
 *       description: Clerk authentication token
 */

/**
 * @swagger
 * /api/maps:
 *   get:
 *     summary: Get all maps
 *     tags: [Maps]
 *     responses:
 *       200:
 *         description: List of all maps
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 maps:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Map'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/maps/{id}:
 *   get:
 *     summary: Get single map with details
 *     tags: [Maps]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Map ID
 *     responses:
 *       200:
 *         description: Map details with files and metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 map:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Map'
 *                     - type: object
 *                       properties:
 *                         files:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/MapFile'
 *                         preview_image:
 *                           type: object
 *                           nullable: true
 *                         metadata:
 *                           type: object
 *       404:
 *         description: Map not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/maps:
 *   post:
 *     summary: Create new map
 *     tags: [Maps]
 *     security:
 *       - ClerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - centerLat
 *               - centerLng
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               scale:
 *                 type: string
 *               contourInterval:
 *                 type: number
 *               areaBounds:
 *                 type: object
 *               centerLat:
 *                 type: number
 *               centerLng:
 *                 type: number
 *               zoomLevel:
 *                 type: integer
 *                 default: 13
 *     responses:
 *       201:
 *         description: Map created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 map:
 *                   $ref: '#/components/schemas/Map'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/maps/{id}:
 *   put:
 *     summary: Update map (Admin only)
 *     tags: [Maps]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               scale:
 *                 type: string
 *               contourInterval:
 *                 type: number
 *               areaBounds:
 *                 type: object
 *               centerLat:
 *                 type: number
 *               centerLng:
 *                 type: number
 *               zoomLevel:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Map updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Map not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/maps/{id}:
 *   delete:
 *     summary: Delete map (Admin only)
 *     tags: [Maps]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Map deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Map not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/maps/{id}/files:
 *   post:
 *     summary: Upload files for a map
 *     tags: [Maps, Files]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 10
 *               version:
 *                 type: string
 *               isPrimary:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 files:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MapFile'
 *       400:
 *         description: Invalid file type or no files
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Map not found
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/maps/{id}/preview:
 *   post:
 *     summary: Upload preview image for a map (Admin only)
 *     tags: [Maps, Files]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - previewImage
 *             properties:
 *               previewImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Preview image uploaded successfully
 *       400:
 *         description: No preview image uploaded
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Map not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/maps/files/{fileId}:
 *   delete:
 *     summary: Delete file
 *     tags: [Files]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/maps/files/{fileId}/download:
 *   get:
 *     summary: Download file with signed URL
 *     tags: [Files]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: File content
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/maps/{id}/share:
 *   post:
 *     summary: Generate share link for a map (one-time download)
 *     tags: [Maps, Sharing]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Share link created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 shareLink:
 *                   $ref: '#/components/schemas/ShareLink'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Map not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/maps/download/{token}:
 *   get:
 *     summary: Public download endpoint for share links (no authentication required)
 *     tags: [Sharing]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Share link token
 *     responses:
 *       200:
 *         description: Map details and download links
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 map:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     scale:
 *                       type: string
 *                     contour_interval:
 *                       type: number
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                 files:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       filename:
 *                         type: string
 *                       file_size:
 *                         type: integer
 *                       mime_type:
 *                         type: string
 *                       download_url:
 *                         type: string
 *                 shareInfo:
 *                   type: object
 *                   properties:
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     downloadCount:
 *                       type: integer
 *                     isOneTime:
 *                       type: boolean
 *       404:
 *         description: Share link not found, expired, or already used
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/maps/download/{token}/file/{fileId}:
 *   get:
 *     summary: Download individual file via share link
 *     tags: [Sharing]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: File content
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Share link or file not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/maps/{id}/versions:
 *   get:
 *     summary: Get version history for a map
 *     tags: [Maps, Versions]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Version history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/VersionHistory'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

module.exports = router;
