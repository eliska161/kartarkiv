-- Add problem resolved announcement
-- Clerk issues have been fixed

INSERT INTO announcements (
    title,
    message,
    type,
    is_active,
    created_by,
    expires_at,
    priority
) VALUES (
    'Problem løst - Innlogging fungerer normalt',
    'Clerk-problemene er nå løst og innlogging fungerer normalt igjen. Alle admin-funksjoner og metadata-oppdateringer skal nå fungere som forventet. Takk for tålmodigheten under utagene.',
    'success',
    true,
    'system_admin',
    '2025-01-16 23:59:59',
    5
);
