# EOK Kartarkiv

Et moderne, internettbasert kartarkiv for Elverum Orienteringsklubb (EOK). Dette systemet lar medlemmer se, søke og laste ned orienteringskart på en enkel og effektiv måte.

## Funksjoner

### For alle brukere:
- 🔐 Sikker innlogging og registrering
- 🗺️ Interaktivt kart med OpenStreetMap
- 📍 Visuell oversikt over kartområder
- 🔍 Avansert søk og filtrering
- 📱 Responsiv design for alle enheter
- ⬇️ Nedlasting av OCAD og PDF-filer

### For administratorer:
- 👥 Brukeradministrasjon
- ➕ Legge til nye kart
- 📊 Statistikk og oversikt
- 🗂️ Filhåndtering
- ⚙️ Kartmetadata og versjonering

## Teknisk oversikt

### Frontend
- **React 18** med TypeScript
- **Tailwind CSS** for styling
- **Leaflet.js** for interaktive kart
- **React Router** for navigasjon
- **Axios** for API-kommunikasjon

### Backend
- **Node.js** med Express
- **PostgreSQL** database
- **JWT** autentisering
- **Multer** for filopplasting
- **bcryptjs** for passordhashing

## Installasjon og oppsett

### Forutsetninger
- Node.js (v16 eller nyere)
- PostgreSQL (v12 eller nyere)
- npm eller yarn

### 1. Klon repository
```bash
git clone <repository-url>
cd kartarkiv
```

### 2. Installer avhengigheter
```bash
npm run install-all
```

### 3. Database-oppsett
```bash
# Opprett PostgreSQL database
createdb kartarkiv

# Kjør database-schema
psql kartarkiv < server/database/schema.sql
```

### 4. Miljøvariabler
Kopier `server/env.example` til `server/.env` og fyll ut verdiene:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kartarkiv
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# File Upload Configuration
MAX_FILE_SIZE=50MB
UPLOAD_PATH=./uploads

# Admin Configuration
ADMIN_EMAIL=admin@eok.no
ADMIN_PASSWORD=admin123
```

### 5. Start utviklingsserver
```bash
npm run dev
```

Dette starter både backend (port 5000) og frontend (port 3000).

## Bruk

### Første gang
1. Gå til `http://localhost:3000`
2. Registrer en ny bruker eller logg inn
3. Den første brukeren kan få admin-rettigheter ved å endre `is_admin` til `true` i databasen

### Legge til kart (Admin)
1. Logg inn som administrator
2. Gå til Admin-dashboard
3. Klikk "Legg til kart"
4. Fyll ut kartinformasjon:
   - Kartnavn
   - Beskrivelse
   - Målestokk (f.eks. 1:10000)
   - Ekvidistanse (f.eks. 2.5m)
   - Posisjon (breddegrad/lengdegrad)
5. Last opp filer (OCAD, PDF, bilder)
6. Lagre kartet

### Bruke kartarkivet
1. Se oversikt over alle kart på hovedsiden
2. Bruk søkefunksjonen for å finne spesifikke kart
3. Filtrer på målestokk eller ekvidistanse
4.  kartmarkører for å se detaljer
5. Last ned filer i ønsket format

## Database-schema

### Users
- Brukerinformasjon og autentisering
- Admin-rettigheter
- Aktiv/inaktiv status

### Maps
- Kartmetadata
- Posisjon og zoom-nivå
- GeoJSON for kartområder

### Map_files
- Filreferanser
- Versjonering
- Filtyper (OCAD, PDF, bilder)

### Map_metadata
- Tilleggsinformasjon
- Fleksibel nøkkel-verdi struktur

## Sikkerhet

- JWT-basert autentisering
- Passordhashing med bcrypt
- Admin-beskyttede endepunkter
- Filvalidering ved opplasting
- CORS-konfigurasjon

## Deployment

### Produksjon
1. Sett `NODE_ENV=production`
2. Konfigurer produksjonsdatabase
3. Bruk reverse proxy (nginx)
4. SSL-sertifikat for HTTPS
5. Backup-strategi for filer og database

### Docker (valgfritt)
```bash
# Bygg og kjør med Docker Compose
docker-compose up -d
```

## Utvikling

### Kode-struktur
```
kartarkiv/
├── client/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── contexts/
│   │   └── ...
├── server/          # Node.js backend
│   ├── routes/
│   ├── middleware/
│   ├── database/
│   └── ...
└── README.md
```

### Tilgjengelige scripts
- `npm run dev` - Start utviklingsserver
- `npm run build` - Bygg for produksjon
- `npm run server` - Start kun backend
- `npm run client` - Start kun frontend

## Bidrag

1. Fork repository
2. Opprett feature branch
3. Commit endringer
4. Push til branch
5. Opprett Pull Request

## Lisens

MIT License - se LICENSE-fil for detaljer.

## Kontakt

For spørsmål eller støtte, kontakt Elias eller EOK-administrasjonen.

---

**EOK Kartarkiv** - Moderne kartløsning for Elverum Orienteringsklubb 🗺️
