# Clerk Production Setup Instructions

## Problem
The application is currently using Clerk development keys in production, which causes the warning:
"Clerk: Clerk has been loaded with development keys. Development instances have strict usage limits and should not be used when deploying your application to production."

## Steps to Fix

### 1. Create Production Instance in Clerk
1. Go to https://dashboard.clerk.com
2. Click on "Development" at the top to open the dropdown menu
3. Select "Create production instance"
4. Choose to clone settings from development instance or start fresh
5. Note: Some sensitive settings like SSO connections won't be copied

### 2. Configure DNS Records
1. After creating production instance, Clerk will provide DNS records
2. Add these DNS records to your domain (kart.eddypartiet.com)
3. This is required for Clerk to handle authentication on your domain

### 3. Get Production API Keys
1. In Clerk Dashboard, go to "Configure" > "API Keys"
2. Copy the production keys:
   - `REACT_APP_CLERK_PUBLISHABLE_KEY` (starts with `pk_live_...`)
   - `CLERK_SECRET_KEY` (starts with `sk_live_...`)

### 4. Create Production Instance
1. In Clerk Dashboard, click "Create production instance"
2. Enter application domain: `https://kart.eddypartiet.com`
3. Follow the setup wizard

### 5. Update Environment Variables

#### Netlify (Frontend)
1. Go to Netlify Dashboard
2. Select your site (kartarkiv)
3. Go to "Site settings" > "Environment variables"
4. Update `REACT_APP_CLERK_PUBLISHABLE_KEY` with the production key

#### Railway (Backend)
1. Go to Railway Dashboard
2. Select your project
3. Go to "Variables" tab
4. Update `CLERK_SECRET_KEY` with the production key

### 5. Set Up OAuth Credentials
1. In Clerk Dashboard, go to "Configure" > "SSO Connections"
2. Set up OAuth credentials for any social login providers you want to support
3. Development mode uses shared OAuth credentials, but production needs your own

### 6. Redeploy Applications
1. Redeploy both frontend (Netlify) and backend (Railway)
2. This ensures the new environment variables are loaded

## Verification
After completing these steps:
- The Clerk development keys warning should disappear
- Authentication should work with production keys
- No more usage limit restrictions
- Better security and performance

## Important Notes
- Production keys have higher usage limits
- Better security and performance
- Required for production deployment
- OAuth credentials must be set up separately for production
