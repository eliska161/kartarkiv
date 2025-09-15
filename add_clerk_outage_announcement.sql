-- Add Clerk outage announcement directly to database
-- This bypasses the need for Clerk authentication

INSERT INTO announcements (
    title,
    message,
    type,
    is_active,
    created_by,
    expires_at,
    priority
) VALUES (
    'Problemer med innlogging og admin-funksjoner',
    'Vi opplever for øyeblikket problemer med innlogging og admin-funksjoner på grunn av ytelsesproblemer hos Clerk (autentiseringstjenesten). Dette påvirker alle brukere og kan føre til langsom innlogging, feil ved metadata-oppdateringer, og andre admin-oppgaver. Vi følger med på situasjonen og vil oppdatere når problemet er løst. Takk for tålmodigheten.',
    'warning',
    true,
    'system_admin',
    '2025-01-15 23:59:59',
    10
);
