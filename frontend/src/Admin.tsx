import { useEffect, useState } from "react"

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
const formatDate=(value:string)=>{const [year,month,day]=value.split("-");return `${day}/${month}/${year}`}
const maxBookingDate=()=>{const d=new Date();const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+2);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
const services = ["Corte caballero", "Corte + barba", "Corte + cejas", "Corte + barba + cejas", "Barba con degradado", "Rapado"]
type Booking = { id: number; name: string; phone: string; service: string; date: string; time: string }

export default function Admin() {
  const [token, setToken] = useState(localStorage.getItem("bh-admin-token") || "")
  const [password, setPassword] = useState("")
  const [tab, setTab] = useState("Citas")
  const [bookings, setBookings] = useState<Booking[]>([])
  const [closures, setClosures] = useState<{date:string;reason:string}[]>([])
  const [error, setError] = useState("")
  const [editing, setEditing] = useState<Booking | null>(null)
  const [closeDate, setCloseDate] = useState("")
  const [reason, setReason] = useState("")
  const maxDate=maxBookingDate()
  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
  async function api(path:string, init:RequestInit={}) { const r=await fetch(`${API}${path}`,{...init,headers:{...auth,...init.headers}}); const d=await r.json(); if(!r.ok)throw Error(d.error||"No se pudo completar la acción"); return d }
  async function refresh(){try{const [b,c]=await Promise.all([api("/api/admin/bookings"),api("/api/admin/closures")]);setBookings(b);setClosures(c)}catch(e){setError(String(e))}}
  useEffect(()=>{if(token)void refresh()},[token])
  async function login(e:React.FormEvent){e.preventDefault();try{const d=await api("/api/admin/login",{method:"POST",body:JSON.stringify({password})});localStorage.setItem("bh-admin-token",d.token);setToken(d.token);setError("")}catch(e){setError(String(e))}}
  async function save(e:React.FormEvent){e.preventDefault();if(!editing)return;try{await api(editing.id?`/api/admin/bookings/${editing.id}`:"/api/admin/bookings",{method:editing.id?"PATCH":"POST",body:JSON.stringify(editing)});setEditing(null);await refresh()}catch(e){setError(String(e))}}
  async function addClosure(e:React.FormEvent){e.preventDefault();try{await api("/api/admin/closures",{method:"POST",body:JSON.stringify({date:closeDate,reason})});setReason("");await refresh()}catch(e){setError(String(e))}}
  if(!token)return <main className="admin-page"><form className="admin-card" onSubmit={login}><h1>Administración B&amp;H</h1><p>Acceso exclusivo del propietario</p><label>Contraseña<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoFocus/></label><button>Entrar</button>{error&&<p role="alert">{error}</p>}</form></main>
  return <main className="admin-page"><header><h1>Panel del local</h1><button onClick={()=>{localStorage.removeItem("bh-admin-token");setToken("")}}>Cerrar sesión</button></header><nav>{["Citas","Días cerrados"].map(x=><button className={tab===x?"active":""} onClick={()=>setTab(x)} key={x}>{x}</button>)}</nav>{error&&<p role="status">{error}</p>}
    {tab==="Citas"&&<section className="admin-card"><div className="admin-row"><h2>Citas</h2><button onClick={()=>setEditing({id:0,name:"",phone:"",service:services[0],date:new Date().toISOString().slice(0,10),time:"09:30"})}>Añadir cita</button></div>{bookings.map(b=><article className="admin-booking" key={b.id}><div><b>{formatDate(b.date)} · {b.time}</b><p>{b.name} · {b.phone}</p><small>{b.service}</small></div><button onClick={()=>setEditing(b)}>Modificar</button><button onClick={()=>api(`/api/admin/bookings/${b.id}`,{method:"DELETE"}).then(refresh).catch(e=>setError(String(e)))}>Eliminar</button></article>)}{editing&&<form className="admin-card" onSubmit={save}><h3>{editing.id?"Modificar cita":"Añadir cita"}</h3>{(["name","phone","service","date","time"] as const).map(k=><label key={k}>{({name:"Nombre",phone:"Teléfono",service:"Servicio",date:"Fecha (dd/mm/aaaa)",time:"Hora"})[k]}{k==="service"?<select value={editing[k]} onChange={e=>setEditing({...editing,service:e.target.value})}>{services.map(s=><option key={s}>{s}</option>)}</select>:<input type={k==="date"?"date":k==="time"?"time":"text"} max={k==="date"?maxDate:undefined} required value={editing[k]} onChange={e=>setEditing({...editing,[k]:e.target.value})}/>}</label>)}<button>Guardar</button><button type="button" onClick={()=>setEditing(null)}>Cancelar</button></form>}</section>}
    {tab==="Días cerrados"&&<section className="admin-card"><h2>Cerrar un día</h2><p>Las nuevas reservas no podrán elegir esas fechas.</p><form onSubmit={addClosure}><label>Fecha (dd/mm/aaaa)<input type="date" value={closeDate} onChange={e=>setCloseDate(e.target.value)} required/></label><label>Motivo<input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Vacaciones, festivo…" required/></label><button>Guardar cierre</button></form>{closures.map(c=><article className="admin-booking" key={c.date}><b>{formatDate(c.date)}</b><span>{c.reason}</span><button onClick={()=>api(`/api/admin/closures/${c.date}`,{method:"DELETE"}).then(refresh).catch(e=>setError(String(e)))}>Reabrir</button></article>)}</section>}
  </main>
}
