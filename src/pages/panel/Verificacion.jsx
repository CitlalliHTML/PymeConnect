import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../../supabase.js";
import { useAuth } from "../../auth.jsx";
import Icono from "../../components/Icono.jsx";
import { subir, inspeccionar, DOCS, BUCKET_DOCS } from "../../lib/archivos.js";

// Estados reales de la tabla: pendiente · en_revision · info_adicional · aprobada · rechazada
const ETIQUETA = { sin: "Sin enviar", pendiente: "Pendiente", en_revision: "En revisión", info_adicional: "Falta información", aprobada: "Aprobada", rechazada: "Rechazada" };
const MAX_ARCHIVOS = 4;
const RFC_OK = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

export default function Verificacion() {
  const { user } = useAuth();
  const d = useOutletContext();
  const n = d.negocio;
  const [sol, setSol] = useState(undefined);   // undefined = cargando, null = sin solicitud
  const [archivos, setArchivos] = useState([]);
  const [rfc, setRfc] = useState("");
  const [msg, setMsg] = useState({ tipo: "", texto: "" });
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    if (!n?.id) return setSol(null);
    const { data } = await supabase.from("verificaciones").select("*").eq("comercio_id", n.id).order("created_at", { ascending: false }).limit(1);
    setSol(data?.[0] ?? null);
  }, [n?.id]);
  useEffect(() => { if (!d.cargando) cargar(); }, [d.cargando, cargar]);

  const estado = n?.verificado ? "aprobada" : sol?.estado || "sin";
  const puedeEnviar = n && ["sin", "rechazada", "info_adicional"].includes(estado);

  async function elegir(e) {
    const nuevos = [...e.target.files]; e.target.value = "";
    for (const f of nuevos) {
      const r = await inspeccionar(f, { tipos: DOCS, maxMB: 10 });
      if (r.error) return setMsg({ tipo: "error", texto: `${f.name.slice(0, 40)}: ${r.error}` });
    }
    if (archivos.length + nuevos.length > MAX_ARCHIVOS) return setMsg({ tipo: "error", texto: `Máximo ${MAX_ARCHIVOS} documentos.` });
    setMsg({ tipo: "", texto: "" }); setArchivos([...archivos, ...nuevos]);
  }

  async function enviar() {
    if (enviando) return;
    const clave = rfc.trim().toUpperCase();
    if (clave && !RFC_OK.test(clave)) return setMsg({ tipo: "error", texto: "El RFC no tiene un formato válido (12 o 13 caracteres)." });
    if (archivos.length < 2) return setMsg({ tipo: "error", texto: "Sube al menos tu identificación y el comprobante del negocio." });
    setEnviando(true); setMsg({ tipo: "", texto: "" });
    const rutas = [];
    for (const f of archivos) {
      const r = await subir(BUCKET_DOCS, user.id, f, { tipos: DOCS, maxMB: 10 });   // bucket PRIVADO
      if (r.error) { setEnviando(false); return setMsg({ tipo: "error", texto: r.error }); }
      rutas.push(r.ruta);
    }
    // La política de la BD solo permite crear solicitudes en estado 'pendiente'; el administrador las resuelve.
    const { error } = await supabase.from("verificaciones").insert({ comercio_id: n.id, estado: "pendiente", documentos: rutas, rfc: clave || null });
    setEnviando(false);
    if (error) { console.error("[verificacion]", error); return setMsg({ tipo: "error", texto: "No pudimos enviar tu solicitud. Intenta de nuevo." }); }
    setArchivos([]); setRfc(""); setMsg({ tipo: "ok", texto: "Solicitud enviada. Revisaremos todo en 3 a 5 días." });
    cargar();
  }

  const pasos = [
    ["Identificación oficial", "INE o pasaporte vigente."],
    ["Comprobante del negocio", "Licencia o comprobante de domicilio."],
    ["Enviar solicitud", "Revisaremos todo en 3 a 5 días."],
  ];
  const fase = { sin: 0, pendiente: 1, en_revision: 2, info_adicional: 2, aprobada: 3, rechazada: 3 }[estado];
  const linea = [
    ["Pendiente", "Solicitud recibida", fase >= 1],
    ["En revisión", "Validación de documentos", fase >= 2],
    [estado === "rechazada" ? "Rechazada" : "Aprobada", estado === "rechazada" ? "Requiere cambios" : "Insignia activada", fase >= 3],
  ];

  return (
    <>
      <div className="pn-cabecera">
        <div>
          <p className="pn-fecha">CONFIANZA Y SEGURIDAD</p>
          <h1>Verifica tu negocio</h1>
          <p className="muted">Muestra la insignia “Negocio verificado” en tu perfil.</p>
        </div>
        <span className={`pn-estado ${["rechazada"].includes(estado) ? "rechazo" : estado === "aprobada" ? "" : "pausado"}`}>{ETIQUETA[estado]}</span>
      </div>
      <div aria-live="polite" className="pn-aviso-zona">{msg.texto && <p className={`msg ${msg.tipo}`} role={msg.tipo === "error" ? "alert" : undefined}>{msg.texto}</p>}</div>

      {d.cargando || sol === undefined ? <p className="muted" role="status">Cargando…</p> : (
        <div className="pn-dos pn-dos-ver">
          <section className="pn-card">
            <h2>Documentación requerida</h2>
            {!n ? (
              <div className="aviso">Primero completa los datos de <Link to="/panel/negocio"><strong>Mi negocio</strong></Link>.</div>
            ) : estado === "aprobada" ? (
              <p className="pn-ok"><Icono n="check" /> Tu negocio está verificado. La insignia ya es visible en tu perfil.</p>
            ) : !puedeEnviar ? (
              <p className="muted">Recibimos tu solicitud y la estamos revisando. Te avisaremos cuando haya una respuesta.</p>
            ) : (
              <>
                {estado === "rechazada" && <div className="aviso" role="alert"><strong>Tu solicitud fue rechazada.</strong>{sol?.nota_admin ? ` Motivo: ${sol.nota_admin}` : ""} Puedes enviar una nueva.</div>}
                {estado === "info_adicional" && <div className="aviso" role="alert"><strong>Necesitamos más información.</strong>{sol?.nota_admin ? ` ${sol.nota_admin}` : ""} Envía una nueva solicitud con los documentos completos.</div>}
                <p className="muted">Necesitamos comprobar que el negocio existe y que eres su propietario.</p>
                <ol className="pn-pasos">
                  {pasos.map(([t, s], i) => <li key={t}><span>{i + 1}</span><div><strong>{t}</strong><p className="muted">{s}</p></div></li>)}
                </ol>
                <label className="pn-campo"><span>RFC (opcional)</span>
                  <input className="campo" value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} maxLength={13} placeholder="Ej. MAEL850412AB3" autoComplete="off" /></label>
                <label className="pn-subida">
                  <Icono n="reporte" size={30} />
                  <strong>Seleccionar documentos</strong>
                  <small>PDF, JPG o PNG · máximo 10 MB · hasta {MAX_ARCHIVOS} archivos</small>
                  <input type="file" className="sr-only" multiple accept="application/pdf,image/jpeg,image/png" onChange={elegir} />
                </label>
                {archivos.length > 0 && (
                  <ul className="pn-archivos">
                    {archivos.map((f, i) => (
                      <li key={i}><span>{f.name.slice(0, 60)}</span><small>{(f.size / 1048576).toFixed(1)} MB</small>
                        <button type="button" className="pn-link peligro" onClick={() => setArchivos(archivos.filter((_, j) => j !== i))}>Quitar</button></li>
                    ))}
                  </ul>
                )}
                <button className="pn-btn-oscuro pn-completo" onClick={enviar} disabled={enviando}>{enviando ? "Enviando…" : "Enviar solicitud"}</button>
                <p className="muted pn-priv"><Icono n="check" size={14} /> Tus documentos se guardan en un espacio privado; solo el equipo de verificación puede verlos.</p>
              </>
            )}
          </section>

          <section className="pn-card">
            <h2>Estado de solicitud</h2>
            <div className="pn-linea">
              {linea.map(([t, s, ok], i) => (
                <div key={i} className={ok ? (estado === "rechazada" && i === 2 ? "malo" : "hecho") : ""}>
                  <span><Icono n={estado === "rechazada" && i === 2 ? "cerrar" : "check"} size={14} /></span>
                  <p><strong>{t}</strong><small>{s}</small></p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
