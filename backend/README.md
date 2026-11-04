# API B&H Barbershop

API de reservas en Python estándar y SQLite. La base SQLite se crea al arrancar; guárdala en disco persistente al desplegar.

## Ejecución local

```powershell
$env:ADMIN_PASSWORD = "pon-aqui-una-clave-larga-y-unica"
python .\server.py
```

Por defecto escucha en `127.0.0.1:8000`. La contraseña administrativa se exige mediante `ADMIN_PASSWORD`; no hay contraseña predeterminada.

## Rutas

- `GET /api/health`, `/api/services`, `/api/content`
- `GET /api/availability?date=YYYY-MM-DD&duration=15|30`
- `POST /api/bookings` para solicitar una cita
- `POST /api/admin/login` para iniciar sesión
- Rutas `/api/admin/bookings`, `/api/admin/closures`, `/api/admin/content` requieren token Bearer

Antes de hacer pública la API, configura `CORS_ORIGIN` al dominio exacto de la web y publícala detrás de HTTPS. La protección anti-bots actual es limitada; añade CAPTCHA validado por el servidor antes de abrir las reservas públicamente.
