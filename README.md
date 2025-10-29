# Kartarkiv monorepo

This repository contains the Express-based backend under `server/` and a React frontend under `client/`.

## Local development

1. Install dependencies for both the root package and the API workspace:
   ```bash
   npm install
   npm install --prefix server
   ```
   If your environment is behind a proxy that blocks some npm tarballs (for example `simple-swizzle@0.2.3`), installation might fail with a `403 Forbidden` error. In that case retry once the proxy allows access or use an alternate registry that mirrors the public npm packages. The server workspace no longer depends on the `@railway/cli` binary so installation succeeds even without outbound GitHub access.
2. Start the API locally:
   ```bash
   npm start
   ```
   The command runs `node server/index.js` which expects the `.env` variables referenced throughout the server routes.
3. In another terminal start the React client:
   ```bash
   cd client
   npm install
   npm start
   ```

### Stripe configuration

The new betalingsfanen i adminpanelet bruker Stripe Checkout for kortbetalinger. Konfigurer følgende miljøvariabler før du
starter backend-serveren:

| Variabel | Beskrivelse |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe sitt hemmelige API-nøkkel (starter vanligvis med `sk_live_` eller `sk_test_`). |
| `CLIENT_BASE_URL` | URL-en som klienten kjører på lokalt eller i produksjon (brukes for å sende Stripe tilbake til riktig side, f.eks. `http://localhost:3000`). |

Når variablene er satt kan superadministratorer opprette fakturaer, og klubbene kan betale via kort eller be om faktura.

### Google adresse-autoutfylling

Fakturamodalen støtter adresseforslag fra Google Places API for å gjøre utfylling raskere. Legg til API-nøkkelen i klientmiljøet
dersom du ønsker autoutfylling:

```
REACT_APP_GOOGLE_PLACES_API_KEY=<din Google Places API-nøkkel>
```

Nøkkelen må ha tilgang til Places API. Hvis variabelen ikke er satt fungerer skjemaet fortsatt, men brukeren må skrive inn
adressen manuelt.

## Testing

The root package exposes a placeholder test script that currently echoes `No tests specified`. Add tests under the respective workspace (`server/` or `client/`) and wire them into the root `package.json` when available.

## API documentation

The Express server hosts two auto-generated documentation surfaces:

* `http://localhost:5001/api-doc` – lightweight HTML overview summarising every route, HTTP method, and tag extracted from the Swagger definition.
* `http://localhost:5001/docs` – interactive Swagger UI for trying requests against a running instance.
* `http://localhost:5001/docs-json` – raw OpenAPI JSON that can be imported into other tools (e.g. Theneo or Postman).
