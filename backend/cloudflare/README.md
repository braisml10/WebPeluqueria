# Cloudflare Worker + D1

This Worker replaces the Python HTTP server for Cloudflare hosting. It keeps the existing `/api/*` contract used by the React frontend and stores bookings, closures, site settings, and administrator sessions in D1.

## Create and bind the database

From this directory:

```powershell
npx wrangler d1 create bh-barbershop
```

Copy the returned database ID into `wrangler.jsonc` at `d1_databases[0].database_id`. Apply the schema locally first, then remotely:

```powershell
npx wrangler d1 migrations apply bh-barbershop --local
npx wrangler d1 migrations apply bh-barbershop --remote
```

Set the production admin password as a Cloudflare secret (never put the real value in `wrangler.jsonc` or Git):

```powershell
npx wrangler secret put ADMIN_PASSWORD
```

Set `ALLOWED_ORIGIN` in `wrangler.jsonc` to the exact public frontend origin, for example `https://bh.barbershop`. For local development use `http://localhost:8443`.

## Local Worker development

Create `.dev.vars` in this directory with `ADMIN_PASSWORD="a-long-unique-local-password"`, then:

```powershell
npm install
npx wrangler d1 migrations apply bh-barbershop --local
npm run dev
```

For the frontend, set `VITE_API_URL` to the Worker URL. In Cloudflare Pages, set it as a production build variable; locally it can go in `frontend/.env.local` (do not commit that file).

## Deploy

```powershell
npx wrangler d1 migrations apply bh-barbershop --remote
npx wrangler deploy
```

The generated Worker URL becomes the frontend's `VITE_API_URL`. Deploy the Pages frontend after setting that value. D1 uses prepared statements; booking conflicts are checked inside the insert statement so concurrent attempts cannot claim an overlapping slot.

## Retención de reservas

Un Cron Trigger corre diariamente a las 00:10 UTC (01:10 o 02:10 en España, según el horario estacional). Borra reservas anteriores a la fecha local actual de Europe/Madrid, sesiones administrativas caducadas y contadores de acceso de más de 24 horas. Las citas del día actual permanecen hasta la siguiente ejecución.
