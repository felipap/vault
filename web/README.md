# Context Web

The server component of Context. This is a self-hosted API that:

1. **Receives data from the Electron app** — Screenshots, and eventually other personal data from your machine
2. **Exposes MCP servers** — So AI agents can access your data with your permission

## Environment Variables

### Required

- `DASHBOARD_SECRET` — Password for dashboard login
- `DATABASE_URL` — PostgreSQL connection string

### Optional

- `DEVICE_SECRET` — API authentication token for device endpoints. If not set, API is open.

### IP Whitelisting (Optional)

Both whitelists are optional. If not set, all IPs are allowed.

- `API_IP_WHITELIST` — Comma-separated list of allowed IPs for API endpoints (device sync)
- `DASHBOARD_IP_WHITELIST` — Comma-separated list of allowed IPs for dashboard access

Example:
```bash
API_IP_WHITELIST=192.168.1.100,10.0.0.50
DASHBOARD_IP_WHITELIST=192.168.1.0,192.168.1.1
```

The IP detection works with common proxy setups (checks `X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP` headers).
