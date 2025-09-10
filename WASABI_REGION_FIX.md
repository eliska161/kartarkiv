# Wasabi Region Fix

## Problem
Getting `AuthorizationHeaderMalformed` error when downloading files from Wasabi. The issue is that the region used for signing must match the endpoint region.

## Solution: Change Endpoint to us-east-1
Change the Wasabi endpoint to use `us-east-1` region to match the bucket region.

### Environment Variables (Updated):
```
WASABI_ENDPOINT=https://s3.us-east-1.wasabisys.com
WASABI_ACCESS_KEY=your_access_key
WASABI_SECRET_KEY=your_secret_key
WASABI_BUCKET=kartarkiv-storage
WASABI_REGION=us-east-1
```

## How to Update:
1. Go to Railway dashboard
2. Navigate to your backend service
3. Go to "Variables" tab
4. Update `WASABI_ENDPOINT` to: `https://s3.us-east-1.wasabisys.com`
5. Update `WASABI_REGION` to: `us-east-1`
6. Redeploy the service

## How it works:
- **Endpoint**: `s3.us-east-1.wasabisys.com`
- **Region**: `us-east-1` (matches endpoint)
- **Signing**: Uses `us-east-1` region for signature generation
- **Auto-detection**: Code automatically detects region from endpoint URL

## Test
After updating the environment variables:
1. File uploads will work correctly
2. Signed URL generation will work correctly
3. File downloads will work correctly
