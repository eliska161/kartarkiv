const AWS = require('aws-sdk');

const b2Region = process.env.B2_REGION || 'us-west-001';
const defaultEndpoint = `https://s3.${b2Region}.backblazeb2.com`;

// Configure Backblaze B2 (S3-compatible)
const b2Client = new AWS.S3({
  endpoint: process.env.B2_ENDPOINT || defaultEndpoint,
  accessKeyId: process.env.B2_KEY_ID,
  secretAccessKey: process.env.B2_APPLICATION_KEY,
  region: b2Region,
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});

// Force update the endpoint and region after creation if explicitly set
if (process.env.B2_ENDPOINT) {
  b2Client.config.endpoint = process.env.B2_ENDPOINT;
}
if (process.env.B2_REGION) {
  b2Client.config.region = process.env.B2_REGION;
}

// Log current configuration
console.log('🔧 Backblaze B2 Configuration:');
console.log('  - Endpoint:', process.env.B2_ENDPOINT || defaultEndpoint);
console.log('  - Region:', process.env.B2_REGION || b2Region);
console.log('  - Bucket:', process.env.B2_BUCKET || 'kartarkiv-storage');
console.log('  - AWS SDK Endpoint:', b2Client.config.endpoint);
console.log('  - AWS SDK Region:', b2Client.config.region);

const bucketName = process.env.B2_BUCKET || 'kartarkiv-storage';

// Upload file to Backblaze B2
const uploadToB2 = async (filePath, key, contentType) => {
  try {
    const fs = require('fs');
    const fileContent = fs.readFileSync(filePath);

    const params = {
      Bucket: bucketName,
      Key: key,
      Body: fileContent,
      ContentType: contentType
      // Removed ACL: 'public-read' - using signed URLs instead
    };

    const result = await b2Client.upload(params).promise();
    console.log('File uploaded to Backblaze B2:', result.Location);
    return result.Location;
  } catch (error) {
    console.error('Error uploading to Backblaze B2:', error);
    throw error;
  }
};

// Delete file from Backblaze B2
const deleteFromB2 = async (key) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: key
    };

    await b2Client.deleteObject(params).promise();
    console.log('File deleted from Backblaze B2:', key);
  } catch (error) {
    console.error('Error deleting from Backblaze B2:', error);
    throw error;
  }
};

// Get file URL from Backblaze B2
const getB2ObjectUrl = (key) => {
  const endpoint = process.env.B2_ENDPOINT || defaultEndpoint;
  return `${endpoint}/${bucketName}/${key}`;
};

// Generate signed URL for file download
const getSignedUrl = (key, expiresIn = 3600) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: key,
      Expires: expiresIn
    };

    console.log('🔧 Generating Backblaze B2 signed URL with params:', {
      bucket: bucketName,
      key: key,
      region: b2Client.config.region,
      endpoint: b2Client.config.endpoint
    });

    const signedUrl = b2Client.getSignedUrl('getObject', params);
    console.log('✅ Generated Backblaze B2 signed URL:', signedUrl);
    return signedUrl;
  } catch (error) {
    console.error('❌ Error generating Backblaze B2 signed URL:', error);
    throw error;
  }
};

module.exports = {
  uploadToB2,
  deleteFromB2,
  getB2ObjectUrl,
  getSignedUrl,
  b2Client,
  bucketName
};
