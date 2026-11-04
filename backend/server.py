"""API de reservas para B&H Barbershop. Solo usa la biblioteca estándar de Python."""

from __future__ import annotations

import json
import hashlib
import os
import re
import secrets
import sqlite3
import time
from collections import defaultdict, deque
from datetime import date
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

DB_PATH = os.environ.get("BOOKING_DB", os.path.join(os.path.dirname(__file__), "bookings.sqlite3"))
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8000"))
SERVICES = {
    "Corte caballero": (30, 10),
    "Corte + barba": (30, 14),
    "Corte + cejas": (30, 12),
    "Corte + barba + cejas": (30, 15),
    "Barba con degradado": (15, 8),
    "Rapado": (15, 8),
}
NAME_MAX_LENGTH = 60
PHONE_PATTERN = re.compile(r"\+?[0-9]{7,15}\Z")
BOOKING_RATE_LIMIT = 10
BOOKING_RATE_WINDOW = 10 * 60
booking_attempts: dict[str, deque[float]] = defaultdict(deque)
admin_sessions: dict[str, float] = {}
ADMIN_SESSION_SECONDS = 8 * 60 * 60


def connect() -> sqlite3.Connection:
    db = sqlite3.connect(DB_PATH, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA busy_timeout=10000")
    return db


def initialize() -> None:
    with connect() as db:
        db.execute("""CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            service TEXT NOT NULL,
            price INTEGER NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            duration INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            status TEXT NOT NULL DEFAULT 'requested'
        )""")
        db.execute("CREATE INDEX IF NOT EXISTS bookings_date ON bookings(date)")
        db.execute("CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
        db.execute("CREATE TABLE IF NOT EXISTS closures (date TEXT PRIMARY KEY, reason TEXT NOT NULL)")


def read_body(handler: BaseHTTPRequestHandler, limit: int = 4_000_000) -> dict:
    size = int(handler.headers.get("Content-Length", "0"))
    if size < 1 or size > limit:
        raise ValueError("La solicitud está vacía o supera el tamaño permitido.")
    data = json.loads(handler.rfile.read(size))
    if not isinstance(data, dict):
        raise ValueError("El cuerpo debe ser un objeto JSON.")
    return data


def authorized(handler: BaseHTTPRequestHandler) -> bool:
    token = handler.headers.get("Authorization", "").removeprefix("Bearer ")
    expires = admin_sessions.get(token, 0)
    if expires < time.time():
        admin_sessions.pop(token, None)
        return False
    return True


def parse_day(value: str) -> date:
    try:
        day = date.fromisoformat(value)
    except (TypeError, ValueError):
        raise ValueError("La fecha debe tener formato YYYY-MM-DD.")
    if day.isoformat() != value:
        raise ValueError("La fecha debe tener formato YYYY-MM-DD.")
    if day.weekday() == 6:
        raise ValueError("La barbería cierra los domingos.")
    if day < date.today():
        raise ValueError("No se pueden reservar fechas pasadas.")
    return day


def intervals(day: date, duration: int) -> list[tuple[int, int]]:
    if day.weekday() == 6:
        return []
    if day.weekday() == 5:
        ranges = [(8 * 60, 14 * 60), (14 * 60 + 30, 22 * 60)]
    elif day.weekday() == 4:
        ranges = [(9 * 60 + 30, 14 * 60), (14 * 60 + 30, 22 * 60)]
    else:
        ranges = [(9 * 60 + 30, 14 * 60), (15 * 60, 21 * 60)]
    return [(start, start + duration) for opening, closing in ranges
            for start in range(opening, closing, duration)
            if start + duration <= closing]


def minute(value: str) -> int:
    if not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", value or ""):
        raise ValueError("La hora debe tener formato HH:MM.")
    hour, mins = map(int, value.split(":"))
    return hour * 60 + mins


class Handler(BaseHTTPRequestHandler):
    server_version = "BHBookings/1.0"

    def log_message(self, fmt: str, *args: object) -> None:
        print(f"{self.address_string()} - {fmt % args}")

    def send_headers(self, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", os.environ.get("CORS_ORIGIN", "*"))
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def send_json(self, payload: object, status: int = 200) -> None:
        self.send_headers(status)
        self.wfile.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))

    def do_OPTIONS(self) -> None:
        self.send_headers(204)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        if parsed.path.startswith("/api/admin/"):
            if not authorized(self):
                return self.send_json({"error": "Sesión caducada. Vuelve a iniciar sesión."}, 401)
            with connect() as db:
                if parsed.path == "/api/admin/content":
                    rows = db.execute("SELECT key,value FROM site_settings").fetchall()
                    return self.send_json({r["key"]: json.loads(r["value"]) for r in rows})
                if parsed.path == "/api/admin/closures":
                    return self.send_json([dict(r) for r in db.execute("SELECT date,reason FROM closures ORDER BY date")])
                if parsed.path == "/api/admin/bookings":
                    date_filter = query.get("month", [""])[0]
                    rows = db.execute("SELECT id,name,phone,service,price,date,time,duration,status FROM bookings WHERE date LIKE ? ORDER BY date,time", (date_filter + "%",)).fetchall() if date_filter else db.execute("SELECT id,name,phone,service,price,date,time,duration,status FROM bookings ORDER BY date,time").fetchall()
                    return self.send_json([dict(r) for r in rows])
            return self.send_json({"error": "Ruta no encontrada."}, 404)
        if parsed.path == "/api/health":
            return self.send_json({"ok": True})
        if parsed.path == "/api/services":
            return self.send_json([{"name": n, "duration": d, "price": p} for n, (d, p) in SERVICES.items()])
        if parsed.path == "/api/content":
            with connect() as db:
                rows = db.execute("SELECT key,value FROM site_settings").fetchall()
            return self.send_json({r["key"]: json.loads(r["value"]) for r in rows})
        if parsed.path not in ("/api/availability", "/api/bookings"):
            return self.send_json({"error": "Ruta no encontrada."}, 404)
        try:
            day = parse_day(query.get("date", [""])[0])
            day_key = day.isoformat()
            with connect() as db:
                closure = db.execute("SELECT reason FROM closures WHERE date=?", (day_key,)).fetchone()
                booked = db.execute("SELECT time, duration FROM bookings WHERE date=? AND status!='cancelled'", (day_key,)).fetchall()
            if closure:
                return self.send_json({"date": day_key, "duration": 30, "available": [], "closed": closure["reason"]})
            if parsed.path == "/api/bookings":
                return self.send_json([dict(row) for row in db.execute("SELECT id,name,service,date,time,duration,status FROM bookings WHERE date=? AND status!='cancelled' ORDER BY time", (day_key,))])
            duration = int(query.get("duration", ["30"])[0])
            if duration not in (15, 30):
                raise ValueError("La duración no es válida.")
            occupied = [(minute(row["time"]), minute(row["time"]) + row["duration"]) for row in booked]
            available = []
            for start, end in intervals(day, duration):
                if not any(start < booked_end and end > booked_start for booked_start, booked_end in occupied):
                    available.append(f"{start // 60:02d}:{start % 60:02d}")
            return self.send_json({"date": day_key, "duration": duration, "available": available})
        except (ValueError, OverflowError) as exc:
            return self.send_json({"error": str(exc)}, 400)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/admin/login":
            try:
                password = str(read_body(self).get("password", ""))
                configured = os.environ.get("ADMIN_PASSWORD", "")
                if not configured:
                    return self.send_json({"error": "Configura ADMIN_PASSWORD en el servidor."}, 503)
                if not secrets.compare_digest(password, configured):
                    return self.send_json({"error": "La contraseña no es correcta."}, 401)
                token = secrets.token_urlsafe(32)
                admin_sessions[token] = time.time() + ADMIN_SESSION_SECONDS
                return self.send_json({"token": token, "expiresIn": ADMIN_SESSION_SECONDS})
            except (ValueError, json.JSONDecodeError) as exc:
                return self.send_json({"error": str(exc)}, 400)
        if path.startswith("/api/admin/"):
            if not authorized(self):
                return self.send_json({"error": "Sesión caducada."}, 401)
            try:
                data = read_body(self)
                with connect() as db:
                    if path == "/api/admin/content":
                        for key, value in data.items():
                            db.execute("INSERT INTO site_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (key, json.dumps(value, ensure_ascii=False)))
                        return self.send_json({"ok": True})
                    if path == "/api/admin/closures":
                        day = date.fromisoformat(data.get("date", ""))
                        reason = str(data.get("reason", "Cerrado")).strip()[:100]
                        if not reason: raise ValueError("Indica el motivo del cierre.")
                        db.execute("INSERT INTO closures(date,reason) VALUES(?,?) ON CONFLICT(date) DO UPDATE SET reason=excluded.reason", (day.isoformat(), reason))
                        return self.send_json({"ok": True})
                    if path == "/api/admin/bookings":
                        return self.create_admin_booking(db, data)
            except (ValueError, TypeError, json.JSONDecodeError) as exc:
                return self.send_json({"error": str(exc)}, 400)
        if path != "/api/bookings":
            return self.send_json({"error": "Ruta no encontrada."}, 404)
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > 10000:
                raise ValueError("Solicitud vacía o demasiado grande.")
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError("El cuerpo debe ser un objeto JSON.")
            name = str(payload.get("name", "")).strip()
            phone = str(payload.get("phone", "")).strip()
            service = str(payload.get("service", ""))
            name_parts = name.split(" ")
            if (not 2 <= len(name) <= NAME_MAX_LENGTH
                    or any(not part or not part.isalpha() for part in name_parts)):
                raise ValueError(f"El nombre debe tener entre 2 y {NAME_MAX_LENGTH} caracteres y contener solo letras y espacios.")
            if not PHONE_PATTERN.fullmatch(phone):
                raise ValueError("El teléfono debe contener de 7 a 15 dígitos y, opcionalmente, un + al principio. No uses espacios ni guiones.")
            if service not in SERVICES:
                raise ValueError("El servicio no es válido.")
            duration, price = SERVICES[service]
            day = parse_day(str(payload.get("date", "")))
            with connect() as db:
                closure = db.execute("SELECT reason FROM closures WHERE date=?", (day.isoformat(),)).fetchone()
            if closure:
                return self.send_json({"error": f"La barbería está cerrada ese día: {closure['reason']}"}, 409)
            start = minute(str(payload.get("time", "")))
            if (start, start + duration) not in intervals(day, duration):
                raise ValueError("La hora no está dentro del horario disponible.")

            now = time.monotonic()
            client_ip = self.client_address[0]
            attempts = booking_attempts[client_ip]
            while attempts and now - attempts[0] >= BOOKING_RATE_WINDOW:
                attempts.popleft()
            if len(attempts) >= BOOKING_RATE_LIMIT:
                return self.send_json({"error": "Se han recibido demasiadas solicitudes. Espera unos minutos y vuelve a intentarlo.", "code": "RATE_LIMITED"}, 429)
            attempts.append(now)

            # BEGIN IMMEDIATE serializa las escrituras: una segunda petición concurrente
            # vuelve a comprobar el hueco después de que la primera haya confirmado.
            db = connect()
            try:
                db.execute("BEGIN IMMEDIATE")
                collisions = db.execute("SELECT time,duration FROM bookings WHERE date=? AND status!='cancelled'", (day.isoformat(),)).fetchall()
                for row in collisions:
                    other_start = minute(row["time"])
                    if start < other_start + row["duration"] and start + duration > other_start:
                        db.rollback()
                        return self.send_json({"error": "Ese horario acaba de ser reservado. Elige otro slot.", "code": "SLOT_TAKEN"}, 409)
                cursor = db.execute("INSERT INTO bookings(name,phone,service,price,date,time,duration) VALUES(?,?,?,?,?,?,?)",
                                    (name, phone, service, price, day.isoformat(), f"{start // 60:02d}:{start % 60:02d}", duration))
                booking_id = cursor.lastrowid
                db.commit()
            finally:
                db.close()
            return self.send_json({"id": booking_id, "name": name, "phone": phone, "service": service,
                                   "price": price, "date": day.isoformat(), "time": f"{start // 60:02d}:{start % 60:02d}",
                                   "duration": duration, "status": "requested"}, 201)
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            return self.send_json({"error": str(exc)}, 400)

    def create_admin_booking(self, db: sqlite3.Connection, data: dict) -> None:
        service = str(data.get("service", ""))
        if service not in SERVICES: raise ValueError("Selecciona un servicio válido.")
        duration, price = SERVICES[service]
        day = date.fromisoformat(data.get("date", ""))
        start = minute(data.get("time", ""))
        if (start, start + duration) not in intervals(day, duration): raise ValueError("La hora no coincide con el horario.")
        db.execute("BEGIN IMMEDIATE")
        for row in db.execute("SELECT time,duration FROM bookings WHERE date=? AND status!='cancelled'", (day.isoformat(),)):
            other = minute(row["time"])
            if start < other + row["duration"] and start + duration > other: raise ValueError("Ese horario ya está ocupado.")
        cur = db.execute("INSERT INTO bookings(name,phone,service,price,date,time,duration) VALUES(?,?,?,?,?,?,?)", (str(data.get("name", ""))[:60], str(data.get("phone", ""))[:20], service, price, day.isoformat(), f"{start//60:02d}:{start%60:02d}", duration))
        return self.send_json({"id": cur.lastrowid}, 201)

    def do_DELETE(self) -> None:
        if not authorized(self): return self.send_json({"error": "Sesión caducada."}, 401)
        parsed = urlparse(self.path)
        with connect() as db:
            if parsed.path.startswith("/api/admin/closures/"):
                db.execute("DELETE FROM closures WHERE date=?", (parsed.path.rsplit("/", 1)[-1],))
                return self.send_json({"ok": True})
            if parsed.path.startswith("/api/admin/bookings/"):
                db.execute("DELETE FROM bookings WHERE id=?", (parsed.path.rsplit("/", 1)[-1],))
                return self.send_json({"ok": True})
        return self.send_json({"error": "Ruta no encontrada."}, 404)

    def do_PATCH(self) -> None:
        if not authorized(self): return self.send_json({"error": "Sesión caducada."}, 401)
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/admin/bookings/"): return self.send_json({"error": "Ruta no encontrada."}, 404)
        try:
            data = read_body(self)
            with connect() as db:
                row = db.execute("SELECT * FROM bookings WHERE id=?", (parsed.path.rsplit("/", 1)[-1],)).fetchone()
                if not row: return self.send_json({"error": "No se encontró la cita."}, 404)
                values = {key: data.get(key, row[key]) for key in ("name", "phone", "service", "date", "time")}
                service = values["service"]
                if service not in SERVICES: raise ValueError("Selecciona un servicio válido.")
                duration, price = SERVICES[service]
                day = date.fromisoformat(values["date"]); start = minute(values["time"])
                if (start,start+duration) not in intervals(day,duration): raise ValueError("La hora no coincide con el horario.")
                db.execute("UPDATE bookings SET name=?,phone=?,service=?,price=?,date=?,time=?,duration=? WHERE id=?", (values["name"],values["phone"],service,price,day.isoformat(),values["time"],duration,row["id"]))
                return self.send_json({"ok": True})
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            return self.send_json({"error": str(exc)}, 400)


if __name__ == "__main__":
    initialize()
    print(f"B&H Booking API escuchando en http://{HOST}:{PORT}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
