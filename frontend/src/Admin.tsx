import { useEffect, useMemo, useState } from "react"

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
const services = ["Corte caballero", "Corte + barba", "Corte + cejas", "Corte + barba + cejas", "Barba con degradado", "Rapado"]
type Booking = { id: number; name: string; phone: string; service: string; date: string; time: string; duration?: number; status?: string }
type Closure = { date: string; reason: string }
type BookingForm = Pick<Booking, "id" | "name" | "phone" | "service" | "date" | "time">
type ContentField = { key: string; label: string; kind: "text" | "textarea" | "image"; defaultValue: string; hint?: string }

const contentSections: { title: string; intro: string; fields: ContentField[] }[] = [
  { title: "Portada", intro: "El primer mensaje y la foto principal de la web.", fields: [
    { key: "heroPhoto", label: "Foto de portada", kind: "image", defaultValue: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=2000&q=90", hint: "Foto panorámica. La imagen se optimiza automáticamente al subirla." },
    { key: "heroPhotoAlt", label: "Descripción de la foto", kind: "text", defaultValue: "Experiencia de barbería B&H" },
    { key: "heroEyebrow", label: "Frase pequeña", kind: "text", defaultValue: "Barbería contemporánea · Mollet del Vallès" },
    { key: "heroTitle", label: "Título principal", kind: "text", defaultValue: "Tu estilo." },
    { key: "heroAccent", label: "Segunda línea", kind: "text", defaultValue: "Nuestra firma." },
    { key: "heroCopy", label: "Texto de presentación", kind: "textarea", defaultValue: "Cortes con carácter, técnica precisa y flow urbano. Un espacio creado para que salgas siendo tu mejor versión." },
  ] },
  { title: "El estudio", intro: "La historia del barbero y la imagen del local.", fields: [
    { key: "aboutPhoto", label: "Foto del barbero", kind: "image", defaultValue: "https://images.unsplash.com/photo-1604355240616-5e907f42b431?auto=format&fit=crop&w=1000&q=88" },
    { key: "aboutPhotoAlt", label: "Descripción de la foto", kind: "text", defaultValue: "Barbero de B&H Barbershop" },
    { key: "aboutEyebrow", label: "Frase pequeña", kind: "text", defaultValue: "El barbero" },
    { key: "aboutHeading", label: "Título", kind: "text", defaultValue: "Más que un corte," },
    { key: "aboutAccent", label: "Segunda línea", kind: "text", defaultValue: "una forma de expresarte." },
    { key: "aboutText", label: "Frase destacada", kind: "textarea", defaultValue: "Aquí no seguimos tendencias: las adaptamos a ti." },
    { key: "aboutBodyOne", label: "Párrafo 1", kind: "textarea", defaultValue: "En B&H cada corte empieza escuchando. Estudiamos tus facciones, tu cabello y tu estilo para crear un acabado que se sienta auténticamente tuyo." },
    { key: "aboutBodyTwo", label: "Párrafo 2", kind: "textarea", defaultValue: "Dominamos el degradado, el corte a tijera y el perfilado para convertir cada cita en una experiencia precisa, relajada y personal." },
  ] },
  { title: "Galería de trabajos", intro: "Cambia las cuatro fotos, sus descripciones y los rótulos.", fields: [
    { key: "galleryEyebrow", label: "Frase pequeña", kind: "text", defaultValue: "Últimos trabajos" },
    { key: "galleryHeading", label: "Título", kind: "text", defaultValue: "Hecho con pulso." },
    { key: "galleryAccent", label: "Segunda línea", kind: "text", defaultValue: "Llevado con actitud." },
    { key: "galleryPhoto1", label: "Foto 1", kind: "image", defaultValue: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=85" },
    { key: "galleryAlt1", label: "Descripción foto 1", kind: "text", defaultValue: "Barbero realizando un corte clásico" },
    { key: "galleryLabel1", label: "Rótulo foto 1", kind: "text", defaultValue: "Precisión" },
    { key: "galleryPhoto2", label: "Foto 2", kind: "image", defaultValue: "https://images.unsplash.com/photo-1582771498000-8ad44e6c84db?auto=format&fit=crop&w=1000&q=85" },
    { key: "galleryAlt2", label: "Descripción foto 2", kind: "text", defaultValue: "Detalle de un corte masculino" },
    { key: "galleryLabel2", label: "Rótulo foto 2", kind: "text", defaultValue: "Textura" },
    { key: "galleryPhoto3", label: "Foto 3", kind: "image", defaultValue: "https://images.unsplash.com/photo-1512864084360-7c0c4d0a0845?auto=format&fit=crop&w=1200&q=85" },
    { key: "galleryAlt3", label: "Descripción foto 3", kind: "text", defaultValue: "Barbero trabajando con atención al detalle" },
    { key: "galleryLabel3", label: "Rótulo foto 3", kind: "text", defaultValue: "Técnica" },
    { key: "galleryPhoto4", label: "Foto 4", kind: "image", defaultValue: "https://images.unsplash.com/photo-1520338661084-680395057c93?auto=format&fit=crop&w=1000&q=85" },
    { key: "galleryAlt4", label: "Descripción foto 4", kind: "text", defaultValue: "Corte degradado en proceso" },
    { key: "galleryLabel4", label: "Rótulo foto 4", kind: "text", defaultValue: "Flow" },
  ] },
  { title: "Servicios", intro: "Edita el encabezado y la introducción de la carta.", fields: [
    { key: "servicesEyebrow", label: "Frase pequeña", kind: "text", defaultValue: "Carta de servicios" },
    { key: "servicesHeading", label: "Título", kind: "text", defaultValue: "Elige tu" },
    { key: "servicesAccent", label: "Segunda línea", kind: "text", defaultValue: "próximo look." },
    { key: "servicesCopy", label: "Descripción", kind: "textarea", defaultValue: "Sin complicaciones. Tú eliges el servicio, nosotros nos encargamos del resultado." },
    { key: "serviceDetail0", label: "Descripción · Corte caballero", kind: "text", defaultValue: "Asesoramiento, corte y acabado" },
    { key: "serviceDetail1", label: "Descripción · Corte + barba", kind: "text", defaultValue: "Perfilado, degradado y acabado" },
    { key: "serviceDetail2", label: "Descripción · Corte + cejas", kind: "text", defaultValue: "Corte completo y diseño de cejas" },
    { key: "serviceDetail3", label: "Descripción · Corte + barba + cejas", kind: "text", defaultValue: "El servicio completo B&H" },
    { key: "serviceDetail4", label: "Descripción · Barba con degradado", kind: "text", defaultValue: "Diseño, perfilado y degradado" },
    { key: "serviceDetail5", label: "Descripción · Rapado", kind: "text", defaultValue: "Rapado uniforme y acabado" },
  ] },
  { title: "Reservas", intro: "El texto que acompaña al calendario de reservas.", fields: [
    { key: "bookingEyebrow", label: "Frase pequeña", kind: "text", defaultValue: "Reserva online" },
    { key: "bookingHeading", label: "Título", kind: "text", defaultValue: "Tu próxima cita," },
    { key: "bookingAccent", label: "Segunda línea", kind: "text", defaultValue: "a un par de clics." },
    { key: "bookingCopy", label: "Descripción", kind: "textarea", defaultValue: "Selecciona servicio, día y hora. Te guardamos el sillón." },
  ] },
  { title: "Localización", intro: "La foto del local y los textos de dirección.", fields: [
    { key: "studioPhoto", label: "Foto del local", kind: "image", defaultValue: "/images/bh-studio.webp" },
    { key: "studioPhotoAlt", label: "Descripción de la foto", kind: "text", defaultValue: "Interior de B&H Barbershop en Mollet del Vallès" },
    { key: "studioCaption", label: "Texto sobre la foto", kind: "text", defaultValue: "Tu sitio. Tu momento." },
    { key: "locationHeading", label: "Título", kind: "text", defaultValue: "Estamos en" },
    { key: "locationText", label: "Ciudad o zona", kind: "text", defaultValue: "Mollet del Vallès." },
    { key: "streetAddress", label: "Calle y número", kind: "text", defaultValue: "Carrer d'Anselm Clavé, 31" },
    { key: "postalAddress", label: "Código postal y ciudad", kind: "text", defaultValue: "08100 Mollet del Vallès, Barcelona" },
  ] },
  { title: "Horario", intro: "Modifica los tramos que aparecen en la sección de ubicación.", fields: [
    { key: "hoursFirst0", label: "Lunes · Primer tramo", kind: "text", defaultValue: "09:30 — 14:00" }, { key: "hoursSecond0", label: "Lunes · Segundo tramo", kind: "text", defaultValue: "15:00 — 21:00" },
    { key: "hoursFirst1", label: "Martes · Primer tramo", kind: "text", defaultValue: "09:30 — 14:00" }, { key: "hoursSecond1", label: "Martes · Segundo tramo", kind: "text", defaultValue: "15:00 — 21:00" },
    { key: "hoursFirst2", label: "Miércoles · Primer tramo", kind: "text", defaultValue: "09:30 — 14:00" }, { key: "hoursSecond2", label: "Miércoles · Segundo tramo", kind: "text", defaultValue: "15:00 — 21:00" },
    { key: "hoursFirst3", label: "Jueves · Primer tramo", kind: "text", defaultValue: "09:30 — 14:00" }, { key: "hoursSecond3", label: "Jueves · Segundo tramo", kind: "text", defaultValue: "15:00 — 21:00" },
    { key: "hoursFirst4", label: "Viernes · Primer tramo", kind: "text", defaultValue: "09:30 — 14:00" }, { key: "hoursSecond4", label: "Viernes · Segundo tramo", kind: "text", defaultValue: "14:30 — 22:00" },
    { key: "hoursFirst5", label: "Sábado · Primer tramo", kind: "text", defaultValue: "08:00 — 14:00" }, { key: "hoursSecond5", label: "Sábado · Segundo tramo", kind: "text", defaultValue: "14:30 — 22:00" },
    { key: "hoursFirst6", label: "Domingo · Primer tramo", kind: "text", defaultValue: "Cerrado" }, { key: "hoursSecond6", label: "Domingo · Segundo tramo", kind: "text", defaultValue: "" },
  ] },
  { title: "Cierre de página", intro: "El mensaje final antes del pie de página.", fields: [
    { key: "footerHeading", label: "Título", kind: "text", defaultValue: "¿Listo para tu" },
    { key: "footerAccent", label: "Segunda línea", kind: "text", defaultValue: "próximo corte?" },
  ] },
]

async function optimizeImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw Error("Elige un archivo de imagen.")
  if (file.size > 15 * 1024 * 1024) throw Error("La imagen supera el máximo de 15 MB.")
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext("2d")
  if (!context) throw Error("No se pudo preparar la imagen.")
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const toBlob = (quality: number) => new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error("No se pudo comprimir la imagen.")), "image/webp", quality))
  let blob = await toBlob(0.82)
  if (blob.size > 1_200_000) blob = await toBlob(0.65)
  if (blob.size > 1_200_000) throw Error("La imagen sigue siendo demasiado pesada. Prueba con otra foto más pequeña.")
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(Error("No se pudo leer la imagen."))
    reader.onerror = () => reject(Error("No se pudo leer la imagen."))
    reader.readAsDataURL(blob)
  })
}

const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
const monthKey = (date = new Date()) => localDate(date).slice(0, 7)
const dateFromKey = (value: string) => {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}
const formatDate = (value: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) =>
  dateFromKey(value).toLocaleDateString("es-ES", options)
const monthTitle = (value: string) => {
  const [year, month] = value.split("-").map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" })
}
const shiftMonth = (value: string, offset: number) => {
  const [year, month] = value.split("-").map(Number)
  return monthKey(new Date(year, month - 1 + offset, 1))
}
const isoFor = (year: number, month: number, day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`

export default function Admin() {
  const today = localDate()
  const [token, setToken] = useState(localStorage.getItem("bh-admin-token") || "")
  const [password, setPassword] = useState("")
  const [tab, setTab] = useState<"calendar" | "closures" | "content">("calendar")
  const [selectedMonth, setSelectedMonth] = useState(monthKey())
  const [selectedDate, setSelectedDate] = useState(today)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [closures, setClosures] = useState<Closure[]>([])
  const [webContent, setWebContent] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [editing, setEditing] = useState<BookingForm | null>(null)
  const [closeFrom, setCloseFrom] = useState("")
  const [closeTo, setCloseTo] = useState("")
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [savingContentKey, setSavingContentKey] = useState("")
  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }

  async function api(path: string, init: RequestInit = {}) {
    const response = await fetch(`${API}${path}`, { ...init, headers: { ...auth, ...init.headers } })
    const data = await response.json()
    if (!response.ok) throw Error(data.error || "No se pudo completar la acción")
    return data
  }

  async function refresh() {
    try {
      const [monthlyBookings, allClosures] = await Promise.all([
        api(`/api/admin/bookings?month=${selectedMonth}`),
        api("/api/admin/closures"),
      ])
      setBookings(monthlyBookings)
      setClosures(allClosures)
      setError("")
    } catch (cause) {
      setError(String(cause))
    }
  }

  useEffect(() => { if (token) void refresh() }, [token, selectedMonth])
  useEffect(() => {
    if (!token) return
    api("/api/admin/content").then(setWebContent).catch(cause => setError(String(cause)))
  }, [token])

  const calendarCells = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number)
    const daysInMonth = new Date(year, month, 0).getDate()
    const mondayFirstOffset = (new Date(year, month - 1, 1).getDay() + 6) % 7
    return [...Array(mondayFirstOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => isoFor(year, month - 1, index + 1))]
  }, [selectedMonth])
  const bookingsByDate = useMemo(() => {
    const grouped = new Map<string, Booking[]>()
    for (const booking of bookings) grouped.set(booking.date, [...(grouped.get(booking.date) || []), booking])
    for (const day of grouped.values()) day.sort((a, b) => a.time.localeCompare(b.time))
    return grouped
  }, [bookings])
  const closuresByDate = useMemo(() => new Map(closures.map(closure => [closure.date, closure])), [closures])
  const dayBookings = bookingsByDate.get(selectedDate) || []
  const selectedClosure = closuresByDate.get(selectedDate)

  async function login(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      const data = await api("/api/admin/login", { method: "POST", body: JSON.stringify({ password }) })
      localStorage.setItem("bh-admin-token", data.token)
      setToken(data.token)
      setError("")
    } catch (cause) { setError(String(cause)) }
    finally { setBusy(false) }
  }

  async function saveBooking(event: React.FormEvent) {
    event.preventDefault()
    if (!editing) return
    setBusy(true)
    try {
      await api(editing.id ? `/api/admin/bookings/${editing.id}` : "/api/admin/bookings", {
        method: editing.id ? "PATCH" : "POST",
        body: JSON.stringify(editing),
      })
      setSelectedDate(editing.date)
      setSelectedMonth(monthKey(dateFromKey(editing.date)))
      if (monthKey(dateFromKey(editing.date)) === selectedMonth) await refresh()
      setEditing(null)
      setNotice(editing.id ? "Cita actualizada." : "Cita añadida.")
      setError("")
    } catch (cause) { setError(String(cause)) }
    finally { setBusy(false) }
  }

  async function deleteBooking(booking: Booking) {
    if (!window.confirm(`¿Eliminar la cita de ${booking.name} del ${formatDate(booking.date)} a las ${booking.time}?`)) return
    try {
      await api(`/api/admin/bookings/${booking.id}`, { method: "DELETE" })
      await refresh()
      setNotice("Cita eliminada.")
      setError("")
    } catch (cause) { setError(String(cause)) }
  }

  async function addClosures(event: React.FormEvent) {
    event.preventDefault()
    if (!closeFrom || !closeTo || closeTo < closeFrom) {
      setError("Revisa el intervalo de fechas.")
      return
    }
    const dates: string[] = []
    for (const date = dateFromKey(closeFrom); localDate(date) <= closeTo; date.setDate(date.getDate() + 1)) {
      if (date.getDay() !== 0) dates.push(localDate(date))
    }
    const conflictingBookings = dates.flatMap(date => bookingsByDate.get(date) || [])
    const outsideMonthConflicts = dates.filter(date => monthKey(dateFromKey(date)) !== selectedMonth)
    if (conflictingBookings.length || outsideMonthConflicts.length) {
      const details = [
        conflictingBookings.length ? `${conflictingBookings.length} cita(s) visible(s) en el calendario` : "",
        outsideMonthConflicts.length ? "puede haber citas en otros meses del intervalo" : "",
      ].filter(Boolean).join("; ")
      if (!window.confirm(`El cierre afecta ${dates.length} día(s) y ${details}. Las citas existentes no se borrarán automáticamente. ¿Guardar el cierre igualmente?`)) return
    }
    setBusy(true)
    try {
      for (const date of dates) await api("/api/admin/closures", { method: "POST", body: JSON.stringify({ date, reason }) })
      setReason("")
      setCloseFrom("")
      setCloseTo("")
      await refresh()
      setNotice(dates.length ? `${dates.length} día(s) cerrado(s).` : "No hay días laborables que cerrar en ese intervalo.")
      setError("")
    } catch (cause) { setError(String(cause)) }
    finally { setBusy(false) }
  }

  async function reopen(date: string) {
    try {
      await api(`/api/admin/closures/${date}`, { method: "DELETE" })
      await refresh()
      setNotice("Día reabierto para nuevas reservas.")
      setError("")
    } catch (cause) { setError(String(cause)) }
  }

  async function saveContent(key: string, value: string, successMessage = "Cambio guardado.") {
    setSavingContentKey(key)
    try {
      await api("/api/admin/content", { method: "POST", body: JSON.stringify({ [key]: value }) })
      setWebContent(current => ({ ...current, [key]: value }))
      setNotice(successMessage)
      setError("")
    } catch (cause) { setError(String(cause)) }
    finally { setSavingContentKey("") }
  }

  async function uploadContentImage(key: string, file?: File) {
    if (!file) return
    setSavingContentKey(key)
    setNotice("")
    try {
      const image = await optimizeImage(file)
      await api("/api/admin/content", { method: "POST", body: JSON.stringify({ [key]: image }) })
      setWebContent(current => ({ ...current, [key]: image }))
      setNotice("Foto optimizada y guardada. Recarga la web para ver el cambio.")
      setError("")
    } catch (cause) { setError(String(cause)) }
    finally { setSavingContentKey("") }
  }

  function startNewBooking() {
    setEditing({ id: 0, name: "", phone: "", service: services[0], date: selectedDate, time: "09:30" })
    setError("")
    setNotice("")
  }

  if (!token) return <main className="admin-page"><form className="admin-card admin-login" onSubmit={login}>
    <span className="admin-eyebrow">B&amp;H BARBERSHOP</span><h1>Administración</h1><p>Acceso exclusivo del propietario</p>
    <label>Contraseña<input type="password" value={password} onChange={event => setPassword(event.target.value)} required autoFocus /></label>
    <button disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>{error && <p className="admin-error" role="alert">{error}</p>}
  </form></main>

  return <main className="admin-page">
    <header className="admin-header"><div><span className="admin-eyebrow">B&amp;H BARBERSHOP · MOLLET DEL VALLÈS</span><h1>Panel del local</h1></div>
      <button className="admin-button admin-button--quiet" onClick={() => { localStorage.removeItem("bh-admin-token"); setToken("") }}>Cerrar sesión</button>
    </header>
    <nav className="admin-tabs" aria-label="Secciones del panel">
      <button className={tab === "calendar" ? "active" : ""} onClick={() => setTab("calendar")}>Calendario de citas</button>
      <button className={tab === "closures" ? "active" : ""} onClick={() => setTab("closures")}>Días cerrados</button>
      <button className={tab === "content" ? "active" : ""} onClick={() => setTab("content")}>Contenido de la web</button>
    </nav>
    {error && <p className="admin-message admin-message--error" role="alert">{error}</p>}
    {notice && !error && <p className="admin-message" role="status">{notice}</p>}

    {tab === "calendar" && <section className="admin-calendar-layout">
      <div className="admin-card admin-calendar-card">
        <div className="admin-section-heading"><div><span className="admin-eyebrow">ORGANIZACIÓN</span><h2>Calendario</h2></div>
          <div className="admin-month-nav"><button aria-label="Mes anterior" onClick={() => setSelectedMonth(month => shiftMonth(month, -1))}>‹</button><strong>{monthTitle(selectedMonth)}</strong><button aria-label="Mes siguiente" onClick={() => setSelectedMonth(month => shiftMonth(month, 1))}>›</button></div>
        </div>
        <div className="admin-calendar-grid admin-calendar-weekdays">{["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"].map(day => <span key={day}>{day}</span>)}</div>
        <div className="admin-calendar-grid">
          {calendarCells.map((date, index) => {
            if (!date) return <span className="admin-calendar-empty" key={`empty-${index}`} />
            const count = bookingsByDate.get(date)?.length || 0
            const closure = closuresByDate.get(date)
            return <button key={date} className={`admin-calendar-day${selectedDate === date ? " is-selected" : ""}${closure ? " is-closed" : ""}${date === today ? " is-today" : ""}`} onClick={() => { setSelectedDate(date); setNotice(""); setError("") }} aria-label={`${formatDate(date)}${count ? `, ${count} citas` : ", sin citas"}${closure ? `, cerrado: ${closure.reason}` : ""}`} aria-pressed={selectedDate === date}>
              <span>{Number(date.slice(-2))}</span>{count > 0 && <small>{count} {count === 1 ? "cita" : "citas"}</small>}{closure && <i aria-hidden="true" />}
            </button>
          })}
        </div>
        <div className="admin-calendar-legend"><span><i className="admin-legend-dot admin-legend-dot--today" />Hoy</span><span><i className="admin-legend-dot admin-legend-dot--closed" />Día cerrado</span><span>El número indica las citas</span></div>
      </div>

      <div className="admin-card admin-agenda">
        <div className="admin-section-heading"><div><span className="admin-eyebrow">AGENDA DEL DÍA</span><h2>{formatDate(selectedDate, { weekday: "long", day: "numeric", month: "long" })}</h2></div>
          <button className="admin-button" onClick={startNewBooking}>Añadir cita</button>
        </div>
        {selectedClosure && <div className="admin-closed-banner"><strong>Día cerrado</strong><span>{selectedClosure.reason}</span><button onClick={() => void reopen(selectedDate)}>Reabrir</button></div>}
        {dayBookings.length ? <div className="admin-agenda-list">{dayBookings.map(booking => <article className="admin-appointment" key={booking.id}>
          <div className="admin-appointment-time"><strong>{booking.time}</strong><span>{booking.duration || 30} min</span></div>
          <div className="admin-appointment-details"><h3>{booking.name}</h3><a href={`tel:${booking.phone}`}>{booking.phone}</a><p>{booking.service}</p></div>
          <div className="admin-appointment-actions"><button className="admin-button admin-button--quiet" onClick={() => { setEditing({ ...booking }); setError(""); setNotice("") }}>Modificar</button><button className="admin-button admin-button--danger" onClick={() => void deleteBooking(booking)}>Eliminar</button></div>
        </article>)}</div> : <div className="admin-empty"><strong>{selectedClosure ? "No hay citas para este día" : "Día sin citas"}</strong><span>{selectedClosure ? "El día está cerrado a nuevas reservas." : "Las citas de esta fecha aparecerán aquí."}</span></div>}
        <p className="admin-agenda-total">{dayBookings.length} {dayBookings.length === 1 ? "cita en la agenda" : "citas en la agenda"}</p>
      </div>
    </section>}

    {tab === "closures" && <section className="admin-card admin-closures">
      <div className="admin-section-heading"><div><span className="admin-eyebrow">FESTIVOS Y VACACIONES</span><h2>Cerrar días</h2></div></div>
      <p className="admin-help">Cierra una fecha o un intervalo. Las reservas existentes se conservarán: revísalas en el calendario para reprogramarlas si hace falta.</p>
      <form className="admin-closure-form" onSubmit={addClosures}>
        <label>Desde<input type="date" value={closeFrom} onChange={event => setCloseFrom(event.target.value)} required /></label>
        <label>Hasta<input type="date" min={closeFrom || undefined} value={closeTo} onChange={event => setCloseTo(event.target.value)} required /></label>
        <label className="admin-closure-reason">Motivo<input value={reason} onChange={event => setReason(event.target.value)} placeholder="Vacaciones, festivo…" maxLength={100} required /></label>
        <button className="admin-button" disabled={busy}>{busy ? "Guardando…" : "Guardar cierre"}</button>
      </form>
      <div className="admin-closure-list-heading"><h3>Próximos días cerrados</h3><span>{closures.length}</span></div>
      {closures.length ? <div className="admin-closure-list">{closures.map(closure => {
        const count = bookingsByDate.get(closure.date)?.length || 0
        return <article className="admin-closure-item" key={closure.date}><div className="admin-closure-date"><strong>{formatDate(closure.date, { day: "numeric" })}</strong><span>{formatDate(closure.date, { weekday: "short", month: "short", year: "numeric" })}</span></div>
          <div className="admin-closure-reason"><strong>{closure.reason}</strong>{count > 0 && <span className="admin-conflict">{count} cita(s) este mes; revisa el calendario</span>}</div>
          <button className="admin-button admin-button--quiet" onClick={() => void reopen(closure.date)}>Reabrir día</button>
        </article>
      })}</div> : <div className="admin-empty"><strong>No hay días cerrados</strong><span>Los cierres que añadas aparecerán aquí.</span></div>}
    </section>}

    {tab === "content" && <section className="admin-content-page">
      <div className="admin-card admin-content-welcome">
        <div><span className="admin-eyebrow">EDITOR DEL SITIO</span><h2>Fotos y textos</h2><p>Sube una foto o edita un texto por sección. Los textos se guardan con su botón; las fotos se optimizan y guardan al seleccionarlas. Recarga la web para ver los cambios.</p></div>
        <a className="admin-button" href="/" target="_blank" rel="noreferrer">Ver la web ↗</a>
      </div>
      {contentSections.map(section => <section className="admin-card admin-content-section" key={section.title}>
        <div className="admin-content-section-heading"><div><span className="admin-eyebrow">CONTENIDO</span><h3>{section.title}</h3></div><p>{section.intro}</p></div>
        <div className="admin-content-fields">
          {section.fields.map(field => {
            const value = webContent[field.key] ?? ""
            const currentValue = value || field.defaultValue
            const saving = savingContentKey === field.key
            if (field.kind === "image") return <article className="admin-content-field admin-content-image" key={field.key}>
              <div className="admin-content-image-preview"><img src={currentValue} alt={`Vista previa: ${field.label}`} onError={event => { event.currentTarget.src = field.defaultValue }} /><span>{field.label}</span></div>
              <div className="admin-content-image-controls">
                <strong>{field.label}</strong>
                {field.hint && <small>{field.hint}</small>}
                <label className="admin-upload-button">{saving ? "Subiendo y guardando…" : "Elegir foto del dispositivo"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={saving} onChange={event => { void uploadContentImage(field.key, event.currentTarget.files?.[0]); event.currentTarget.value = "" }} /></label>
                <details className="admin-image-url"><summary>O pegar un enlace de imagen</summary><input value={value.startsWith("data:") ? "" : value} placeholder="https://…" onChange={event => setWebContent(current => ({ ...current, [field.key]: event.target.value }))} /><div className="admin-content-actions"><button className="admin-button" disabled={saving} onClick={() => void saveContent(field.key, value)}>Guardar enlace</button><button className="admin-button admin-button--quiet" disabled={saving} onClick={() => void saveContent(field.key, "", "Foto original restaurada.")}>Restaurar original</button></div></details>
              </div>
            </article>
            return <article className={`admin-content-field admin-content-text${field.kind === "textarea" ? " is-long" : ""}`} key={field.key}>
              <label>{field.label}{field.kind === "textarea" ? <textarea rows={3} maxLength={600} value={currentValue} onChange={event => setWebContent(current => ({ ...current, [field.key]: event.target.value }))} /> : <input type="text" maxLength={160} value={currentValue} onChange={event => setWebContent(current => ({ ...current, [field.key]: event.target.value }))} />}</label>
              <button className="admin-button admin-button--quiet" disabled={saving} onClick={() => void saveContent(field.key, currentValue)}>{saving ? "Guardando…" : "Guardar texto"}</button>
            </article>
          })}
        </div>
      </section>)}
      <p className="admin-content-footnote">Las fotos se reducen y optimizan al subirlas. Se guardan en Cloudflare y no es necesario modificar archivos ni código.</p>
    </section>}

    {editing && <div className="admin-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setEditing(null) }}>
      <form className="admin-card admin-edit-form" onSubmit={saveBooking}>
        <div className="admin-section-heading"><div><span className="admin-eyebrow">GESTIÓN DE CITAS</span><h2>{editing.id ? "Modificar cita" : "Añadir cita"}</h2></div><button type="button" className="admin-button admin-button--quiet" onClick={() => setEditing(null)}>Cerrar</button></div>
        <label>Nombre<input value={editing.name} minLength={2} maxLength={60} required onChange={event => setEditing({ ...editing, name: event.target.value })} /></label>
        <label>Teléfono<input type="tel" value={editing.phone} pattern="\+?[0-9]{7,15}" required onChange={event => setEditing({ ...editing, phone: event.target.value })} /></label>
        <label>Tipo de corte<select value={editing.service} onChange={event => setEditing({ ...editing, service: event.target.value })}>{services.map(service => <option key={service}>{service}</option>)}</select></label>
        <div className="admin-form-row"><label>Fecha<input type="date" value={editing.date} required onChange={event => setEditing({ ...editing, date: event.target.value })} /></label><label>Hora<input type="time" value={editing.time} required onChange={event => setEditing({ ...editing, time: event.target.value })} /></label></div>
        <div className="admin-edit-actions"><button type="button" className="admin-button admin-button--quiet" onClick={() => setEditing(null)}>Cancelar</button><button className="admin-button" disabled={busy}>{busy ? "Guardando…" : "Guardar cambios"}</button></div>
      </form>
    </div>}
  </main>
}
