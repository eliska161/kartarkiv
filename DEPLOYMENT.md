# Kartarkiv Deployment Guide

## 🚀 Deployment Setup

### 1. Supabase Database Setup

1. Gå til [supabase.com](https://supabase.com)
2. Opprett nytt prosjekt
3. Gå til Settings > Database
4. Kopier connection string
5. Kjør SQL-scriptene i SQL Editor:

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Maps table
CREATE TABLE maps (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scale VARCHAR(50),
    contour_interval INTEGER,
    center_lat DECIMAL(10, 8) NOT NULL,
    center_lng DECIMAL(11, 8) NOT NULL,
    zoom_level INTEGER DEFAULT 10,
    area_bounds JSONB,
    created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Map files table
CREATE TABLE map_files (
    id SERIAL PRIMARY KEY,
    map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(10) NOT NULL,
    file_size INTEGER NOT NULL,
    version INTEGER DEFAULT 1,
    is_primary BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Preview images table
CREATE TABLE preview_images (
    id SERIAL PRIMARY KEY,
    map_id INTEGER REFERENCES maps(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Wasabi Storage Setup

1. Gå til [wasabi.com](https://wasabi.com)
2. Opprett konto og bucket
3. Generer access keys
4. Noter ned:
   - Endpoint: `https://s3.wasabisys.com`
   - Access Key
   - Secret Key
   - Bucket name
   - Region: `us-east-1`

### 3. Railway Backend Deployment

1. Gå til [railway.app](https://railway.app)
2. Connect GitHub repository
3. Deploy backend
4. Legg til environment variables:
   - `DATABASE_URL` (fra Supabase)
   - `WASABI_ENDPOINT`
   - `WASABI_ACCESS_KEY`
   - `WASABI_SECRET_KEY`
   - `WASABI_BUCKET`
   - `WASABI_REGION`
   - `JWT_SECRET`
   - `NODE_ENV=production`

### 4. Netlify Frontend Deployment

1. Gå til [netlify.com](https://netlify.com)
2. Connect GitHub repository
3. Build settings:
   - Build command: `cd client && npm run build`
   - Publish directory: `client/build`
4. Legg til environment variables:
   - `REACT_APP_API_URL` (Railway backend URL)

### 5. Update netlify.toml

Oppdater `netlify.toml` med riktig backend URL:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://your-backend-url.railway.app/api/:splat"
  status = 200
  force = true
```

## 🔧 Post-Deployment

1. Test alle funksjoner
2. Opprett admin bruker
3. Last opp test-kart
4. Verifiser fil-upload til Wasabi

## 💰 Kostnader

- **Netlify**: Gratis
- **Supabase**: Gratis (500MB database)
- **Railway**: Gratis (500 timer/måned)
- **Wasabi**: $5.99/TB/måned

## 📞 Support

Hvis du trenger hjelp med deployment, kontakt meg!
