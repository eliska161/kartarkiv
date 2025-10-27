# ✅ Bruk Railway sin Nixpacks base
FROM ghcr.io/railwayapp/nixpacks:ubuntu-latest

# Arbeidsmappe
WORKDIR /app

# ✅ Kopier kun det nødvendige først (for bedre cache)
COPY package*.json ./

# Installer avhengigheter (bruk ci for ren installasjon)
RUN npm ci --omit=dev

# ✅ Kopier resten av appen
COPY . .

# ✅ Ikke bruk ARG eller ENV for secrets her!
# Railway håndterer miljøvariabler automatisk under runtime.

# Sett path for globale bins
RUN printf '\nPATH=/app/node_modules/.bin:$PATH' >> /root/.profile

# Eksponer port hvis nødvendig (Railway detekterer ofte automatisk)
EXPOSE 8080

# ✅ Start kommando
CMD ["npm", "start"]
