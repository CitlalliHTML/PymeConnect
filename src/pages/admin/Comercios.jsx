import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../supabase.js";
import { useAuth } from "../../auth.jsx";
import Icono from "../../components/Icono.jsx";
import { registrarLog } from "../../lib/admin.js";
import { ESTADO_COMERCIO, ESTADO_VERIF, fecha, nombreCompleto, tono } from "../../lib/etiquetas.js";

export default function Comercios() {
  const { user } = useAuth();
  const [filas, setFilas] = useState(null);
  const [verif, setVerif] = useState({});
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("todos");
  const [abierto, setAbierto] = useState(null);
  const [confirmar, setConfirmar] = useState(null);
  const [aviso, setAviso] = useState({ tipo: "", texto: "" });

  const cargar = async () => {
    const [c, v] = await Promise.all([
      supabase.from("comercios").select("*, categorias(nombre), propietario:perfiles!comercios_propietario_id_fkey(nombre,apellidos)").order("created_at", { ascending: false }),
      supabase.from("verificaciones").select("comercio_id,estado,created_at").order("created_at", { ascending: false }),
    ]);
    if (c.error) { console.error(c.error); setAviso({ tipo: "error", texto: "No pudimos cargar los comercios." }); }
    const ultimo = {}; (v.data || []).forEach((r) => { if (!ultimo[r.comercio_id]) ultimo[r.comercio_id] = r.estado; });
    setVerif(ultimo); setFilas(c.data || []);
  };
  useEffect(() => { cargar(); }, []);

  const etiquetaVerif = (c) => (c.verificado ? ["Verificado", ""] : verif[c.id] ? [ESTADO_VERIF[verif[c.id]], tono(verif[c.id])] : ["No verificado", "pausado"]);
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (filas || []).filter((c) => (estado === "todos" || c.estado === estado) && (!t || `${c.nombre} ${c.categorias?.nombre || ""} ${nombreCompleto(c.propietario)}`.toLowerCase().includes(t)));
  }, [filas, q, estado]);

  async function cambiar(c, nuevo) {
    setConfirmar(null);
    const { error } = await supabase.from("comercios").update({ estado: nuevo }).eq("id", c.id);
    if (error) { console.error(error); return setAviso({ tipo: "error", texto: "No pudimos actualizar el comercio." }); }
    await registrarLog(user.id, `comercio_${nuevo}`, "comercios", c.id, { nombre: c.nombre, antes: c.estado });
    setAviso({ tipo: "ok", texto: nuevo === "activo" ? "Comercio reactivado." : nuevo === "suspendido" ? "Comercio suspendido: ya no aparece en el directorio." : "Comercio dado de baja." });
    cargar();
  }

  return (
    <>
      <div className="pn-cabecera"><div>
        <p className="pn-fecha">ADMINISTRACIÓN</p><h1>Gestión de comercios</h1>
        <p className="muted">{filas ? `${lista.length} de ${filas.length} registros en esta vista.` : "Cargando…"}</p>
      </div></div>
      <div aria-live="polite" className="pn-aviso-zona">{aviso.texto && <p className={`msg ${aviso.tipo}`} role={aviso.tipo === "error" ? "alert" : undefined}>{aviso.texto}</p>}</div>

      <section className="pn-card">
        <div className="pn-filtros">
          <label className="pn-buscar"><Icono n="busca" /><input type="search" placeholder="Buscar por nombre, categoría o propietario" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar comercios" maxLength={80} /></label>
          <select className="campo" value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado">
            <option value="todos">Todos los estados</option><option value="activo">Activo</option><option value="suspendido">Suspendido</option><option value="baja">Baja</option>
          </select>
        </div>
        <div className="pn-tabla-caja">
          <table className="pn-tabla">
            <thead><tr><th>Nombre</th><th>Categoría</th><th>Propietario</th><th>Estado</th><th>Verificación</th><th>Registro</th><th>Acciones</th></tr></thead>
            <tbody>
              {filas === null && <tr><td colSpan={7} className="muted">Cargando…</td></tr>}
              {filas && lista.length === 0 && <tr><td colSpan={7} className="muted">No hay comercios con ese filtro.</td></tr>}
              {lista.map((c) => { const [vt, vc] = etiquetaVerif(c); return (
                <Fragment key={c.id}>
                  <tr>
                    <td><strong>{c.nombre}</strong>{c.es_ejemplo && <small className="muted"> · ejemplo</small>}</td>
                    <td>{c.categorias?.nombre || "—"}</td>
                    <td>{c.propietario ? nombreCompleto(c.propietario) : <span className="muted">Sin propietario</span>}</td>
                    <td><span className={`pn-estado ${tono(c.estado)}`}>{ESTADO_COMERCIO[c.estado]}</span></td>
                    <td><span className={`pn-estado ${vc}`}>{vt}</span></td>
                    <td>{fecha(c.created_at)}</td>
                    <td><div className="pn-acciones">
                      <button className="pn-link" aria-expanded={abierto === c.id} onClick={() => setAbierto(abierto === c.id ? null : c.id)}>{abierto === c.id ? "Ocultar" : "Ver"}</button>
                      {c.estado === "activo" && <button className="pn-link" onClick={() => cambiar(c, "suspendido")}>Suspender</button>}
                      {c.estado !== "activo" && <button className="pn-link" onClick={() => cambiar(c, "activo")}>Reactivar</button>}
                      {c.estado !== "baja" && (confirmar === c.id
                        ? <><button className="pn-link peligro" onClick={() => cambiar(c, "baja")}>Sí, dar de baja</button><button className="pn-link" onClick={() => setConfirmar(null)}>No</button></>
                        : <button className="pn-link peligro" onClick={() => setConfirmar(c.id)}>Dar de baja</button>)}
                    </div></td>
                  </tr>
                  {abierto === c.id && (
                    <tr className="pn-detalle"><td colSpan={7}>
                      <dl className="pn-datos">
                        <div><dt>Dirección</dt><dd>{c.direccion || "—"}</dd></div>
                        <div><dt>Teléfono</dt><dd>{c.telefono || "—"}</dd></div>
                        <div><dt>WhatsApp</dt><dd>{c.whatsapp || "—"}</dd></div>
                        <div><dt>Redes sociales</dt><dd>{c.redes_sociales || "—"}</dd></div>
                        <div className="pn-datos-ancho"><dt>Descripción</dt><dd>{c.descripcion || "—"}</dd></div>
                      </dl>
                      {c.estado === "activo" && <Link className="pn-link" to={`/comercio/${c.id}`}>Ver ficha pública →</Link>}
                    </td></tr>
                  )}
                </Fragment>
              ); })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
