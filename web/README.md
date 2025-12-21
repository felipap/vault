# Context Server

Backend server for the Context application. Stores and manages screenshots captured by the desktop client.

## Setup

1. Set up your PostgreSQL database
2. Copy `.env.example` to `.env` and configure:
   - `DATABASE_URL` - PostgreSQL connection string
   - `BETTER_AUTH_SECRET` - Secret key for authentication
   - `BETTER_AUTH_URL` - Base URL of the server
3. Run database migrations: `npx drizzle-kit push`
4. Start the development server: `npm run dev`

## API

- `POST /api/screenshots` - Upload a screenshot (requires authentication)
- `GET /api/dashboard` - Get screenshot statistics (requires authentication)
