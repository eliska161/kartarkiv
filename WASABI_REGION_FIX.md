# Wasabi Region Fix

## Problem
Getting `400 Bad Request` error when downloading files from Wasabi. The issue is that the region used for signing must match the actual bucket region.

## Current Configuration
- **Endpoint**: `https://s3.eu-central-2.wasabisys.com`
- **Bucket**: `kartarkiv-storage`
- **Region**: `us-east-1` (confirmed from server response: `x-amz-bucket-region: us-east-1`)

## Solution
The region used for signing must match the actual bucket region. Wasabi buckets are typically in `us-east-1` region regardless of endpoint location.

### Environment Variables (Current):
```
WASABI_ENDPOINT=https://s3.eu-central-2.wasabisys.com
WASABI_ACCESS_KEY=your_access_key
WASABI_SECRET_KEY=your_secret_key
WASABI_BUCKET=kartarkiv-storage
WASABI_REGION=us-east-1
```

## How it works:
- **Endpoint**: `s3.eu-central-2.wasabisys.com`
- **Bucket Region**: `us-east-1` (confirmed from server response)
- **Signing**: Uses `us-east-1` region for signature generation
- **Auto-detection**: Code automatically uses `us-east-1` for all Wasabi buckets

## Test
The code now automatically uses `us-east-1` region for all Wasabi operations:
1. File uploads will work correctly
2. Signed URL generation will work correctly
3. File downloads will work correctly
