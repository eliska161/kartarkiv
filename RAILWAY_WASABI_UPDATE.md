# Railway Wasabi Environment Variables Update

## Problem
Getting `SignatureDoesNotMatch` error because the endpoint and region don't match.

## Solution
Update Railway environment variables to use `us-east-1` endpoint and region.

## Steps to Update:

### 1. Go to Railway Dashboard
- Open [Railway Dashboard](https://railway.app)
- Navigate to your backend service

### 2. Update Environment Variables
- Click on **"Variables"** tab
- Find `WASABI_ENDPOINT` and change it to:
  ```
  https://s3.us-east-1.wasabisys.com
  ```
- Find `WASABI_REGION` and change it to:
  ```
  us-east-1
  ```

### 3. Redeploy
- Click **"Deploy"** or wait for automatic redeploy

## Current vs Updated:

### Before (Current):
```
WASABI_ENDPOINT=https://s3.eu-central-2.wasabisys.com
WASABI_REGION=eu-central-2
```

### After (Updated):
```
WASABI_ENDPOINT=https://s3.us-east-1.wasabisys.com
WASABI_REGION=us-east-1
```

## Why This Works:
- Endpoint and region now match
- No data migration needed
- Same bucket, different endpoint
- File downloads will work correctly

## Test After Update:
1. Try downloading a file
2. Check server logs for correct region
3. Verify signed URLs work
