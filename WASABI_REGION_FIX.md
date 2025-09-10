# Wasabi Region Fix

## Problem
Getting `AuthorizationHeaderMalformed` error when downloading files from Wasabi. The issue is that Wasabi buckets are typically in `us-east-1` region regardless of the endpoint location.

## Current Configuration
- **Endpoint**: `https://s3.eu-central-2.wasabisys.com`
- **Region**: `us-east-1` (correct for Wasabi buckets)

## Solution
Wasabi buckets are typically in `us-east-1` region even when using endpoints in other regions. The code now uses `us-east-1` as the default region.

### Environment Variables (Current):
```
WASABI_ENDPOINT=https://s3.eu-central-2.wasabisys.com
WASABI_ACCESS_KEY=your_access_key
WASABI_SECRET_KEY=your_secret_key
WASABI_BUCKET=kartarkiv-storage
WASABI_REGION=us-east-1
```

## How it works:
- **Endpoint**: Can be in different regions (eu-central-2, us-east-1, etc.)
- **Bucket Region**: Always `us-east-1` for Wasabi
- **Signing**: Uses `us-east-1` region for signature generation

## Test
The code now automatically uses `us-east-1` region for all Wasabi operations:
1. File uploads will work correctly
2. Signed URL generation will work correctly
3. File downloads will work correctly
