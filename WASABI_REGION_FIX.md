# Wasabi Region Fix

## Problem
Getting `SignatureDoesNotMatch` error when downloading files from Wasabi. The issue is that the region in the signature doesn't match the Wasabi endpoint.

## Current Configuration
- **Endpoint**: `https://s3.eu-central-2.wasabisys.com`
- **Region**: `us-east-1` (default, but should be `eu-central-2`)

## Solution
Update the Railway environment variable to use the correct region:

### In Railway Dashboard:
1. Go to your Railway project
2. Click on the backend service
3. Go to "Variables" tab
4. Update `WASABI_REGION` to: `eu-central-2`

### Environment Variables to Set:
```
WASABI_ENDPOINT=https://s3.eu-central-2.wasabisys.com
WASABI_ACCESS_KEY=your_access_key
WASABI_SECRET_KEY=your_secret_key
WASABI_BUCKET=kartarkiv-storage
WASABI_REGION=eu-central-2
```

## Alternative: Auto-Detection
The code now auto-detects the region from the endpoint if `WASABI_REGION` is not set, but it's better to set it explicitly.

## Test
After updating the environment variable:
1. Redeploy the backend service
2. Try downloading a file
3. Check that the signed URL works correctly
