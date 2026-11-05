# Web B&H Barbershop

Proyecto de la web pública y API de reservas.

## Estructura

- `frontend/`: React, Vite y Tailwind.
- `backend/`: API Python estándar y base SQLite creada localmente al arrancar.
- `backend/cloudflare/`: alternativa de API con Cloudflare Workers y D1.

## Desarrollo local (PowerShell)

Terminal 1, backend:

```powershell
cd backend
$env:ADMIN_PASSWORD = "pon-aqui-una-clave-larga-y-unica"
python .\server.py
```

Terminal 2, frontend:

```powershell
cd frontend
pnpm install
pnpm dev
```

La web está en `http://localhost:8443` y la administración en `http://localhost:8443/admin`. El backend usa `http://127.0.0.1:8000` por defecto.

## Antes de desplegar

Configura `VITE_API_URL` en el entorno de compilación del frontend para que apunte a la API HTTPS pública. En el backend define `ADMIN_PASSWORD`, `CORS_ORIGIN` con el origen exacto del frontend, `HOST=0.0.0.0`, `PORT` y una ruta de almacenamiento persistente para `BOOKING_DB`. No subas contraseñas, `.env`, la base SQLite ni datos reales de clientes a Git. Usa HTTPS y añade una verificación anti-bots en el backend antes de abrir las reservas al público.

## Requisitos

Consulta [docs/requirements.md](docs/requirements.md) para las reglas funcionales del proyecto.
