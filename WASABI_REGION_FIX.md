# Wasabi Region Fix

## Problem
Getting `SignatureDoesNotMatch` error when downloading files from Wasabi. The issue is that the region used for signing must match the endpoint region.

## Current Configuration
- **Endpoint**: `https://s3.eu-central-2.wasabisys.com`
- **Bucket**: `kartarkiv-storage`
- **Region**: `eu-central-2` (must match endpoint region)

## Solution
The region used for signing must match the endpoint region. The code now auto-detects the region from the endpoint URL.

### Environment Variables (Current):
```
WASABI_ENDPOINT=https://s3.eu-central-2.wasabisys.com
WASABI_ACCESS_KEY=your_access_key
WASABI_SECRET_KEY=your_secret_key
WASABI_BUCKET=kartarkiv-storage
WASABI_REGION=eu-central-2
```

## How it works:
- **Endpoint**: `s3.eu-central-2.wasabisys.com`
- **Region**: `eu-central-2` (auto-detected from endpoint)
- **Signing**: Uses `eu-central-2` region for signature generation
- **Auto-detection**: Code automatically detects region from endpoint URL

## Test
The code now automatically detects the correct region from the endpoint:
1. File uploads will work correctly
2. Signed URL generation will work correctly
3. File downloads will work correctly
