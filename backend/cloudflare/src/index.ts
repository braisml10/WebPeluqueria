interface Env {
  DB: D1Database
  ADMIN_PASSWORD?: string
  ALLOWED_ORIGIN?: string
  PUBLIC_BOOKING_ENABLED?: string
}

const services: Record<string, { duration: number; price: number }> = {
  "Corte caballero": { duration: 30, price: 10 },
  "Corte + barba": { duration: 30, price: 14 },
  "Corte + cejas": { duration: 30, price: 12 },
  "Corte + barba + cejas": { duration: 30, price: 15 },
  "Barba con degradado": { duration: 15, price: 8 },
  Rapado: { duration: 15, price: 8 },
}
const phonePattern = /^\+?[0-9]{7,15}$/

function json(data: unknown, status = 200, origin = "*") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "access-control-allow-headers": "Content-Type, Authorization",
      "cache-control": "no-store",
      vary: "Origin",
    },
  })
}

function todayMadrid() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}
function parseDate(s: unknown, allowPast = false): string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error("Fecha inválida.")
  const d = new Date(`${s}T12:00:00Z`)
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw new Error("Fecha inválida.")
  if (d.getUTCDay() === 0) throw new Error("La barbería cierra los domingos.")
  if (!allowPast && s < todayMadrid()) throw new Error("No se pueden reservar fechas pasadas.")
  return s
}
function slots(day: string, duration: number): string[] {
  const d = new Date(`${day}T12:00:00Z`).getUTCDay()
  const ranges = d === 6 ? [[480,840],[870,1320]] : d === 5 ? [[570,840],[870,1320]] : [[570,840],[900,1260]]
  return ranges.flatMap(([open, close]) => {
    const out: string[] = []
    for(let t=open;t+duration<=close;t+=duration) out.push(`${String(Math.floor(t/60)).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`)
    return out
  })
}
function toMinute(s: string): number {
  if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s)) throw new Error("Hora inválida.")
  const [h,m]=s.split(":").map(Number); return h*60+m
}
async function body(req: Request, max = 4_000_000): Promise<Record<string, unknown>> {
  const len=Number(req.headers.get("content-length")||0)
  if(!len||len>max) throw new Error("Solicitud vacía o demasiado grande.")
  const val=await req.json()
  if(!val||typeof val!=="object"||Array.isArray(val)) throw new Error("El cuerpo debe ser un objeto JSON.")
  return val as Record<string,unknown>
}
async function hash(text:string) {
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text))
  return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("")
}
function token() {
  const bytes=crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replaceAll("+","-").replaceAll("/","_").replaceAll("=","")
}
async function isAdmin(req:Request, env:Env) {
  const t=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||""
  if(!t)return false
  const row=await env.DB.prepare("SELECT expires_at FROM admin_sessions WHERE token_hash=?").bind(await hash(t)).first<{expires_at:number}>()
  return !!row&&row.expires_at>Date.now()
}
async function authorized(req:Request,env:Env,origin:string) {
  if(!(await isAdmin(req,env))) return json({error:"Sesión caducada. Vuelve a iniciar sesión."},401,origin)
  return null
}
async function createBooking(env:Env,data:Record<string,unknown>) {
  const name=String(data.name||"").trim(), phone=String(data.phone||"").trim(), service=String(data.service||"")
  if(name.length<2||name.length>60||name.split(" ").some(p=>!p||![...p].every(c=>/\p{L}/u.test(c)))) throw new Error("Formato incorrecto. Usa solo letras y espacios; longitud permitida: 2–60 caracteres.")
  if(!phonePattern.test(phone)) throw new Error("Formato incorrecto. Solo se aceptan números y un + opcional al principio (7–15 dígitos).")
  const spec=services[service]; if(!spec) throw new Error("El servicio no es válido.")
  const date=parseDate(data.date); const start=toMinute(String(data.time||""))
  if(!slots(date,spec.duration).includes(String(data.time))) throw new Error("La hora no está dentro del horario disponible.")
  const closed=await env.DB.prepare("SELECT reason FROM closures WHERE date=?").bind(date).first<{reason:string}>()
  if(closed) throw new Error(`La barbería está cerrada ese día: ${closed.reason}`)
  const end=start+spec.duration
  // A single INSERT...SELECT makes the overlap test part of the write. D1 serializes writes.
  const result=await env.DB.prepare(`INSERT INTO bookings(name,phone,service,price,date,time,duration)
    SELECT ?,?,?,?,?,?,? WHERE NOT EXISTS (
      SELECT 1 FROM bookings WHERE date=? AND status!='cancelled'
      AND ? < (CAST(substr(time,1,2) AS INTEGER)*60 + CAST(substr(time,4,2) AS INTEGER) + duration)
      AND ? > (CAST(substr(time,1,2) AS INTEGER)*60 + CAST(substr(time,4,2) AS INTEGER))
    )`).bind(name,phone,service,spec.price,date,String(data.time),spec.duration,date,start,end).run()
  if(!result.meta.changes) throw new Error("Ese horario acaba de ser reservado. Elige otro slot.")
  return {id:result.meta.last_row_id,name,phone,service,price:spec.price,date,time:String(data.time),duration:spec.duration,status:"requested"}
}

export default {
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    const now = Date.now()
    const today = todayMadrid()
    await env.DB.batch([
      env.DB.prepare("DELETE FROM bookings WHERE date < ?").bind(today),
      env.DB.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").bind(now),
      env.DB.prepare("DELETE FROM login_attempts WHERE window_started < ?").bind(now - 24 * 60 * 60 * 1000),
    ])
  },
  async fetch(req:Request,env:Env):Promise<Response> {
    const url=new URL(req.url), path=url.pathname, method=req.method
    const configuredOrigin=env.ALLOWED_ORIGIN||"http://localhost:8443"
    const requestOrigin=req.headers.get("origin")||configuredOrigin
    const origin=requestOrigin===configuredOrigin?configuredOrigin:"null"
    if(method==="OPTIONS") return new Response(null,{status:204,headers:{"access-control-allow-origin":origin,"access-control-allow-methods":"GET, POST, PATCH, DELETE, OPTIONS","access-control-allow-headers":"Content-Type, Authorization","access-control-max-age":"86400","vary":"Origin"}})
    try {
      if(path==="/api/health"&&method==="GET") return json({ok:true},200,origin)
      if(path==="/api/services"&&method==="GET") return json(Object.entries(services).map(([name,s])=>({name,...s})),200,origin)
      if(path==="/api/content"&&method==="GET") {
        const rows=await env.DB.prepare("SELECT key,value FROM site_settings").all<{key:string;value:string}>()
        return json(Object.fromEntries(rows.results.map(r=>[r.key,JSON.parse(r.value)])),200,origin)
      }
      if(path==="/api/availability"&&method==="GET") {
        const date=parseDate(url.searchParams.get("date")); const duration=Number(url.searchParams.get("duration")||30)
        if(duration!==15&&duration!==30)throw new Error("La duración no es válida.")
        const closed=await env.DB.prepare("SELECT reason FROM closures WHERE date=?").bind(date).first<{reason:string}>()
        if(closed)return json({date,duration,available:[],closed:closed.reason},200,origin)
        const booked=await env.DB.prepare("SELECT time,duration FROM bookings WHERE date=? AND status!='cancelled'").bind(date).all<{time:string;duration:number}>()
        const occupied=booked.results.map(b=>[toMinute(b.time),toMinute(b.time)+b.duration])
        const available=slots(date,duration).filter(t=>{const a=toMinute(t),b=a+duration;return !occupied.some(([x,y])=>a<y&&b>x)})
        return json({date,duration,available},200,origin)
      }
      if(path==="/api/bookings"&&method==="POST") {
        if(env.PUBLIC_BOOKING_ENABLED!=="true")return json({error:"Las reservas online aún no están abiertas."},503,origin)
        const result=await createBooking(env,await body(req,10000));return json(result,201,origin)
      }
      if(path==="/api/admin/login"&&method==="POST") {
        if(!env.ADMIN_PASSWORD)return json({error:"Configura ADMIN_PASSWORD como secreto del Worker."},503,origin)
        const ip=req.headers.get("cf-connecting-ip")||"unknown", now=Date.now()
        const row=await env.DB.prepare("SELECT window_started,attempts FROM login_attempts WHERE ip=?").bind(ip).first<{window_started:number;attempts:number}>()
        if(row&&now-row.window_started<600000&&row.attempts>=10)return json({error:"Demasiados intentos. Espera 10 minutos."},429,origin)
        const data=await body(req,10000), supplied=String(data.password||"")
        if(supplied!==env.ADMIN_PASSWORD){await env.DB.prepare(`INSERT INTO login_attempts(ip,window_started,attempts) VALUES(?,?,1) ON CONFLICT(ip) DO UPDATE SET attempts=CASE WHEN ?-window_started>=600000 THEN 1 ELSE attempts+1 END,window_started=CASE WHEN ?-window_started>=600000 THEN ? ELSE window_started END`).bind(ip,now,now,now,now).run();return json({error:"La contraseña no es correcta."},401,origin)}
        await env.DB.prepare("DELETE FROM login_attempts WHERE ip=?").bind(ip).run()
        const t=token(), expires=now+8*60*60*1000
        await env.DB.prepare("INSERT INTO admin_sessions(token_hash,expires_at) VALUES(?,?)").bind(await hash(t),expires).run()
        return json({token:t,expiresIn:8*60*60},200,origin)
      }
      if(path.startsWith("/api/admin/")) {
        const denial=await authorized(req,env,origin);if(denial)return denial
        if(path==="/api/admin/bookings"&&method==="GET") {
          const month=url.searchParams.get("month")||""
          const res=month?await env.DB.prepare("SELECT id,name,phone,service,date,time,duration,status FROM bookings WHERE date LIKE ? ORDER BY date,time").bind(`${month}%`).all():await env.DB.prepare("SELECT id,name,phone,service,date,time,duration,status FROM bookings ORDER BY date,time").all()
          return json(res.results,200,origin)
        }
        if(path==="/api/admin/bookings"&&method==="POST") {
          const data=await body(req);return json(await createBooking(env,data),201,origin)
        }
        if(path==="/api/admin/content"&&method==="GET") {
          const res=await env.DB.prepare("SELECT key,value FROM site_settings").all<{key:string;value:string}>()
          return json(Object.fromEntries(res.results.map(r=>[r.key,JSON.parse(r.value)])),200,origin)
        }
        if(path==="/api/admin/content"&&method==="POST") {
          const data=await body(req);const stmts=Object.entries(data).map(([k,v])=>env.DB.prepare("INSERT INTO site_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(k,JSON.stringify(v)))
          if(stmts.length)await env.DB.batch(stmts);return json({ok:true},200,origin)
        }
        if(path==="/api/admin/closures"&&method==="GET") {const r=await env.DB.prepare("SELECT date,reason FROM closures ORDER BY date").all();return json(r.results,200,origin)}
        if(path==="/api/admin/closures"&&method==="POST") {
          const data=await body(req);const d=parseDate(data.date,true),reason=String(data.reason||"").trim().slice(0,100)
          if(!reason)throw new Error("Indica el motivo del cierre.")
          await env.DB.prepare("INSERT INTO closures(date,reason) VALUES(?,?) ON CONFLICT(date) DO UPDATE SET reason=excluded.reason").bind(d,reason).run();return json({ok:true},200,origin)
        }
        const bookingId=path.match(/^\/api\/admin\/bookings\/(\d+)$/)?.[1]
        if(bookingId&&method==="DELETE"){await env.DB.prepare("DELETE FROM bookings WHERE id=?").bind(bookingId).run();return json({ok:true},200,origin)}
        if(bookingId&&method==="PATCH") {
          const old=await env.DB.prepare("SELECT * FROM bookings WHERE id=?").bind(bookingId).first<Record<string,any>>()
          if(!old)return json({error:"No se encontró la cita."},404,origin)
          const data=await body(req),service=String(data.service??old.service),spec=services[service]
          if(!spec)throw new Error("Selecciona un servicio válido.")
          const date=parseDate(data.date??old.date,true),time=String(data.time??old.time),start=toMinute(time)
          if(!slots(date,spec.duration).includes(time))throw new Error("La hora no coincide con el horario.")
          const closed=await env.DB.prepare("SELECT reason FROM closures WHERE date=?").bind(date).first()
          if(closed)throw new Error("Ese día está marcado como cerrado.")
          const end=start+spec.duration
          const r=await env.DB.prepare(`UPDATE bookings SET name=?,phone=?,service=?,price=?,date=?,time=?,duration=? WHERE id=? AND NOT EXISTS (SELECT 1 FROM bookings WHERE id!=? AND date=? AND status!='cancelled' AND ? < (CAST(substr(time,1,2) AS INTEGER)*60+CAST(substr(time,4,2) AS INTEGER)+duration) AND ? > (CAST(substr(time,1,2) AS INTEGER)*60+CAST(substr(time,4,2) AS INTEGER)))`).bind(data.name??old.name,data.phone??old.phone,service,spec.price,date,time,spec.duration,bookingId,bookingId,date,start,end).run()
          if(!r.meta.changes)throw new Error("Ese horario ya está ocupado.")
          return json({ok:true},200,origin)
        }
        const closureDate=path.match(/^\/api\/admin\/closures\/(\d{4}-\d{2}-\d{2})$/)?.[1]
        if(closureDate&&method==="DELETE"){await env.DB.prepare("DELETE FROM closures WHERE date=?").bind(closureDate).run();return json({ok:true},200,origin)}
      }
      return json({error:"Ruta no encontrada."},404,origin)
    } catch(e) {
      const message=e instanceof Error?e.message:"Error interno del servidor."
      const status=message.includes("acaba de ser reservado")||message.includes("ya está ocupado")?409:400
      return json({error:message},status,origin)
    }
  }
}
