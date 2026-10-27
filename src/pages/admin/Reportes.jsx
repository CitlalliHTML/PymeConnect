import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase.js";
import { useAuth } from "../../auth.jsx";
import { registrarLog } from "../../lib/admin.js";
import { ESTADO_REPORTE, MOTIVOS, fecha, tono } from "../../lib/etiquetas.js";

export default function Reportes() {
  const { user } = useAuth();
  const [filas, setFilas] = useState(null);
  const [filtro, setFiltro] = useState("abiertos");
  const [abierto, setAbierto] = useState(null);
  const [confirmar, setConfirmar] = useState(null);
  const [aviso, setAviso] = useState({ tipo: "", texto: "" });

  const cargar = async () => {
    const { data, error } = await supabase.from("reportes").select("*, comercio:comercios(id,nombre,estado)").order("created_at", { ascending: false });
    if (error) { console.error(error); setAviso({ tipo: "error", texto: "No pudimos cargar los reportes." }); }
    setFilas(data || []);
  };
  useEffect(() => { cargar(); }, []);

  const lista = useMemo(() => (filas || []).filter((r) => filtro === "todos" || (filtro === "abiertos" ? r.estado !== "resuelto" : r.estado === filtro)), [filas, filtro]);

  async function estado(r, nuevo) {
    const { error } = await supabase.from("reportes").update({ estado: nuevo }).eq("id", r.id);
    if (error) { console.error(error); return setAviso({ tipo: "error", texto: "No pudimos actualizar el reporte." }); }
    await registrarLog(user.id, `reporte_${nuevo}`, "reportes", r.id, { comercio: r.comercio?.nombre, motivo: r.motivo });
    setAviso({ tipo: "ok", texto: nuevo === "resuelto" ? "Reporte marcado como resuelto." : "Reporte en revisión." });
    cargar();
  }
  async function suspender(r) {
    setConfirmar(null);
    const { error } = await supabase.from("comercios").update({ estado: "suspendido" }).eq("id", r.comercio_id);
    if (error) { console.error(error); return setAviso({ tipo: "error", texto: "No pudimos suspender el comercio." }); }
    await registrarLog(user.id, "comercio_suspendido", "comercios", r.comercio_id, { por_reporte: r.id, nombre: r.comercio?.nombre });
    setAviso({ tipo: "ok", texto: "Comercio suspendido. Recuerda marcar el reporte como resuelto." });
    cargar();
  }

  return (
    <>
      <div className="pn-cabecera"><div>
        <p className="pn-fecha">ADMINISTRACIÓN</p><h1>Gestión de reportes</h1>
        <p className="muted">{filas ? `${lista.length} de ${filas.length} registros en esta vista.` : "Cargando…"}</p>
      </div></div>
      <div aria-live="polite" className="pn-aviso-zona">{aviso.texto && <p className={`msg ${aviso.tipo}`} role={aviso.tipo === "error" ? "alert" : undefined}>{aviso.texto}</p>}</div>

      <section className="pn-card">
        <div className="pn-filtros">
          <select className="campo" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar reportes">
            <option value="abiertos">Sin resolver</option><option value="todos">Todos</option>
            {Object.entries(ESTADO_REPORTE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="pn-tabla-caja">
          <table className="pn-tabla">
            <thead><tr><th>Reporte</th><th>Comercio</th><th>Motivo</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {filas === null && <tr><td colSpan={6} className="muted">Cargando…</td></tr>}
              {filas && lista.length === 0 && <tr><td colSpan={6} className="muted">No hay reportes en esta vista.</td></tr>}
              {lista.map((r) => (
                <Fragment key={r.id}>
                  <tr>
                    <td><strong>{MOTIVOS[r.motivo]}</strong></td>
                    <td>{r.comercio?.nombre || "—"}{r.comercio?.estado && r.comercio.estado !== "activo" && <small className="muted"> · {r.comercio.estado}</small>}</td>
                    <td className="pn-corto">{r.descripcion || <span className="muted">Sin descripción</span>}</td>
                    <td>{fecha(r.created_at)}</td>
                    <td><span className={`pn-estado ${tono(r.estado === "resuelto" ? "" : r.estado)}`}>{ESTADO_REPORTE[r.estado]}</span></td>
                    <td><div className="pn-acciones">
                      <button className="pn-link" aria-expanded={abierto === r.id} onClick={() => setAbierto(abierto === r.id ? null : r.id)}>{abierto === r.id ? "Ocultar" : "Revisar"}</button>
                      {r.estado === "pendiente" && <button className="pn-link" onClick={() => estado(r, "en_revision")}>Tomar</button>}
                      {r.estado !== "resuelto" && <button className="pn-link" onClick={() => estado(r, "resuelto")}>Resolver</button>}
                      {r.comercio?.estado === "activo" && (confirmar === r.id
                        ? <><button className="pn-link peligro" onClick={() => suspender(r)}>Sí, suspender</button><button className="pn-link" onClick={() => setConfirmar(null)}>No</button></>
                        : <button className="pn-link peligro" onClick={() => setConfirmar(r.id)}>Suspender comercio</button>)}
                    </div></td>
                  </tr>
                  {abierto === r.id && (
                    <tr className="pn-detalle"><td colSpan={6}>
                      <dl className="pn-datos">
                        <div><dt>Motivo</dt><dd>{MOTIVOS[r.motivo]}</dd></div>
                        <div><dt>Recibido</dt><dd>{fecha(r.created_at)}</dd></div>
                        <div className="pn-datos-ancho"><dt>Descripción del visitante</dt><dd>{r.descripcion || "—"}</dd></div>
                      </dl>
                    </td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
