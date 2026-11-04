import { FormEvent, useEffect, useMemo, useState } from "react"
import Admin from "./Admin"

type Service = {
  name: string
  detail: string
  price: number
  duration: number
}

type BookingDetails = {
  id?: number
  name: string
  phone: string
  service: string
  price: number
  date: string
  dateLabel: string
  time: string
}

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"

const services: Service[] = [
  {
    name: "Corte caballero",
    detail: "Asesoramiento, corte y acabado",
    price: 10,
    duration: 30,
  },
  {
    name: "Corte + barba",
    detail: "Perfilado, degradado y acabado",
    price: 14,
    duration: 30,
  },
  {
    name: "Corte + cejas",
    detail: "Corte completo y diseño de cejas",
    price: 12,
    duration: 30,
  },
  {
    name: "Corte + barba + cejas",
    detail: "El servicio completo B&H",
    price: 15,
    duration: 30,
  },
  {
    name: "Barba con degradado",
    detail: "Diseño, perfilado y degradado",
    price: 8,
    duration: 15,
  },
  {
    name: "Rapado",
    detail: "Rapado uniforme y acabado",
    price: 8,
    duration: 15,
  },
]

const hours = [
  ["Lunes", "09:30 — 14:00", "15:00 — 21:00"],
  ["Martes", "09:30 — 14:00", "15:00 — 21:00"],
  ["Miércoles", "09:30 — 14:00", "15:00 — 21:00"],
  ["Jueves", "09:30 — 14:00", "15:00 — 21:00"],
  ["Viernes", "09:30 — 14:00", "14:30 — 22:00"],
  ["Sábado", "08:00 — 14:00", "14:30 — 22:00"],
  ["Domingo", "Cerrado", ""],
]

const gallery = [
  {
    src: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=85",
    alt: "Barbero realizando un corte clásico",
    label: "Precisión",
  },
  {
    src: "https://images.unsplash.com/photo-1582771498000-8ad44e6c84db?auto=format&fit=crop&w=1000&q=85",
    alt: "Detalle de un corte masculino",
    label: "Textura",
  },
  {
    src: "https://images.unsplash.com/photo-1512864084360-7c0c4d0a0845?auto=format&fit=crop&w=1200&q=85",
    alt: "Barbero trabajando con atención al detalle",
    label: "Técnica",
  },
  {
    src: "https://images.unsplash.com/photo-1520338661084-680395057c93?auto=format&fit=crop&w=1000&q=85",
    alt: "Corte degradado en proceso",
    label: "Flow",
  },
]

function Icon({
  name,
  size = 20,
}: {
  name: "arrow" | "calendar" | "clock" | "location" | "menu" | "close" | "instagram" | "check"
  size?: number
}) {
  const paths = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    location: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    menu: (
      <>
        <path d="M4 8h16M4 16h16" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    instagram: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17.5 6.5h.01" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`brand ${compact ? "brand--compact" : ""}`}
      aria-label="B&H Barbershop"
    >
      <span className="brand__monogram">BH</span>
      {!compact && <span className="brand__name">BARBERSHOP</span>}
    </div>
  )
}

function toKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function addMonthsClamped(date: Date, months: number) {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(date.getDate(), lastDay))
  target.setHours(0, 0, 0, 0)
  return target
}
function makeSlots(day: number, duration: number) {
  if (day === 0) return []
  const ranges =
    day === 6
      ? [
          [8, 14],
          [14.5, 22],
        ]
      : day === 5
        ? [
            [9.5, 14],
            [14.5, 22],
          ]
        : [
            [9.5, 14],
            [15, 21],
          ]
  return ranges.flatMap(([start, end]) => {
    const values = []
    for (let value = start; value < end; value += duration / 60) {
      const h = Math.floor(value)
      const m = String(Math.round((value % 1) * 60)).padStart(2, "0")
      values.push(`${String(h).padStart(2, "0")}:${m}`)
    }
    return values
  })
}

const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]
const dayNames = ["LU", "MA", "MI", "JU", "VI", "SÁ", "DO"]

function App() {
  if (window.location.pathname === "/admin") return <Admin />
  const [siteContent, setSiteContent] = useState<Record<string, string>>({})
  useEffect(() => { fetch(`${API_BASE}/api/content`).then(r => r.json()).then(setSiteContent).catch(() => {}) }, [])
  const today = useMemo(() => {
    const value = new Date()
    value.setHours(0, 0, 0, 0)
    return value
  }, [])
  const maxBookingDate = useMemo(() => addMonthsClamped(today, 2), [today])
  const [menuOpen, setMenuOpen] = useState(false)
  const [serviceIndex, setServiceIndex] = useState(0)
  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState("")
  const [confirmation, setConfirmation] = useState<{
    name: string
    date: string
    time: string
    service: string
    price: number
  } | null>(null)
  const [pendingBooking, setPendingBooking] = useState<BookingDetails | null>(
    null,
  )
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [bookingError, setBookingError] = useState("")
  const [bookingSaving, setBookingSaving] = useState(false)

  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([])
      return
    }
    const controller = new AbortController()
    setAvailabilityLoading(true)
    setBookingError("")
    const query = new URLSearchParams({
      date: toKey(selectedDate),
      duration: String(services[serviceIndex].duration),
    })
    fetch(`${API_BASE}/api/availability?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "No se pudo cargar la disponibilidad.")
        setAvailableSlots(data.available)
        setSelectedTime((current) => data.available.includes(current) ? current : "")
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError") {
          setBookingError("No se pudo consultar la disponibilidad. Comprueba que el servidor está activo.")
          setAvailableSlots([])
        }
      })
      .finally(() => setAvailabilityLoading(false))
    return () => controller.abort()
  }, [selectedDate, serviceIndex])

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const offset = (firstDay.getDay() + 6) % 7
    const total = new Date(year, month + 1, 0).getDate()
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from(
        { length: total },
        (_, index) => new Date(year, month, index + 1),
      ),
    ]
  }, [viewDate])

  const slots = availableSlots
  const isSunday = new Date().getDay() === 0

  const chooseService = (index: number) => {
    setServiceIndex(index)
    setSelectedTime("")
    setBookingError("")
    document.querySelector("#reservar")?.scrollIntoView({ behavior: "smooth" })
  }

  const chooseBookingService = (index: number) => {
    setServiceIndex(index)
    setSelectedTime("")
    setBookingError("")
  }

  const chooseDate = (date: Date) => {
    if (date < today || date.getDay() === 0) return
    setSelectedDate(date)
    setSelectedTime("")
    setBookingError("")
  }

  const submitBooking = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedDate || !selectedTime) return
    const data = new FormData(event.currentTarget)
    const name = String(data.get("name") || "")
    const booking: BookingDetails = {
      id: Date.now(),
      name,
      phone: String(data.get("phone") || ""),
      service: services[serviceIndex].name,
      price: services[serviceIndex].price,
      date: toKey(selectedDate),
      dateLabel: selectedDate.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
      time: selectedTime,
    }
    setPendingBooking(booking)
  }

  const confirmBooking = async () => {
    if (!pendingBooking || bookingSaving) return
    setBookingSaving(true)
    setBookingError("")
    try {
      const response = await fetch(`${API_BASE}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pendingBooking.name,
          phone: pendingBooking.phone,
          service: pendingBooking.service,
          date: pendingBooking.date,
          time: pendingBooking.time,
        }),
      })
      const result = await response.json()
      if (response.status === 409) {
        setPendingBooking(null)
        setSelectedTime("")
        setBookingError("Ese horario acaba de ocuparse. Elige otra hora.")
        return
      }
      if (!response.ok) throw new Error(result.error || "No se pudo guardar la reserva.")
      setConfirmation({
        name: result.name,
        date: pendingBooking.dateLabel,
        time: result.time,
        service: result.service,
        price: result.price,
      })
      setPendingBooking(null)
      setAvailableSlots((slots) => slots.filter((slot) => slot !== result.time))
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : "No se pudo guardar la reserva.")
    } finally {
      setBookingSaving(false)
    }
  }

  return (
    <main>
      <header className="nav-wrap">
        <a className="nav-brand" href="#inicio">
          <Brand />
        </a>
        <nav
          className={menuOpen ? "nav-links is-open" : "nav-links"}
          aria-label="Navegación principal"
        >
          <a href="#servicios" onClick={() => setMenuOpen(false)}>
            Servicios
          </a>
          <a href="#trabajos" onClick={() => setMenuOpen(false)}>
            Trabajos
          </a>
          <a href="#estudio" onClick={() => setMenuOpen(false)}>
            El estudio
          </a>
          <a href="#ubicacion" onClick={() => setMenuOpen(false)}>
            Ubicación
          </a>
          <a
            className="nav-book"
            href="#reservar"
            onClick={() => setMenuOpen(false)}
          >
            Reservar <Icon name="arrow" size={17} />
          </a>
        </nav>
        <button
          className="menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          <Icon name={menuOpen ? "close" : "menu"} size={25} />
        </button>
      </header>

      <section className="hero" id="inicio">
        <img
          className="hero__image"
          src={siteContent.heroPhoto || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=2000&q=90"}
          alt="Experiencia de barbería B&H"
        />
        <div className="hero__veil" />
        <div className="hero__content">
          <p className="eyebrow">
            <span /> Barbería contemporánea · Mollet del Vallès
          </p>
          <h1>
            {siteContent.heroTitle ?? "Tu estilo."}
            <br />
            <em>Nuestra firma.</em>
          </h1>
          <p className="hero__copy">
            {siteContent.heroCopy ?? "Cortes con carácter, técnica precisa y flow urbano. Un espacio creado para que salgas siendo tu mejor versión."}
          </p>
          <div className="hero__actions">
            <a className="button button--light" href="#reservar">
              Reserva tu cita <Icon name="arrow" />
            </a>
            <a className="text-link" href="#trabajos">
              Ver nuestros trabajos <span>↘</span>
            </a>
          </div>
        </div>
        <div className="hero__status">
          <span
            className={
              isSunday ? "status-dot status-dot--closed" : "status-dot"
            }
          />
          <span>
            <strong>{isSunday ? "Cerrado hoy" : "Abierto hoy"}</strong>
            {!isSunday &&
              ` · Hasta las ${
                new Date().getDay() === 5 || new Date().getDay() === 6
                  ? "22:00"
                  : "21:00"
              }`}
          </span>
        </div>

      </section>

      <div className="ticker" aria-hidden="true">
        <div>
          PRECISIÓN <span>✦</span> ESTILO <span>✦</span> ACTITUD <span>✦</span>{" "}
          B&H BARBERSHOP <span>✦</span> PRECISIÓN <span>✦</span> ESTILO{" "}
          <span>✦</span>
        </div>
      </div>

      <section className="section about" id="estudio">
        <div className="section-number">01</div>
        <div className="about__intro">
          <p className="eyebrow eyebrow--dark">
            <span /> El barbero
          </p>
          <h2>
            Más que un corte,
            <br />
            <em>una forma de expresarte.</em>
          </h2>
        </div>
        <div className="about__grid">
          <div className="about__image-wrap">
            <img
              src="https://images.unsplash.com/photo-1604355240616-5e907f42b431?auto=format&fit=crop&w=1000&q=88"
              alt="Barbero de B&H Barbershop"
            />
            <div className="about__badge">
              B&H
              <br />
              <span>EST. 2024</span>
            </div>
          </div>
          <div className="about__story">
            <p className="lead">
              {siteContent.aboutText ?? "Aquí no seguimos tendencias: las adaptamos a ti."}
            </p>
            <p>
              En B&H cada corte empieza escuchando. Estudiamos tus facciones, tu
              cabello y tu estilo para crear un acabado que se sienta
              auténticamente tuyo.
            </p>
            <p>
              Dominamos el degradado, el corte a tijera y el perfilado para
              convertir cada cita en una experiencia precisa, relajada y
              personal.
            </p>
            <div className="signature">
              B&H <span>Barber</span>
            </div>
            <a
              className="inline-link"
              href="https://www.instagram.com/bh.barbershop_/"
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="instagram" size={18} /> @bh.barbershop_{" "}
              <Icon name="arrow" size={16} />
            </a>
          </div>
        </div>
      </section>

      <section className="services section-dark" id="servicios">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <span /> Carta de servicios
            </p>
            <h2>
              Elige tu
              <br />
              <em>próximo look.</em>
            </h2>
          </div>
          <p>
            Sin complicaciones. Tú eliges el servicio, nosotros nos encargamos
            del resultado.
          </p>
        </div>
        <div className="service-list">
          {services.map((service, index) => (
            <button
              className="service-row"
              onClick={() => chooseService(index)}
              key={service.name}
            >
              <span className="service-row__number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="service-row__name">
                {service.name}
                <small>{service.detail}</small>
              </span>
              <span className="service-row__meta">
                <span>{service.duration} min</span>
                <strong>{service.price},00 €</strong>
              </span>
              <span className="service-row__arrow">
                <Icon name="arrow" />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="work section" id="trabajos">
        <div className="section-heading section-heading--light">
          <div>
            <p className="eyebrow eyebrow--dark">
              <span /> Últimos trabajos
            </p>
            <h2>
              Hecho con pulso.
              <br />
              <em>Llevado con actitud.</em>
            </h2>
          </div>
          <a
            className="inline-link"
            href="https://www.instagram.com/bh.barbershop_/"
            target="_blank"
            rel="noreferrer"
          >
            Síguenos en Instagram <Icon name="arrow" size={16} />
          </a>
        </div>
        <div className="gallery">
          {gallery.map((photo, index) => (
            <figure
              className={`gallery__item gallery__item--${index + 1}`}
              key={photo.src}
            >
              <img src={photo.src} alt={photo.alt} />
              <figcaption>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {photo.label}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="booking section-dark" id="reservar">
        <div className="booking__heading">
          <p className="eyebrow">
            <span /> Reserva online
          </p>
          <h2>
            Tu próxima cita,
            <br />
            <em>a un par de clics.</em>
          </h2>
          <p>Selecciona servicio, día y hora. Te guardamos el sillón.</p>
        </div>

        {confirmation ? (
          <div className="confirmation">
            <div className="confirmation__icon">
              <Icon name="check" size={34} />
            </div>
            <p className="eyebrow">
              <span /> Cita solicitada
            </p>
            <h3>
              Nos vemos pronto,
              <br />
              <em>{confirmation.name}.</em>
            </h3>
            <p>
              Hemos guardado tu solicitud para el{" "}
              <strong>{confirmation.date}</strong> a las{" "}
              <strong>{confirmation.time}</strong>.
            </p>
            <div className="confirmation__summary">
              <span>{confirmation.service}</span>
              <span>{confirmation.price},00 €</span>
            </div>
            <a
              className="button button--light"
              href={`https://wa.me/34600820747?text=${encodeURIComponent(`Hola, soy ${confirmation.name}. Quiero confirmar mi cita de ${confirmation.service} el ${confirmation.date} a las ${confirmation.time}.`)}`}
              target="_blank"
              rel="noreferrer"
            >
              Confirmar por WhatsApp <Icon name="arrow" />
            </a>
            <button
              className="reset-booking"
              onClick={() => {
                setConfirmation(null)
                setSelectedDate(null)
                setSelectedTime("")
              }}
            >
              Hacer otra reserva
            </button>
          </div>
        ) : (
          <div className="booking-card">
            <div className="booking-card__services">
              <div className="step-title">
                <span>01</span>
                <h3>Elige el servicio</h3>
              </div>
              <div className="service-options">
                {services.map((service, index) => (
                  <button
                    className={
                      serviceIndex === index
                        ? "service-option is-selected"
                        : "service-option"
                    }
                    onClick={() => chooseBookingService(index)}
                    key={service.name}
                  >
                    <span className="radio">
                      <i />
                    </span>
                    <span>
                      <strong>{service.name}</strong>
                      <small>{service.duration} min</small>
                    </span>
                    <b>{service.price},00 €</b>
                  </button>
                ))}
              </div>
            </div>

            <div className="booking-card__calendar">
              <div className="step-title">
                <span>02</span>
                <h3>Selecciona el día</h3>
              </div>
              <div className="calendar">
                <div className="calendar__nav">
                  <button
                    onClick={() =>
                      setViewDate(
                        new Date(
                          viewDate.getFullYear(),
                          viewDate.getMonth() - 1,
                          1,
                        ),
                      )
                    }
                    aria-label="Mes anterior"
                  >
                    ←
                  </button>
                  <strong>
                    {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
                  </strong>
                  <button
                    onClick={() =>
                      setViewDate(
                        new Date(
                          viewDate.getFullYear(),
                          viewDate.getMonth() + 1,
                          1,
                        ),
                      )
                    }
                    aria-label="Mes siguiente"
                  >
                    →
                  </button>
                </div>
                <div className="calendar__grid calendar__weekdays">
                  {dayNames.map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div className="calendar__grid">
                  {calendarDays.map((date, index) =>
                    date ? (
                      <button
                        key={toKey(date)}
                        disabled={date < today || date > maxBookingDate || date.getDay() === 0}
                        className={
                          selectedDate && toKey(selectedDate) === toKey(date)
                            ? "is-selected"
                            : ""
                        }
                        onClick={() => chooseDate(date)}
                      >
                        {date.getDate()}
                      </button>
                    ) : (
                      <span key={`blank-${index}`} />
                    ),
                  )}
                </div>
              </div>
            </div>

            <div className="booking-card__times">
              <div className="step-title">
                <span>03</span>
                <h3>Elige la hora</h3>
              </div>
              {!selectedDate ? (
                <div className="empty-times">
                  <Icon name="calendar" size={28} />
                  <p>Selecciona primero un día disponible en el calendario.</p>
                </div>
              ) : (
                <>
                  <p className="selected-day">
                    {selectedDate.toLocaleDateString("es-ES", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                  {availabilityLoading ? (
                    <p className="selected-day">Consultando horarios disponibles…</p>
                  ) : slots.length === 0 ? (
                    <p className="selected-day">No quedan horarios disponibles para este día.</p>
                  ) : null}
                  <div className="time-grid">
                    {slots.map((time) => (
                      <button
                        className={selectedTime === time ? "is-selected" : ""}
                        disabled={availabilityLoading}
                        onClick={() => setSelectedTime(time)}
                        key={time}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <form className="booking-card__form" onSubmit={submitBooking}>
              <div>
                <label htmlFor="name">Nombre</label>
                <input id="name" name="name" required maxLength={60} pattern="[A-Za-zÀ-ÖØ-öø-ÿ]+(?: [A-Za-zÀ-ÖØ-öø-ÿ]+)*" title="Formato incorrecto. Solo letras y espacios; longitud permitida: 2–60 caracteres." placeholder="Tu nombre" />
              </div>
              <div>
                <label htmlFor="phone">Teléfono</label>
                <input
                  id="phone"
                  name="phone"
                  required
                  type="tel"
                  inputMode="tel"
                  maxLength={16}
                  pattern="\+?[0-9]{7,15}"
                  title="Formato incorrecto. Solo se aceptan números y un + opcional al principio (7–15 dígitos)."
                  placeholder="+34600820747"
                />
              </div>
              <button
                className="button button--gold"
                disabled={!selectedDate || !selectedTime || availabilityLoading}
                type="submit"
              >
                Revisar cita · {services[serviceIndex].price},00 €{" "}
                <Icon name="arrow" />
              </button>

            </form>
          </div>
        )}
        {bookingError && !pendingBooking && (
          <p className="booking-memory" role="alert">{bookingError}</p>
        )}

        {pendingBooking && (
          <div className="review-overlay" role="presentation">
            <div
              className="review-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="review-title"
            >
              <p className="eyebrow eyebrow--dark">
                <span /> Revisa tu cita
              </p>
              <h3 id="review-title">
                ¿Está todo
                <br />
                <em>correcto?</em>
              </h3>
              <p className="review-dialog__intro">
                Comprueba los datos antes de confirmar la reserva.
              </p>
              {bookingError && <p role="alert">{bookingError}</p>}
              <dl className="review-details">
                <div>
                  <dt>Nombre</dt>
                  <dd>{pendingBooking.name}</dd>
                </div>
                <div>
                  <dt>Servicio</dt>
                  <dd>{pendingBooking.service}</dd>
                </div>
                <div>
                  <dt>Fecha</dt>
                  <dd>{pendingBooking.dateLabel}</dd>
                </div>
                <div>
                  <dt>Hora</dt>
                  <dd>{pendingBooking.time}</dd>
                </div>
                <div>
                  <dt>Duración</dt>
                  <dd>{services[serviceIndex].duration} min</dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>{pendingBooking.price},00 €</dd>
                </div>
              </dl>
              <div className="review-actions">
                <button
                  className="review-edit"
                  onClick={() => setPendingBooking(null)}
                >
                  Volver y editar
                </button>
                <button
                  className="button button--dark"
                  onClick={confirmBooking}
                  disabled={bookingSaving}
                >
                  {bookingSaving ? "Guardando…" : "Confirmar reserva"} <Icon name="check" />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="location section" id="ubicacion">
        <div className="location__image">
          <img
            src={siteContent.studioPhoto || "/images/bh-studio.webp"}
            alt="Interior de B&H Barbershop en Mollet del Vallès"
          />
          <span>Tu sitio. Tu momento.</span>
        </div>
        <div className="location__content">
          <p className="eyebrow eyebrow--dark">
            <span /> Ven a vernos
          </p>
          <h2>
            Estamos en
            <br />
            <em>{siteContent.locationText ?? "Mollet del Vallès."}</em>
          </h2>
          <div className="address">
            <Icon name="location" size={24} />
            <div>
              <strong>Carrer d'Anselm Clavé, 31</strong>
              <span>08100 Mollet del Vallès, Barcelona</span>
            </div>
          </div>
          <a
            className="button button--dark"
            href="https://www.google.com/maps/search/?api=1&query=Carrer+d%27Anselm+Clavé+31+Mollet+del+Vallès"
            target="_blank"
            rel="noreferrer"
          >
            Cómo llegar <Icon name="arrow" />
          </a>
          <div className="opening">
            <div className="opening__title">
              <Icon name="clock" size={21} />
              <strong>Horario</strong>
            </div>
            {hours.map(([day, first, second]) => (
              <div className={day === "Domingo" ? "is-closed" : ""} key={day}>
                <span>{day}</span>
                <span>{first}</span>
                <span>{second}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <div className="footer__main">
          <Brand />
          <h2>
            ¿Listo para tu
            <br />
            <em>próximo corte?</em>
          </h2>
          <a className="button button--light" href="#reservar">
            Reserva ahora <Icon name="arrow" />
          </a>
        </div>
        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} B&H Barbershop</span>
          <a href="tel:+34600820747">600 820 747</a>
          <a
            href="https://www.instagram.com/bh.barbershop_/"
            target="_blank"
            rel="noreferrer"
          >
            Instagram ↗
          </a>
          <span>Mollet del Vallès</span>
        </div>
      </footer>
    </main>
  )
}

export default App
