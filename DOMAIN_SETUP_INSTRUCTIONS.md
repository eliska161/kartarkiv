# Domain Setup for kart.eddypartiet.com

## Current Setup
- **Domain**: `kart.eddypartiet.com`
- **Frontend**: Currently on `kartarkiv.netlify.app`
- **Backend**: `kartarkiv-production.up.railway.app`

## Steps to Configure

### 1. Configure Netlify Custom Domain
1. Go to Netlify Dashboard
2. Select your site (kartarkiv)
3. Go to "Domain settings"
4. Click "Add custom domain"
5. Enter: `kart.eddypartiet.com`
6. Follow Netlify's DNS configuration instructions

### 2. Configure DNS Records
You'll need to add these DNS records to your domain provider:

#### Option A: CNAME Record (Recommended)
```
Type: CNAME
Name: kart
Value: kartarkiv.netlify.app
TTL: 3600
```

#### Option B: A Records (Alternative)
```
Type: A
Name: kart
Value: [Netlify IP addresses - provided by Netlify]
TTL: 3600
```

### 3. Update Clerk Production Instance
1. Go to Clerk Dashboard
2. Create production instance
3. Use domain: `https://kart.eddypartiet.com`
4. Follow DNS verification steps

### 4. Update Environment Variables
After Clerk setup, update:
- **Netlify**: `REACT_APP_CLERK_PUBLISHABLE_KEY` (production key)
- **Railway**: `CLERK_SECRET_KEY` (production key)

### 5. Test the Setup
1. Wait for DNS propagation (5-30 minutes)
2. Test `https://kart.eddypartiet.com`
3. Verify authentication works
4. Test map creation and file uploads

## Benefits of This Setup
- ✅ Professional domain name
- ✅ Clerk production instance support
- ✅ Better SEO and branding
- ✅ No development key warnings
- ✅ Higher usage limits

## Next Steps
1. Configure Netlify custom domain
2. Set up DNS records
3. Create Clerk production instance
4. Update environment variables
5. Test the application
