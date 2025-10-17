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

## Testing

The root package exposes a placeholder test script that currently echoes `No tests specified`. Add tests under the respective workspace (`server/` or `client/`) and wire them into the root `package.json` when available.
