import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../supabase.js";
import { useFav } from "../favoritos.jsx";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MOTIVOS = [
  ["informacion_falsa", "Información falsa"],
  ["comercio_inexistente", "El comercio ya no existe"],
  ["informacion_desactualizada", "Información desactualizada"],
  ["contenido_inapropiado", "Contenido inapropiado"],
  ["otro", "Otro"],
];
const hora = (t) => (t ? t.slice(0, 5) : "");

export default function Comercio() {
  const { id } = useParams();
  const { ids, alternar } = useFav();
  const [n, setN] = useState(null);
  const [horarios, setHorarios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [estado, setEstado] = useState("cargando");

  useEffect(() => {
    if (!supabase) return setEstado("error");
    Promise.all([
      supabase.from("directorio").select("*").eq("id", id).maybeSingle(),
      supabase.from("horarios").select("*").eq("comercio_id", id).order("dia_semana"),
      supabase.from("productos").select("*").eq("comercio_id", id).eq("activo", true).order("nombre"),
    ]).then(([c, h, p]) => {
      if (c.error) return setEstado("error");
      if (!c.data) return setEstado("vacio");
      setN(c.data); setHorarios(h.data || []); setProductos(p.data || []); setEstado("ok");
    });
  }, [id]);

  if (estado === "cargando") return <p>Cargando…</p>;
  if (estado !== "ok") return <p>No pudimos mostrar este comercio. <Link to="/">Volver al directorio</Link></p>;

  const tel = (n.telefono || "").replace(/\D/g, "");
  const wa = (n.whatsapp || "").replace(/\D/g, "");
  const mapa = n.latitud && n.longitud
    ? `https://www.google.com/maps/dir/?api=1&destination=${n.latitud},${n.longitud}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(n.direccion)}`;

  return (
    <article>
      <Link to="/" className="volver">← Volver al directorio</Link>
      <h1>{n.nombre}</h1>
      <p className="muted">{n.categoria}{n.verificado && " · ✔ Verificado"}</p>
      <span className={`estado ${n.abierto_ahora ? "abierto" : "cerrado"}`}>{n.abierto_ahora ? "Abierto ahora" : "Cerrado"}</span>
      {n.foto_url && <img className="portada" src={n.foto_url} alt={`Fachada de ${n.nombre}`} />}
      {n.descripcion && <p>{n.descripcion}</p>}
      <p>📍 {n.direccion}</p>

      <div className="acciones-fila">
        {tel && <a className="btn btn-primario" href={`tel:${tel}`}>📞 Llamar</a>}
        {wa && <a className="btn btn-primario" href={`https://wa.me/52${wa}`} target="_blank" rel="noreferrer">💬 WhatsApp</a>}
        <a className="btn btn-primario" href={mapa} target="_blank" rel="noreferrer">🧭 Cómo llegar</a>
        <button className="btn btn-borde" onClick={() => alternar(n.id)} aria-pressed={ids.includes(n.id)}>
          {ids.includes(n.id) ? "♥ En favoritos" : "♡ Guardar"}
        </button>
      </div>

      <section className="panel">
        <h2>Horario</h2>
        <ul className="lista">
          {horarios.map((h) => (
            <li key={h.id}><span>{DIAS[h.dia_semana]}</span><span>{h.cerrado ? "Cerrado" : `${hora(h.abre)} – ${hora(h.cierra)}`}</span></li>
          ))}
        </ul>
      </section>

      {productos.length > 0 && (
        <section className="panel">
          <h2>Productos y servicios</h2>
          <ul className="lista">
            {productos.map((p) => (
              <li key={p.id}><span>{p.nombre}</span><span>{p.precio != null && `$${Number(p.precio).toFixed(2)}`}</span></li>
            ))}
          </ul>
        </section>
      )}

      <Reporte comercioId={n.id} />
    </article>
  );
}

function Reporte({ comercioId }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("otro");
  const [texto, setTexto] = useState("");
  const [trampa, setTrampa] = useState("");
  const [msg, setMsg] = useState(null);

  async function enviar(e) {
    e.preventDefault();
    setMsg({ t: "info", m: "Enviando…" });
    const { error } = await supabase.functions.invoke("enviar-reporte", {
      body: { comercio_id: comercioId, motivo, descripcion: texto, website: trampa },
    });
    if (!error) { setMsg({ t: "ok", m: "Gracias, recibimos tu reporte." }); setTexto(""); return; }
    let m = "No se pudo enviar el reporte.";
    try { m = (await error.context.json()).error || m; } catch { /* mensaje genérico */ }
    setMsg({ t: "error", m });
  }

  if (!abierto) return <button className="btn btn-borde" onClick={() => setAbierto(true)}>⚑ Reportar este comercio</button>;
  return (
    <form className="panel" onSubmit={enviar}>
      <h2>Reportar este comercio</h2>
      <label>Motivo
        <select className="campo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
          {MOTIVOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
      </label>
      <label>Detalles (opcional)
        <textarea className="campo" rows="3" maxLength="500" value={texto} onChange={(e) => setTexto(e.target.value)} />
      </label>
      {/* Campo trampa para bots: oculto para personas */}
      <input className="trampa" tabIndex="-1" autoComplete="off" aria-hidden="true" value={trampa} onChange={(e) => setTrampa(e.target.value)} name="website" />
      <button className="btn btn-primario" type="submit">Enviar reporte</button>
      {msg && <p role="status" className={`msg ${msg.t}`}>{msg.m}</p>}
    </form>
  );
}
