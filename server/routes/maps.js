const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { body, validationResult } = require('express-validator');
const pool = require('../database/connection');
const { authenticateUser, requireAdmin } = require('../middleware/auth-clerk-fixed');
// const pdf = require('pdf-poppler'); // Removed - not supported on Linux
const { readOcad } = require('ocad2geojson');
const toGeoJSON = require('@mapbox/togeojson');
const { DOMParser } = require('@xmldom/xmldom');
const AdmZip = require('adm-zip');

const router = express.Router();

// Function to generate preview from PDF - DISABLED (pdf-poppler not supported on Linux)
const generatePreviewFromPDF = async (pdfPath, outputDir) => {
  console.log('PDF preview generation disabled - pdf-poppler not supported on Linux');
  return null;
};

// Function to extract georeferencing and polygon data from KMZ file
const extractKMZData = async (kmzPath) => {
  try {
    console.log('Reading KMZ file:', kmzPath);
    
    // Read and extract KMZ file
    const zip = new AdmZip(kmzPath);
    const zipEntries = zip.getEntries();
    
    console.log('KMZ entries:', zipEntries.map(entry => entry.entryName));
    
    // Find KML file (usually doc.kml)
    const kmlEntry = zipEntries.find(entry => 
      entry.entryName.toLowerCase().endsWith('.kml')
    );
    
    if (!kmlEntry) {
      throw new Error('No KML file found in KMZ');
    }
    
    console.log('Found KML file:', kmlEntry.entryName);
    
    // Parse KML content
    const kmlContent = kmlEntry.getData().toString('utf8');
    const kmlDoc = new DOMParser().parseFromString(kmlContent, 'text/xml');
    
    console.log('=== KML DOCUMENT DEBUG ===');
    console.log('Document element name:', kmlDoc.documentElement?.tagName);
    console.log('Document element namespace:', kmlDoc.documentElement?.namespaceURI);
    
    // Check for common KML elements
    const placemarks = kmlDoc.getElementsByTagName('Placemark');
    const polygons = kmlDoc.getElementsByTagName('Polygon');
    const linestrings = kmlDoc.getElementsByTagName('LineString');
    const points = kmlDoc.getElementsByTagName('Point');
    
    console.log('KML elements found:', {
      placemarks: placemarks.length,
      polygons: polygons.length,
      linestrings: linestrings.length,
      points: points.length
    });
    
    // Convert to GeoJSON
    const geoJson = toGeoJSON.kml(kmlDoc);
    
    console.log('=== KML CONTENT DEBUG ===');
    console.log('KML content length:', kmlContent.length);
    console.log('KML content preview:', kmlContent.substring(0, 500));
    console.log('=== GEOJSON RESULT ===');
    console.log('GeoJSON:', JSON.stringify(geoJson, null, 2));
    console.log('Features count:', geoJson.features ? geoJson.features.length : 'No features');
    
    const result = {
      georeferencing: null,
      polygons: [],
      scale: null,
      bounds: null
    };
    
    // Extract polygons from GeoJSON
    console.log('=== POLYGON EXTRACTION DEBUG ===');
    if (geoJson.features) {
      console.log('Processing', geoJson.features.length, 'features');
      geoJson.features.forEach((feature, index) => {
        console.log(`Feature ${index}:`, {
          type: feature.geometry?.type,
          hasCoordinates: !!feature.geometry?.coordinates,
          coordinatesLength: feature.geometry?.coordinates?.length
        });
        
        if (feature.geometry && feature.geometry.type === 'Polygon') {
          console.log('Found Polygon feature');
          result.polygons.push({
            type: 'Polygon',
            coordinates: feature.geometry.coordinates
          });
        } else if (feature.geometry && feature.geometry.type === 'MultiPolygon') {
          console.log('Found MultiPolygon feature');
          feature.geometry.coordinates.forEach(polygon => {
            result.polygons.push({
              type: 'Polygon',
              coordinates: polygon
            });
          });
        } else if (feature.geometry && feature.geometry.type === 'LineString') {
          console.log('Found LineString feature - converting to polygon');
          // Convert LineString to Polygon by closing it
          const coords = feature.geometry.coordinates;
          if (coords.length > 2) {
            const closedCoords = [...coords, coords[0]]; // Close the polygon
            result.polygons.push({
              type: 'Polygon',
              coordinates: [closedCoords]
            });
          }
        }
      });
    } else {
      console.log('No features found in GeoJSON');
    }
    
    console.log('Extracted polygons count:', result.polygons.length);
    
    // Calculate bounds from polygons
    if (result.polygons.length > 0) {
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      
      result.polygons.forEach(polygon => {
        polygon.coordinates[0].forEach(coord => {
          minLng = Math.min(minLng, coord[0]);
          minLat = Math.min(minLat, coord[1]);
          maxLng = Math.max(maxLng, coord[0]);
          maxLat = Math.max(maxLat, coord[1]);
        });
      });
      
      result.bounds = {
        minLng, minLat, maxLng, maxLat,
        centerLng: (minLng + maxLng) / 2,
        centerLat: (minLat + maxLat) / 2
      };
      
      // Create georeferencing from bounds center
      result.georeferencing = {
        realWorldOffset: {
          x: result.bounds.centerLng * 111320 * Math.cos(result.bounds.centerLat * Math.PI / 180),
          y: result.bounds.centerLat * 111320
        },
        additionalOffset: { x: 0, y: 0 },
        gridDistance: 250,
        paperGridDistance: 0
      };
    }
    
    // Set default scale
    result.scale = '1:10000';
    
    console.log('KMZ extraction result:', result);
    return result;
    
  } catch (error) {
    console.error('Error extracting KMZ data:', error);
    return null;
  }
};

// Function to extract georeferencing and polygon data from OCAD file
const extractOCADData = async (ocadPath) => {
  try {
    console.log('Reading OCAD file:', ocadPath);
    const ocadData = await readOcad(ocadPath);
    
    console.log('=== FULL OCAD DATA STRUCTURE ===');
    console.log('Available keys in OCAD data:', Object.keys(ocadData));
    console.log('Header:', ocadData.header);
    console.log('Objects count:', ocadData.objects?.length || 0);
    console.log('Symbols count:', ocadData.symbols?.length || 0);
    console.log('Colors count:', ocadData.colors?.length || 0);
    console.log('Warnings:', ocadData.warnings);
    
    // Log parameterStrings in detail
    if (ocadData.parameterStrings) {
      console.log('=== PARAMETER STRINGS DETAIL ===');
      console.log('ParameterStrings type:', typeof ocadData.parameterStrings);
      console.log('ParameterStrings is array:', Array.isArray(ocadData.parameterStrings));
      
      if (Array.isArray(ocadData.parameterStrings)) {
        console.log('ParameterStrings array length:', ocadData.parameterStrings.length);
        ocadData.parameterStrings.forEach((param, index) => {
          console.log(`Parameter ${index}:`, {
            type: param.type,
            recType: param.recType,
            value: param.value,
            parameters: param.parameters,
            keys: Object.keys(param)
          });
        });
      } else {
        console.log('ParameterStrings object keys:', Object.keys(ocadData.parameterStrings));
        Object.entries(ocadData.parameterStrings).forEach(([key, param]) => {
          console.log(`Parameter ${key}:`, {
            type: param.type,
            recType: param.recType,
            value: param.value,
            parameters: param.parameters,
            keys: Object.keys(param)
          });
        });
      }
    }
    
    console.log('=== END OCAD DATA ===');
    
    if (ocadData.parameterStrings) {
      console.log('ParameterStrings type:', typeof ocadData.parameterStrings);
      console.log('ParameterStrings keys:', Object.keys(ocadData.parameterStrings));
      console.log('ParameterStrings values:', Object.values(ocadData.parameterStrings));
    }
    
    const result = {
      georeferencing: null,
      polygons: [],
      scale: null,
      bounds: null
    };
    
    // Extract georeferencing information
    if (ocadData.parameterStrings) {
      console.log('Searching for scale parameters in parameterStrings object');
      
      // Convert parameterStrings object to array if needed
      let paramArray = [];
      if (Array.isArray(ocadData.parameterStrings)) {
        paramArray = ocadData.parameterStrings;
      } else if (typeof ocadData.parameterStrings === 'object') {
        // Convert object to array of values
        paramArray = Object.values(ocadData.parameterStrings);
        console.log('Converted parameterStrings object to array with', paramArray.length, 'items');
      }
      
      // Look for scale parameters (type 1039 = si_ScalePar)
      const scalePar = paramArray.find(p => p && (p.type === 1039 || p.recType === 1039));
      console.log('Scale parameter found:', scalePar);
      
      // Also look for any parameter that might contain coordinate information
      const coordParams = paramArray.filter(p => p && (
        (p.value && (p.value.includes('636049') || p.value.includes('6755115'))) ||
        (p.parameters && (p.parameters.x || p.parameters.y)) ||
        (p.x !== undefined && p.y !== undefined)
      ));
      console.log('Parameters with coordinate info:', coordParams);
      
      if (scalePar) {
        console.log('Scale parameter details:', scalePar);
        result.scale = scalePar.parameters?.m || scalePar.m || scalePar.value; // Map scale
        result.georeferencing = {
          realWorldOffset: {
            x: scalePar.parameters?.x || scalePar.x || 0, // Real world offset easting
            y: scalePar.parameters?.y || scalePar.y || 0  // Real world offset northing
          },
          additionalOffset: {
            x: scalePar.parameters?.b || scalePar.b || 0, // Additional local easting offset
            y: scalePar.parameters?.c || scalePar.c || 0  // Additional local northing offset
          },
          gridDistance: scalePar.parameters?.d || scalePar.d || 0, // Grid distance for real world
          paperGridDistance: scalePar.parameters?.g || scalePar.g || 0 // Grid distance for paper coordinates
        };
        console.log('Extracted georeferencing:', result.georeferencing);
      } else {
        console.log('No scale parameter found. Available types:', paramArray.map(p => p?.type || p?.recType));
        
        // Try alternative approaches - look for any parameter with scale info
        const allParams = paramArray.filter(p => p && (p.type > 1000 || p.recType > 1000));
        console.log('All parameter types > 1000:', allParams.map(p => ({ 
          type: p.type || p.recType, 
          keys: Object.keys(p),
          value: p.value || p.parameters
        })));
        
        // Try to find scale in other parameters
        const scaleParam = allParams.find(p => 
          p.value && (
            p.value.includes('scale') || 
            p.value.includes('Scale') ||
            p.value.includes('1:') ||
            (p.parameters && (p.parameters.m || p.parameters.scale))
          )
        );
        
        if (scaleParam) {
          console.log('Found scale in alternative parameter:', scaleParam);
          result.scale = scaleParam.parameters?.m || scaleParam.value;
        }
        
        // Try to extract georeferencing from any parameter with coordinate values
        const geoParam = allParams.find(p => 
          p.parameters && (
            (p.parameters.x && p.parameters.x > 100000) || // Likely UTM coordinates
            (p.parameters.y && p.parameters.y > 100000) ||
            (p.parameters.z && p.parameters.z > 100000) || // Z coordinate
            (p.parameters.b && p.parameters.c) || // Additional offsets
            (p.parameters.x && p.parameters.y) // Any x,y pair
          )
        );
        
        if (geoParam) {
          console.log('Found georeferencing in parameter:', geoParam);
          result.georeferencing = {
            realWorldOffset: {
              x: geoParam.parameters.x || 0,
              y: geoParam.parameters.y || 0
            },
            additionalOffset: {
              x: geoParam.parameters.b || 0,
              y: geoParam.parameters.c || 0
            },
            gridDistance: geoParam.parameters.d || 0,
            paperGridDistance: geoParam.parameters.g || 0
          };
          console.log('Extracted georeferencing from alternative parameter:', result.georeferencing);
        } else {
          // If no specific georeferencing parameter found, look for ANY parameter with coordinates
          console.log('No specific georeferencing parameter found, searching all parameters for coordinates...');
          
          const coordParams = allParams.filter(p => 
            p.parameters && (
              (p.parameters.x !== undefined && p.parameters.x !== null) ||
              (p.parameters.y !== undefined && p.parameters.y !== null) ||
              (p.parameters.z !== undefined && p.parameters.z !== null)
            )
          );
          
          console.log('Parameters with coordinate data:', coordParams.length);
          coordParams.forEach((param, index) => {
            console.log(`Coordinate parameter ${index}:`, {
              type: param.type || param.recType,
              x: param.parameters.x,
              y: param.parameters.y,
              z: param.parameters.z,
              allKeys: Object.keys(param.parameters)
            });
          });
          
          // Try to use the first parameter with coordinates
          if (coordParams.length > 0) {
            const firstCoord = coordParams[0];
            console.log('Using first coordinate parameter for georeferencing:', firstCoord);
            
            result.georeferencing = {
              realWorldOffset: {
                x: firstCoord.parameters.x || 0,
                y: firstCoord.parameters.y || 0
              },
              additionalOffset: {
                x: firstCoord.parameters.b || 0,
                y: firstCoord.parameters.c || 0
              },
              gridDistance: firstCoord.parameters.d || 250, // Default 250m
              paperGridDistance: firstCoord.parameters.g || 0
            };
            console.log('Created georeferencing from coordinate parameter:', result.georeferencing);
          }
        }
      }
    } else {
      console.log('No parameterStrings found');
      console.log('Available properties:', Object.keys(ocadData));
      
      // Try alternative property names
      if (ocadData.parameters) {
        console.log('Found parameters property:', ocadData.parameters);
      }
      if (ocadData.scale) {
        console.log('Found scale property:', ocadData.scale);
      }
    }
    
    // Create a simple map bounds polygon instead of extracting all polygons
    if (result.georeferencing) {
      console.log('Creating map bounds polygon from georeferencing');
      
      // Get map bounds from georeferencing
      const mapWidth = 1000; // Default map width in meters (adjust as needed)
      const mapHeight = 1000; // Default map height in meters (adjust as needed)
      
      const centerX = result.georeferencing.realWorldOffset.x;
      const centerY = result.georeferencing.realWorldOffset.y;
      
      // Create a simple rectangular polygon around the map area
      const halfWidth = mapWidth / 2;
      const halfHeight = mapHeight / 2;
      
      const bounds = [
        [centerY - halfHeight, centerX - halfWidth], // Bottom-left
        [centerY - halfHeight, centerX + halfWidth], // Bottom-right
        [centerY + halfHeight, centerX + halfWidth], // Top-right
        [centerY + halfHeight, centerX - halfWidth], // Top-left
        [centerY - halfHeight, centerX - halfWidth]  // Close polygon
      ];
      
      // Convert to lat/lng (simplified conversion)
      const latLngBounds = bounds.map(coord => {
        const lat = coord[0] / 111320; // Rough conversion: 1 degree ≈ 111320 meters
        const lng = coord[1] / (111320 * Math.cos(coord[0] / 111320 * Math.PI / 180));
        return [lat, lng];
      });
      
      result.polygons = [{
        type: 'Polygon',
        coordinates: [latLngBounds]
      }];
      
      console.log('Created map bounds polygon with', latLngBounds.length, 'points');
    } else {
      console.log('No georeferencing found, cannot create map bounds');
    }
    
    // If no georeferencing was found, try alternative approaches
    if (!result.georeferencing) {
      console.log('No georeferencing found, trying alternative approaches...');
      
      // Try to find UTM coordinates in parameter strings
      if (ocadData.parameterStrings) {
        const paramArray = Array.isArray(ocadData.parameterStrings) 
          ? ocadData.parameterStrings 
          : Object.values(ocadData.parameterStrings);
          
        // Look for parameters that might contain UTM coordinates (636049, 6755115)
        const utmParams = paramArray.filter(p => 
          p && p.value && (
            p.value.includes('636049') || 
            p.value.includes('6755115') ||
            p.value.includes('UTM') ||
            p.value.includes('WGS 84')
          )
        );
        
        if (utmParams.length > 0) {
          console.log('Found UTM-related parameters:', utmParams);
          
          // Try to extract coordinates from these parameters
          for (const param of utmParams) {
            console.log('Analyzing UTM parameter:', param);
            
            // Look for coordinate patterns in the value
            const coordMatch = param.value.match(/(\d{6,})/g);
            if (coordMatch && coordMatch.length >= 2) {
              console.log('Found coordinate patterns:', coordMatch);
              
              // Assume first two large numbers are x,y coordinates
              const x = parseFloat(coordMatch[0]);
              const y = parseFloat(coordMatch[1]);
              
              if (x > 100000 && y > 100000) { // Likely UTM coordinates
                result.georeferencing = {
                  realWorldOffset: { x: x, y: y },
                  additionalOffset: { x: 0, y: 0 },
                  gridDistance: 250, // Default grid distance
                  paperGridDistance: 0
                };
                console.log('Created georeferencing from UTM parameters:', result.georeferencing);
                break;
              }
            }
          }
        }
      }
      
      // Try to find scale information in other places
      if (ocadData.header) {
        console.log('Checking header for scale info:', ocadData.header);
      }
      
      // Try to find any coordinate information
      if (ocadData.objects && ocadData.objects.length > 0) {
        console.log('Checking objects for coordinate bounds...');
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        ocadData.objects.forEach(obj => {
          if (obj.coordinates && Array.isArray(obj.coordinates)) {
            obj.coordinates.forEach(coord => {
              if (coord.x !== undefined && coord.y !== undefined) {
                minX = Math.min(minX, coord.x);
                minY = Math.min(minY, coord.y);
                maxX = Math.max(maxX, coord.x);
                maxY = Math.max(maxY, coord.y);
              }
            });
          }
        });
        
        if (minX !== Infinity) {
          console.log('Found coordinate bounds:', { minX, minY, maxX, maxY });
          
          // Create a simple georeferencing based on coordinate bounds
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          
          result.georeferencing = {
            realWorldOffset: {
              x: centerX / 100000, // Convert from 0.01mm to meters
              y: centerY / 100000
            },
            additionalOffset: { x: 0, y: 0 },
            gridDistance: 0,
            paperGridDistance: 0
          };
          
          console.log('Created fallback georeferencing:', result.georeferencing);
        }
      }
    }
    
    // If no data was extracted, provide defaults
    if (!result.scale && !result.polygons.length) {
      console.log('No data extracted, providing defaults');
      result.scale = '1:10000';
    }
    
    // Calculate bounds from all polygons
    if (result.polygons.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      result.polygons.forEach(polygon => {
        polygon.coordinates.forEach(coord => {
          minX = Math.min(minX, coord[0]);
          minY = Math.min(minY, coord[1]);
          maxX = Math.max(maxX, coord[0]);
          maxY = Math.max(maxY, coord[1]);
        });
      });
      
      result.bounds = {
        minX, minY, maxX, maxY,
        centerX: (minX + maxX) / 2,
        centerY: (minY + maxY) / 2
      };
    }
    
    console.log('=== FINAL EXTRACTION RESULT ===');
    console.log('Scale found:', result.scale);
    console.log('Georeferencing found:', result.georeferencing);
    console.log('Polygons found:', result.polygons.length);
    console.log('Bounds found:', result.bounds);
    console.log('Full result object:', JSON.stringify(result, null, 2));
    console.log('=== END FINAL RESULT ===');
    
    return result;
  } catch (error) {
    console.error('Error extracting OCAD data:', error);
    return null;
  }
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
    const allowedTypes = ['.ocd', '.kmz', '.pdf', '.jpg', '.jpeg', '.png', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only OCAD, KMZ, PDF, and image files are allowed.'));
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

// Get all maps
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Fetching maps...');
    console.log('📊 Database connection status:', pool.totalCount, 'total connections');
    
    const result = await pool.query(`
      SELECT 
        m.*,
        u.username as created_by_username,
        COUNT(mf.id) as file_count
      FROM maps m
      LEFT JOIN users u ON m.created_by = u.clerk_id
      LEFT JOIN map_files mf ON m.id = mf.map_id
      GROUP BY m.id, u.username
      ORDER BY m.created_at DESC
    `);

    console.log('✅ Maps query successful, found', result.rows.length, 'maps');
    
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
    
    // Get map details
    const mapResult = await pool.query(`
      SELECT 
        m.*,
        u.username as created_by_username
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
      await pool.query(`
        INSERT INTO users (clerk_id, email, username, password_hash, is_admin) 
        VALUES ($1, $2, $3, $4, $5)
      `, [req.user.id, userEmail, userUsername, passwordHash, req.user.isAdmin]);
      console.log('✅ Created new user:', req.user.id);
    } else {
      // User exists, update if needed
      await pool.query(`
        UPDATE users SET 
          email = COALESCE($2, email),
          username = COALESCE($3, username),
          password_hash = COALESCE($4, password_hash),
          is_admin = $5
        WHERE clerk_id = $1
      `, [req.user.id, userEmail, userUsername, passwordHash, req.user.isAdmin]);
      console.log('✅ Updated existing user:', req.user.id);
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

    // Store only the filename, not the full path
    const fileName = path.basename(req.file.path);

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
router.post('/:id/files', authenticateUser, upload.array('files', 10), async (req, res) => {
  try {
    const mapId = parseInt(req.params.id);
    const { version, isPrimary } = req.body;

    // Verify map exists
    const mapResult = await pool.query('SELECT id FROM maps WHERE id = $1', [mapId]);
    if (mapResult.rows.length === 0) {
      return res.status(404).json({ message: 'Map not found' });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      const fileType = path.extname(file.originalname).toLowerCase().substring(1).toUpperCase();
      
      // Store only the filename, not the full path
      const fileName = path.basename(file.path);
      
      const result = await pool.query(`
        INSERT INTO map_files (
          map_id, filename, original_filename, file_path, file_type, file_size, mime_type, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        mapId,
        fileName, // filename - stored file name
        file.originalname, // original_filename - user's original file name
        fileName, // file_path - same as filename for now
        fileType,
        file.size,
        file.mimetype || 'application/octet-stream', // mime_type
        req.user.id // created_by
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
      } else if (fileType === 'OCD') {
        try {
          // Extract OCAD data for potential auto-filling of map information
          const ocadData = await extractOCADData(file.path);
          
          if (ocadData) {
            // Store OCAD metadata in a separate table or as JSON in map_files
            await pool.query(`
              UPDATE map_files 
              SET metadata = $1 
              WHERE map_id = $2 AND file_path = $3
            `, [JSON.stringify(ocadData), mapId, fileName]);
            
            console.log(`Extracted OCAD data for map ${mapId}:`, {
              scale: ocadData.scale,
              polygonCount: ocadData.polygons.length,
              hasGeoreferencing: !!ocadData.georeferencing
            });
          }

          
        } catch (error) {
          console.error('Error extracting OCAD data:', error);
          // Don't fail the upload if OCAD extraction fails
        }
      } else if (fileType === 'KMZ') {
        try {
          // Extract KMZ data for potential auto-filling of map information
          const kmzData = await extractKMZData(file.path);
          
          if (kmzData) {
            // Store KMZ metadata in a separate table or as JSON in map_files
            await pool.query(`
              UPDATE map_files 
              SET metadata = $1 
              WHERE map_id = $2 AND file_path = $3
            `, [JSON.stringify(kmzData), mapId, fileName]);
            
            console.log(`Extracted KMZ data for map ${mapId}:`, {
              scale: kmzData.scale,
              polygonCount: kmzData.polygons.length,
              hasGeoreferencing: !!kmzData.georeferencing,
              bounds: kmzData.bounds
            });
          }
        } catch (error) {
          console.error('Error extracting KMZ data:', error);
          // Don't fail the upload if KMZ extraction fails
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

// Get KMZ data for a specific file
router.get('/:id/files/:fileId/kmz-data', authenticateUser, async (req, res) => {
  try {
    const mapId = parseInt(req.params.id);
    const fileId = parseInt(req.params.fileId);

    const result = await pool.query(`
      SELECT metadata 
      FROM map_files 
      WHERE id = $1 AND map_id = $2
    `, [fileId, mapId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    const metadata = result.rows[0].metadata;
    
    if (!metadata) {
      return res.status(404).json({ message: 'No KMZ data found for this file' });
    }

    res.json({
      success: true,
      data: metadata
    });
  } catch (error) {
    console.error('Error fetching KMZ data:', error);
    res.status(500).json({ message: 'Error fetching KMZ data' });
  }
});

// Get OCAD data for a specific file
router.get('/:id/files/:fileId/ocad-data', authenticateUser, async (req, res) => {
  try {
    const mapId = parseInt(req.params.id);
    const fileId = parseInt(req.params.fileId);

    // Get file with metadata
    const result = await pool.query(`
      SELECT file_path, metadata 
      FROM map_files 
      WHERE id = $1 AND map_id = $2
    `, [fileId, mapId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    const file = result.rows[0];
    
    if (file.metadata) {
      res.json({
        success: true,
        data: file.metadata
      });
    } else {
      res.json({
        success: false,
        message: 'No OCAD data available for this file'
      });
    }
  } catch (error) {
    console.error('Error fetching OCAD data:', error);
    res.status(500).json({ message: 'Error fetching OCAD data' });
  }
});

module.exports = router;
