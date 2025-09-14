# Railway CLI Setup for Server Restart

For å bruke Railway CLI for server restart, må du sette opp følgende miljøvariabler:

## 1. Få Railway Token

1. Gå til [Railway Dashboard](https://railway.app/dashboard)
2. Klikk på din profil (øverst til høyre)
3. Velg "Account Settings"
4. Gå til "Tokens" tab
5. Klikk "New Token"
6. Gi den et navn (f.eks. "kartarkiv-restart")
7. Kopier tokenet

## 2. Få Project ID

1. Gå til ditt prosjekt i Railway Dashboard
2. Klikk på "Settings" tab
3. Scroll ned til "General" seksjon
4. Kopier "Project ID"

## 3. Sett miljøvariabler i Railway

I Railway Dashboard, gå til ditt prosjekt:

1. Klikk på "Variables" tab
2. Legg til følgende variabler:

```
RAILWAY_TOKEN=your_token_here
RAILWAY_PROJECT_ID=your_project_id_here
```

## 4. Test Railway CLI

Du kan teste om CLI fungerer ved å kjøre:

```bash
npx @railway/cli status
```

## 5. Alternativ: Bruk process.exit fallback

Hvis Railway CLI ikke fungerer, vil systemet automatisk falle tilbake til `process.exit(1)` som også triggerer en restart i Railway.

## Troubleshooting

- **"railway: not found"**: Railway CLI er ikke installert - sjekk at `@railway/cli` er i package.json
- **"Authentication required"**: RAILWAY_TOKEN er ikke satt eller er ugyldig
- **"Project not found"**: RAILWAY_PROJECT_ID er ikke satt eller er feil
- **"Command timeout"**: CLI kommandoen tok for lang tid - sjekk Railway status
