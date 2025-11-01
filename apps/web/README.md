# Web App Domain Variants

This app can serve two variants based on the hostname:
- PRIMARY_DOMAIN: full experience
- SECONDARY_DOMAIN: jobs-only (no Services or Tasks)

## Environment Variables

Server-side:
- PRIMARY_DOMAIN=domain-1.ma
- SECONDARY_DOMAIN=domain-2.com

Client-side (exposed):
- NEXT_PUBLIC_PRIMARY_DOMAIN=domain-1.ma
- NEXT_PUBLIC_SECONDARY_DOMAIN=domain-2.com

## Behavior
- On SECONDARY_DOMAIN, `/services` and `/tasks` redirect to `/` (handled in `middleware.ts`).
- Navbar hides Services/Tasks links on SECONDARY_DOMAIN (client-side check).
- Jobs filters can be customized per domain via `getJobFiltersConfig(isSecondary)`.

