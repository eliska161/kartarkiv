# File Storage Fix

## Problem
Files are stored locally on Railway server, which means they disappear when the server restarts. This causes 404 errors when trying to download files.

## Current Issues
1. Files stored in `uploads/maps/` directory locally
2. Railway doesn't have persistent storage
3. Files disappear on server restart
4. Frontend gets 404 errors when downloading

## Solutions

### Option 1: Configure Wasabi (Recommended)
1. **Set up Wasabi account** and get credentials
2. **Add environment variables to Railway:**
   - `WASABI_ENDPOINT=https://s3.wasabisys.com`
   - `WASABI_ACCESS_KEY=your_access_key`
   - `WASABI_SECRET_KEY=your_secret_key`
   - `WASABI_BUCKET=your_bucket_name`
   - `WASABI_REGION=us-east-1`

3. **Update file upload to use Wasabi** instead of local storage

### Option 2: Use Railway Volumes (Alternative)
1. **Add Railway volume** for persistent storage
2. **Mount volume** to `/app/uploads`
3. **Keep current local storage** approach

### Option 3: Use Netlify for File Storage (Quick Fix)
1. **Store files in Netlify** instead of Railway
2. **Use Netlify's file storage** capabilities

## Immediate Fix Needed
The current file upload system needs to be updated to use cloud storage instead of local storage to prevent file loss on server restarts.

## Next Steps
1. Choose storage solution (Wasabi recommended)
2. Configure environment variables
3. Update file upload code to use cloud storage
4. Test file upload and download functionality
