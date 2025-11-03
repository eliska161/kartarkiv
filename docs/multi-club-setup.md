# Kartarkiv multi-klubb oppsett

Denne veiledningen beskriver hvordan du setter opp det nye flerklubb-oppsettet med Clerk-organisasjoner, slik at webmaster kan opprette klubber med egne subdomener.

## 1. Forbered miljøvariabler

1. Legg til Clerk API-nøkler i både klient og server:
   - `REACT_APP_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
2. Sett `CLIENT_BASE_URL` (brukes av backend til å generere lenker) til din produksjons-URL.
3. Deploy-miljøet må gi backend tilgang til Postgres og Clerk via internett.

## 2. Database

Backenden migrerer `clubs`-tabellen automatisk ved oppstart. For eksisterende databaser må prosessen kjøre én gang slik at følgende kolonner legges til:

- `slug` (unik)
- `organization_id` (Clerk org ID)
- faktura- og kontaktfeltene

Sørg for at tjenesten har skrivetilgang til databasen når den starter, ellers vil migreringen feile og logge `❌ Failed to ensure clubs table exists`.

## 3. Clerk-konfigurasjon

1. Aktiver Clerk Organizations i prosjektet ditt.
2. Opprett roller `webmaster`, `superadmin` og `clubadmin` i public metadata, eller bruk Clerk Dashboard til å knytte roller til brukerne.
3. Webmaster må ha `webmaster` (eller `superadmin`) i `publicMetadata.roles` for å få tilgang til plattformpanelet.

## 4. Opprette ny klubb

1. Logg inn som webmaster og åpne `/webmaster`.
2. Fyll ut "Klubboppsett"-skjemaet med subdomene, kontakt- og fakturadetaljer.
3. Ved innsending skjer følgende:
   - Clerk-organisasjon opprettes med valgt slug.
   - Organisasjons-ID lagres i `clubs`-tabellen.
   - Metadata på organisasjonen oppdateres med klubb-ID og kontaktfelt.
4. Bruk Clerk Dashboard til å invitere klubbadministratorer inn i organisasjonen.

## 5. Pålogging for klubbmedlemmer

1. Etter innlogging sendes brukeren til `/select-club` hvis ingen aktiv organisasjon er valgt.
2. Medlemmer kan velge klubben sin fra listen (eller blir automatisk satt dersom de bare har ett medlemskap eller bruker et klubbdomenet).
3. Webmaster får i tillegg en knapp for å hoppe direkte til plattformpanelet uten aktiv klubb.

## 6. Bytte mellom klubber

- Headeren har nå en organisasjonsvelger (tilgjengelig når du har flere klubber eller er webmaster).
- Valgt klubb lagres i `localStorage` og sendes til API-et via `X-Club-Slug` og `X-Organization-Id`-headere.

## 7. Feilsøking

- **401 No token provided**: Sjekk at klienten er innlogget via Clerk og at tokenet injiseres i axios (`Authorization: Bearer ...`).
- **Clerk slug i bruk**: Velg et annet subdomene; Clerk krever unike slugs på tvers av prosjektet.
- **Mangler medlemskap**: Klubben må invitere brukeren i Clerk før vedkommende får tilgang.

## 8. Anbefalt videre arbeid

- Sett opp DNS for hvert subdomene til å peke på den samme webapplikasjonen.
- Oppdater e-postmaler og fakturautsendelser til å inkludere klubben sitt navn og organisasjons-ID fra `clubs`-tabellen.
- Lag rutiner i support-teamet for å slette Clerk-organisasjoner dersom en klubb fjernes.
