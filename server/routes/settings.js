const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pool = require('../database/connection');
const { authenticateUser, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/logo');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Always save as 'logo' with the original extension
    const ext = path.extname(file.originalname);
    cb(null, 'logo' + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files are allowed.'));
    }
  }
});

// Get current logo
router.get('/logo', async (req, res) => {
  try {
    const logoDir = path.join(__dirname, '../uploads/logo');
    
    // Check if logo directory exists
    try {
      await fs.access(logoDir);
    } catch (error) {
      return res.json({ logo: null });
    }
    
    // Look for logo files
    const files = await fs.readdir(logoDir);
    const logoFile = files.find(file => file.startsWith('logo'));
    
    if (logoFile) {
      const logoPath = `/uploads/logo/${logoFile}`;
      res.json({ logo: logoPath });
    } else {
      res.json({ logo: null });
    }
  } catch (error) {
    console.error('Error fetching logo:', error);
    res.status(500).json({ message: 'Error fetching logo' });
  }
});

// Upload new logo (Admin only)
router.post('/logo', authenticateUser, requireAdmin, upload.single('logo'), async (req, res) => {
  try {
    console.log('Logo upload request received');
    console.log('User:', req.user);
    console.log('File:', req.file);
    
    if (!req.file) {
      return res.status(400).json({ message: 'No logo file uploaded' });
    }

    // Delete any existing logo files
    const logoDir = path.join(__dirname, '../uploads/logo');
    try {
      const files = await fs.readdir(logoDir);
      for (const file of files) {
        if (file.startsWith('logo')) {
          await fs.unlink(path.join(logoDir, file));
        }
      }
    } catch (error) {
      // Directory doesn't exist or no files to delete
    }

    const logoPath = `/uploads/logo/${req.file.filename}`;
    
    res.status(201).json({
      message: 'Logo uploaded successfully',
      logo: logoPath
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ message: 'Error uploading logo' });
  }
});

// Delete logo (Admin only)
router.delete('/logo', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const logoDir = path.join(__dirname, '../uploads/logo');
    
    try {
      const files = await fs.readdir(logoDir);
      for (const file of files) {
        if (file.startsWith('logo')) {
          await fs.unlink(path.join(logoDir, file));
        }
      }
    } catch (error) {
      // Directory doesn't exist or no files to delete
    }
    
    res.json({ message: 'Logo deleted successfully' });
  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({ message: 'Error deleting logo' });
  }
});

// Error handling for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Filen er for stor. Maksimal størrelse er 2MB' });
    }
  }
  if (error.message === 'Invalid file type. Only image files are allowed.') {
    return res.status(400).json({ message: 'Ugyldig filtype. Kun bildefiler er tillatt' });
  }
  next(error);
});

module.exports = router;
