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

### Billing via Norwegian Bank (SB1)

Stripe er fjernet. Betaling skjer via faktura og norsk bank (SpareBank 1) med automatisk avstemming.

- Resend (HTTP API): RESEND_API_KEY (pkrevd), RESEND_API_URL (valgfri for regioner)
- Resend (SMTP-bridge): RESEND_SMTP_HOST, RESEND_SMTP_PORT, RESEND_SMTP_USERNAME, RESEND_SMTP_PASSWORD
2) Serveren genererer en PDF-faktura (pdf-lib), sender den p e-post via Resend HTTP API hvis `RESEND_API_KEY` er satt (ellers benyttes SMTP-konfigurasjonen eller Resend sitt SMTP-grensesnitt hvis `RESEND_SMTP_*` variabler er tilgjengelige), og lagrer faktura-metadata i Postgres (club_invoices utvidet med KID, konto, betalt-status).
- SB1_CLIENT_ID, SB1_CLIENT_SECRET, SB1_TOKEN_URL
- SB1_TRANSACTIONS_URL, SB1_ACCOUNT_KEY, SB1_ACCOUNT_NUMBER
- SB1_POLL_FROM_DAYS, SB1_POLL_INTERVAL_CRON
- E-post (SMTP): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM

2) Serveren genererer en PDF-faktura (pdf-lib), sender den på e-post (SMTP) og lagrer faktura-metadata i Postgres (club_invoices utvidet med KID, konto, betalt-status).

3) En cron-jobb (node-cron) henter periodisk transaksjoner fra SB1 og matcher på KID + beløp. Ved treff settes paid=true, paid_at=now() og kvittering sendes på e-post.

Lokal testing: sett MOCK_SB1=1 for å bruke server/fixtures/sample-transactions.json.### Mapbox adresse-autoutfylling

Fakturamodalen stÃ¸tter nÃ¥ Mapbox Address Autofill slik at klubbens fakturaadresse kan hentes fra kartet og kvalitetssikres automatisk. Funksjonen aktiveres ved Ã¥ legge til en Mapbox Search access token i klientmiljÃ¸et:

```
REACT_APP_MAPBOX_ACCESS_TOKEN=<din Mapbox access token>
```

FÃ¸lg disse stegene for Ã¥ sette opp en token som fungerer bÃ¥de lokalt og i produksjon:

1. Opprett eller logg inn pÃ¥ en Mapbox-konto pÃ¥ [mapbox.com](https://www.mapbox.com/).
2. GÃ¥ til **Account** â†’ **Tokens** og opprett en ny token med "Public" type.
3. Under **Token scopes** mÃ¥ du krysse av for `SEARCH:READ` og `ADDRESS:READ`. Den enkleste mÃ¥ten er Ã¥ sÃ¸ke etter Â«address-autofillÂ» i filteret; nÃ¥r du aktiverer den vil Mapbox automatisk markere begge disse scope-ene.
4. Under *URL restrictions* kan du legge til domenene som skal bruke autofyll (for eksempel `http://localhost:3000` og produksjonsdomenet).
5. Kopier tokenen (starter med `pk.`) og legg den i `client/.env.local` som `REACT_APP_MAPBOX_ACCESS_TOKEN`.

Hvis variabelen ikke er satt fungerer skjemaet fortsatt, men brukeren mÃ¥ skrive inn adressen manuelt.

## Testing

The root package exposes a placeholder test script that currently echoes `No tests specified`. Add tests under the respective workspace (`server/` or `client/`) and wire them into the root `package.json` when available.

## API documentation

The Express server hosts two auto-generated documentation surfaces:

* `http://localhost:5001/api-doc` â€“ lightweight HTML overview summarising every route, HTTP method, and tag extracted from the Swagger definition.
* `http://localhost:5001/docs` â€“ interactive Swagger UI for trying requests against a running instance.
* `http://localhost:5001/docs-json` â€“ raw OpenAPI JSON that can be imported into other tools (e.g. Theneo or Postman).

### Manual Payment Flow

Stripe and SpareBank 1 reconciliation are removed. Billing is handled by PDF invoices via email and manual status updates.

- Server emails PDF invoices (SMTP). Configure SMTP vars in server/.env (see server/.env.example).
- Admins can create invoices, send them via email, and mark them as paid.

New endpoint:
- POST /api/payments/invoices/:invoiceId/mark-paid
  - Marks the invoice as paid and sets paid_at = NOW().
  - Response: { invoice: <updated invoice> }

Note: "Kartarkiv vil automatisk sende faktura på e-post. Når betaling er mottatt, kan den markeres som betalt i adminpanelet."
