# Railway Environment Variables Update - URGENT

## Problem
Wasabi signed URLs are still using `s3.eu-central-2.wasabisys.com` instead of `s3.us-east-1.wasabisys.com`.

## Solution
Update Railway environment variables to use `us-east-1` endpoint.

## Steps to Update:

### 1. Go to Railway Dashboard
- Open [Railway Dashboard](https://railway.app)
- Navigate to your backend service (kartarkiv-server)

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

## Verify Update
After redeploy, check Railway logs for:
```
🔧 Wasabi Configuration:
  - Endpoint: https://s3.us-east-1.wasabisys.com
  - Region: us-east-1
  - Bucket: kartarkiv-storage
  - AWS SDK Endpoint: https://s3.us-east-1.wasabisys.com
  - AWS SDK Region: us-east-1
```

## Current vs Required:

### Current (Wrong):
```
WASABI_ENDPOINT=https://s3.eu-central-2.wasabisys.com
WASABI_REGION=eu-central-2
```

### Required (Correct):
```
WASABI_ENDPOINT=https://s3.us-east-1.wasabisys.com
WASABI_REGION=us-east-1
```

## Why This Fixes It:
- Endpoint and region will match
- Signed URLs will use correct endpoint
- File downloads will work correctly
