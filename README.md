# Kartarkiv monorepo

Kartarkiv er nå en multi-klubb SaaS-løsning for kartforvaltning. Repositoriet inneholder den Express-baserte backend-en under `server/` og en React-frontend under `client/`.

## Høydepunkter

- Landing page på `/` med produktinformasjon, priser og tilgangsskjema som sender forespørsler til `/api/requests`.
- Invitasjonsbasert onboarding der superadministratorer kan behandle forespørsler og invitere klubber via Clerk.
- Nytt Kartarkiv-brand med primærfargen `#109771`, oppdaterte logoer og manifest.

## Miljøvariabler

Se `.env.example` for en oppdatert oversikt over nødvendige nøkler for både klient og server.

## Lokal utvikling

1. Installer avhengigheter for både rotpakke og API-workspace:
   ```bash
   npm install
   npm install --prefix server
   ```
   Hvis miljøet ditt er bak en proxy som blokkerer enkelte npm-tarballer (for eksempel `simple-swizzle@0.2.3`), kan installasjonen feile med `403 Forbidden`. Forsøk igjen når proxyen åpner eller bruk et speil. Server-workspacet avhenger ikke lenger av `@railway/cli`-binæren.
2. Start API-et lokalt:
   ```bash
   npm start
   ```
   Kommandoen kjører `node server/index.js` og forventer miljøvariablene definert i `.env`.
3. Start React-klienten i egen terminal:
   ```bash
   cd client
   npm install
   npm start
   ```

Frontend-en kjører på `http://localhost:3000`, mens API-et eksponeres på `http://localhost:5001` som standard.

## Database og multitenant-oppsett

1. Kjør den nye migrasjonen for klubber og tilgangsforespørsler mot Supabase-instansen:
   ```bash
   psql "$DATABASE_URL" -f supabase/migrations/20240213000000_multitenant.sql
   ```
2. Migrasjonen oppretter `clubs` og `access_requests`, legger til `club_id` på eksisterende tabeller (inkludert `club_invoices`) og aktiverer RLS som sjekker Clerk sitt `organization_id`-claim.
3. Når backend-en kjører med service role-tilgang bør hver API-forespørsel sette `app.current_clerk_org_id`/`app.current_club_id`. Middleware gjør dette basert på Clerk-tokenet slik at Postgres-policyene gjelder.
4. Eksisterende EOK-data kan knyttes til en ny klubb med en enkel `UPDATE ... SET club_id = '<uuid>'` for hver tabell etter migrasjonen.

### Stripe-konfigurasjon

Betalingsfanen i adminpanelet bruker Stripe Checkout for kortbetalinger. Sett følgende miljøvariabler før backend-en startes:

| Variabel | Beskrivelse |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe sitt hemmelige API-nøkkel. |
| `CLIENT_BASE_URL` | URL-en klienten kjører på (brukes som redirect fra Stripe). |

Når variablene er satt kan superadministratorer opprette fakturaer, og klubbene kan betale via kort eller be om faktura.

### Mapbox adresse-autoutfylling

Fakturamodalen støtter Mapbox Address Autofill slik at klubbens fakturaadresse kan kvalitetssikres automatisk. Funksjonen aktiveres ved å legge en Mapbox Search access token i klientmiljøet:

```
REACT_APP_MAPBOX_ACCESS_TOKEN=<din Mapbox access token>
```

Følg disse stegene for å sette opp en token som fungerer både lokalt og i produksjon:

1. Opprett/logg inn på en Mapbox-konto på [mapbox.com](https://www.mapbox.com/).
2. Gå til **Account** → **Tokens** og opprett en ny token av typen «Public».
3. Under **Token scopes** må du aktivere `SEARCH:READ` og `ADDRESS:READ`.
4. Legg til domenene som skal bruke autofyll under *URL restrictions*.
5. Kopier tokenen (starter med `pk.`) og legg den i `client/.env.local` som `REACT_APP_MAPBOX_ACCESS_TOKEN`.

Hvis variabelen ikke er satt fungerer skjemaet fortsatt, men brukeren må skrive inn adressen manuelt.

## API

Backend-en eksponerer følgende kjerneendepunkter for multitenant-flyten:

- `POST /api/requests` – offentlig skjema som lagrer nye oppføringer i `access_requests`.
- `GET /api/requests` – superadministratorer kan se køen av forespørsler.
- `POST /api/requests/:id/approve` – superadministratorer godkjenner, oppretter klubb + Clerk-organisasjon og Stripe-kunde.
- `POST /api/requests/:id/reject` – superadministratorer avviser med begrunnelse.
- `GET /api/club` – authed klubbmedlemmer henter branding-/profilinfo for sin organisasjon.
- `PATCH /api/club` – klubbadministratorer oppdaterer navn, logo og primærfarge.
- `POST /api/stripe/webhook` – Stripe webhook for å oppdatere `club_invoices` når betalingen endrer status.

Swagger-dokumentasjonen er oppdatert og tilgjengelig på:

* `http://localhost:5001/api-doc` – HTML-oversikt.
* `http://localhost:5001/docs` – interaktiv Swagger UI.
* `http://localhost:5001/docs-json` – rå OpenAPI JSON.

## Testing

Root-pakken eksponerer foreløpig et placeholder-testscript som skriver `No tests specified`. Legg til tester under respektive workspaces (`server/` eller `client/`) og koble dem inn i `package.json` når de er klare.
