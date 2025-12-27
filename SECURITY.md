This is a SHORT document, explaining the security measures in place. It's not
the place for AI slop, or legaleeze.

## Authentication

There are two auth flows: one for the admin dashboard, one for devices (Electron app).

### Admin Dashboard

A passphrase-based system. The passphrase is set via `DASHBOARD_SECRET` env var on the server.

1. User enters passphrase on login page
2. Server compares it to `DASHBOARD_SECRET`
3. If valid, sets an httpOnly cookie (`context_admin`) containing the passphrase
4. Cookie settings: httpOnly, secure in production, sameSite=lax, 1 year expiry
5. Subsequent requests check if cookie value matches `DASHBOARD_SECRET`

In development, if `DASHBOARD_SECRET` is unset, auth is bypassed entirely.

### Device Auth (Desktop App)

Devices authenticate via a shared secret:

1. Set `API_WRITE_SECRET` env var on the server
2. Enter the same secret in the desktop app settings
3. Desktop app sends it as `Authorization: Bearer <secret>` header
4. Server rejects requests where the token doesn't match

If `API_WRITE_SECRET` is unset on the server, device auth is bypassed (for development).

## Server security

API read is actually more sensitive than write.

## Rate Limiting

Configure rate limiting in the Vercel dashboard under **Firewall → + New Rule**.

Recommended rule for API endpoints:

- **Name:** `api-rate-limit`
- **If:** Request Path starts with `/api`
- **Rate Limit:** Fixed Window, 300 seconds, 10 requests, Key: IP Address
- **Then:** Too Many Requests (429)

See [docs/firewall-example.png](./docs/firewall-example.png) for reference.
