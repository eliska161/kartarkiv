# 🚀 Kartarkiv Deployment Guide med Supabase Auth

## Oversikt
Denne guiden viser hvordan du deployer kartarkiv-systemet med:
- **Frontend**: Netlify
- **Backend**: Railway
- **Database**: Supabase (PostgreSQL + Auth)
- **Storage**: Wasabi (S3-compatible)

## Steg 1: Supabase Database Setup

### 1.1 Opprett Supabase Prosjekt
1. Gå til [supabase.com](https://supabase.com) og opprett konto
2. Klikk "New Project"
3. Velg organisasjon og gi prosjektet navn: `kartarkiv`
4. Velg region: `Europe West (Ireland)`
5. Velg database password (husk dette!)
6. Klikk "Create new project"

### 1.2 Database Schema Setup
1. Gå til SQL Editor i Supabase dashboard
2. Klikk "New query"
3. Kopier og lim inn dette SQL-scriptet:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table for Clerk integration
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create maps table
CREATE TABLE IF NOT EXISTS public.maps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  scale TEXT,
  contour_interval TEXT,
  center_lat DECIMAL(10, 8),
  center_lng DECIMAL(11, 8),
  area_bounds JSONB,
  preview_image TEXT,
  created_by TEXT REFERENCES public.users(clerk_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create map_files table
CREATE TABLE IF NOT EXISTS public.map_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  map_id UUID REFERENCES public.maps(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  version INTEGER DEFAULT 1,
  is_primary BOOLEAN DEFAULT false,
  created_by TEXT REFERENCES public.users(clerk_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create preview_images table
CREATE TABLE IF NOT EXISTS public.preview_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  map_id UUID REFERENCES public.maps(id) ON DELETE CASCADE,
  image_name TEXT NOT NULL,
  image_path TEXT NOT NULL,
  created_by TEXT REFERENCES public.users(clerk_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.settings (key, value) VALUES 
('site_name', '"Kartarkiv"'),
('site_description', '"Din digitale kartarkiv"'),
('logo_url', 'null'),
('default_map_center', '{"lat": 60.8832, "lng": 11.5519}')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preview_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create RLS policies after tables and functions are created

-- Users can read their own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid()::text = id::text);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Everyone can read maps
CREATE POLICY "Everyone can read maps" ON public.maps
  FOR SELECT USING (true);

-- Authenticated users can create maps
CREATE POLICY "Authenticated users can create maps" ON public.maps
  FOR INSERT WITH CHECK (auth.uid()::text = created_by::text);

-- Users can update their own maps
CREATE POLICY "Users can update own maps" ON public.maps
  FOR UPDATE USING (auth.uid()::text = created_by::text);

-- Users can delete their own maps
CREATE POLICY "Users can delete own maps" ON public.maps
  FOR DELETE USING (auth.uid()::text = created_by::text);

-- Everyone can read map files
CREATE POLICY "Everyone can read map files" ON public.map_files
  FOR SELECT USING (true);

-- Authenticated users can create map files
CREATE POLICY "Authenticated users can create map files" ON public.map_files
  FOR INSERT WITH CHECK (auth.uid()::text = created_by::text);

-- Users can update their own map files
CREATE POLICY "Users can update own map files" ON public.map_files
  FOR UPDATE USING (auth.uid()::text = created_by::text);

-- Users can delete their own map files
CREATE POLICY "Users can delete own map files" ON public.map_files
  FOR DELETE USING (auth.uid()::text = created_by::text);

-- Everyone can read preview images
CREATE POLICY "Everyone can read preview images" ON public.preview_images
  FOR SELECT USING (true);

-- Authenticated users can create preview images
CREATE POLICY "Authenticated users can create preview images" ON public.preview_images
  FOR INSERT WITH CHECK (auth.uid()::text = created_by::text);

-- Users can update their own preview images
CREATE POLICY "Users can update own preview images" ON public.preview_images
  FOR UPDATE USING (auth.uid()::text = created_by::text);

-- Users can delete their own preview images
CREATE POLICY "Users can delete own preview images" ON public.preview_images
  FOR DELETE USING (auth.uid()::text = created_by::text);

-- Everyone can read settings
CREATE POLICY "Everyone can read settings" ON public.settings
  FOR SELECT USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update settings" ON public.settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id::text = auth.uid()::text AND role = 'admin'
    )
  );
```

4. Klikk "Run" for å kjøre scriptet

### 1.3 Supabase Auth Setup
1. Gå til Authentication > Settings i Supabase dashboard
2. Under "Site URL" skriv: `http://localhost:3000` (for testing)
3. Under "Redirect URLs" legg til:
   - `http://localhost:3000`
   - `https://your-netlify-app.netlify.app` (din Netlify URL)
4. Under "Email" aktiver:
   - ✅ Enable email confirmations
   - ✅ Enable email change confirmations
5. Klikk "Save"

### 1.4 Hent Supabase Credentials
1. Gå til Settings > API i Supabase dashboard
2. Kopier:
   - **Project URL** (SUPABASE_URL)
   - **anon public** key (SUPABASE_ANON_KEY)
   - **service_role** key (SUPABASE_SERVICE_ROLE_KEY)

## Steg 2: Wasabi Storage Setup

### 2.1 Opprett Wasabi Konto
1. Gå til [wasabi.com](https://wasabi.com) og opprett konto
2. Velg "Free Trial" (1TB gratis i 30 dager)
3. Bekreft e-postadresse

### 2.2 Opprett Bucket
1. Logg inn på Wasabi Console
2. Klikk "Create Bucket"
3. Gi bucket navn: `kartarkiv-maps`
4. Velg region: `us-east-1`
5. Klikk "Create Bucket"

### 2.3 Hent Access Keys
1. Gå til "Access Keys" i Wasabi Console
2. Klikk "Create New Access Key"
3. Gi navn: `kartarkiv-access`
4. Kopier:
   - **Access Key ID**
   - **Secret Access Key**

## Steg 3: Railway Backend Deployment

### 3.1 Opprett Railway Konto
1. Gå til [railway.app](https://railway.app) og opprett konto
2. Klikk "New Project"
3. Velg "Deploy from GitHub repo"
4. Velg din kartarkiv repository

### 3.2 Konfigurer Environment Variables
I Railway dashboard, gå til Variables og legg til:

```
PORT=5000
NODE_ENV=production
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
WASABI_ENDPOINT=https://s3.wasabisys.com
WASABI_ACCESS_KEY=your_wasabi_access_key
WASABI_SECRET_KEY=your_wasabi_secret_key
WASABI_BUCKET=kartarkiv-maps
WASABI_REGION=us-east-1
```

### 3.3 Deploy
1. Railway vil automatisk deploye når du pusher til GitHub
2. Vent på at deployment fullføres
3. Kopier Railway URL (f.eks. `https://kartarkiv-production.up.railway.app`)

## Steg 4: Netlify Frontend Deployment

### 4.1 Opprett Netlify Konto
1. Gå til [netlify.com](https://netlify.com) og opprett konto
2. Klikk "New site from Git"
3. Velg GitHub og din kartarkiv repository

### 4.2 Konfigurer Build Settings
- **Build command**: `cd client && npm install && npm run build`
- **Publish directory**: `client/build`

### 4.3 Konfigurer Environment Variables
I Netlify dashboard, gå til Site settings > Environment variables og legg til:

```
REACT_APP_API_URL=https://your-railway-app.up.railway.app
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4.4 Deploy
1. Klikk "Deploy site"
2. Vent på at build fullføres
3. Kopier Netlify URL (f.eks. `https://kartarkiv.netlify.app`)

## Steg 5: Oppdater Supabase Redirect URLs

1. Gå tilbake til Supabase dashboard
2. Gå til Authentication > Settings
3. Under "Redirect URLs" legg til din Netlify URL:
   - `https://your-netlify-app.netlify.app`
4. Klikk "Save"

## Steg 6: Opprett Admin Bruker

### 6.1 Opprett første bruker
1. Gå til din Netlify URL
2. Klikk "Registrer" og opprett en bruker
3. Bekreft e-postadresse

### 6.2 Gjør bruker til admin
1. Gå til Supabase dashboard
2. Gå til Table Editor > users
3. Finn din bruker og endre `role` fra `user` til `admin`
4. Klikk "Save"

## Steg 7: Test Deployment

### 7.1 Test Frontend
1. Gå til din Netlify URL
2. Test registrering og innlogging
3. Test å opprette kart
4. Test å laste opp filer

### 7.2 Test Backend
1. Gå til `https://your-railway-app.up.railway.app/api/health`
2. Du skal se: `{"status":"OK","message":"Kartarkiv server is running"}`

### 7.3 Test Database
1. Gå til Supabase dashboard
2. Sjekk at data blir lagret i tabellene

## Steg 8: Oppdater netlify.toml

Oppdater `netlify.toml` med din Railway URL:

```toml
[build]
  command = "cd client && npm install && npm run build"
  publish = "client/build"

[[redirects]]
  from = "/api/*"
  to = "https://your-railway-app.up.railway.app/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Steg 9: Final Deployment

1. Commit og push alle endringer:
   ```bash
   git add .
   git commit -m "Add Supabase Auth integration"
   git push
   ```

2. Netlify og Railway vil automatisk redeploye

## Feilsøking

### Database Connection Issues
- Sjekk at SUPABASE_URL og SUPABASE_ANON_KEY er riktig
- Sjekk at RLS policies er aktivert

### Auth Issues
- Sjekk at redirect URLs er riktig konfigurert
- Sjekk at e-post bekreftelse er aktivert

### File Upload Issues
- Sjekk at Wasabi credentials er riktig
- Sjekk at bucket eksisterer og er tilgjengelig

### CORS Issues
- Sjekk at Railway URL er riktig i Netlify environment variables
- Sjekk at netlify.toml redirects er riktig konfigurert

## Kostnader

### Gratis Tier Limits:
- **Supabase**: 500MB database, 50MB file storage, 50,000 monthly active users
- **Netlify**: 100GB bandwidth, 300 build minutes
- **Railway**: $5 gratis kreditt (ca. 500 timer)
- **Wasabi**: 1TB gratis i 30 dager, deretter $5.99/TB/måned

### Oppgradering:
- **Supabase Pro**: $25/måned for mer storage og features
- **Netlify Pro**: $19/måned for mer bandwidth
- **Railway Pro**: $5/måned for mer resources
- **Wasabi**: $5.99/TB/måned for storage

## Sikkerhet

- Alle API endpoints er beskyttet med Supabase Auth
- Row Level Security (RLS) er aktivert på alle tabeller
- File uploads er validerte og sikre
- Environment variables er ikke eksponert i frontend

## Vedlikehold

- Overvåk Railway logs for feil
- Overvåk Supabase usage for limits
- Backup database regelmessig
- Oppdater dependencies regelmessig

---

**🎉 Gratulerer! Din kartarkiv-app er nå deployet og tilgjengelig på internett!**
