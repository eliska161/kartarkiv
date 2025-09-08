const AWS = require('aws-sdk');

// Configure Wasabi (S3-compatible)
const wasabi = new AWS.S3({
  endpoint: process.env.WASABI_ENDPOINT || 'https://s3.wasabisys.com',
  accessKeyId: process.env.WASABI_ACCESS_KEY,
  secretAccessKey: process.env.WASABI_SECRET_KEY,
  region: process.env.WASABI_REGION || 'us-east-1',
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});

const bucketName = process.env.WASABI_BUCKET || 'kartarkiv-storage';

// Upload file to Wasabi
const uploadToWasabi = async (filePath, key, contentType) => {
  try {
    const fs = require('fs');
    const fileContent = fs.readFileSync(filePath);
    
    const params = {
      Bucket: bucketName,
      Key: key,
      Body: fileContent,
      ContentType: contentType,
      ACL: 'public-read'
    };
    
    const result = await wasabi.upload(params).promise();
    console.log('File uploaded to Wasabi:', result.Location);
    return result.Location;
  } catch (error) {
    console.error('Error uploading to Wasabi:', error);
    throw error;
  }
};

// Delete file from Wasabi
const deleteFromWasabi = async (key) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: key
    };
    
    await wasabi.deleteObject(params).promise();
    console.log('File deleted from Wasabi:', key);
  } catch (error) {
    console.error('Error deleting from Wasabi:', error);
    throw error;
  }
};

// Get file URL from Wasabi
const getWasabiUrl = (key) => {
  return `${process.env.WASABI_ENDPOINT}/${bucketName}/${key}`;
};

module.exports = {
  uploadToWasabi,
  deleteFromWasabi,
  getWasabiUrl,
  wasabi,
  bucketName
};
