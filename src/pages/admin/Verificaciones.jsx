import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase.js";
import { useAuth } from "../../auth.jsx";
import Icono from "../../components/Icono.jsx";
import { registrarLog } from "../../lib/admin.js";
import { BUCKET_DOCS } from "../../lib/archivos.js";
import { ESTADO_VERIF, fecha, nombreCompleto, tono } from "../../lib/etiquetas.js";

const ACTIVAS = ["pendiente", "en_revision", "info_adicional"];

export default function Verificaciones() {
  const { user } = useAuth();
  const [filas, setFilas] = useState(null);
  const [filtro, setFiltro] = useState("activas");
  const [sel, setSel] = useState(null);
  const [nota, setNota] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState({ tipo: "", texto: "" });

  const cargar = async () => {
    const { data, error } = await supabase.from("verificaciones")
      .select("*, comercio:comercios(id,nombre,direccion,telefono,verificado,propietario:perfiles!comercios_propietario_id_fkey(nombre,apellidos,telefono))")
      .order("created_at", { ascending: false });
    if (error) { console.error(error); setAviso({ tipo: "error", texto: "No pudimos cargar las solicitudes." }); }
    setFilas(data || []);
    return data || [];
  };
  useEffect(() => { cargar(); }, []);

  const lista = useMemo(() => (filas || []).filter((v) => filtro === "todas" || (filtro === "activas" ? ACTIVAS.includes(v.estado) : v.estado === filtro)), [filas, filtro]);
  const actual = filas?.find((v) => v.id === sel);

  async function resolver(nuevo) {
    if (ocupado || !actual) return;
    if (["rechazada", "info_adicional"].includes(nuevo) && nota.trim().length < 5) return setAviso({ tipo: "error", texto: "Escribe una nota para el comerciante (mínimo 5 caracteres)." });
    setOcupado(true); setAviso({ tipo: "", texto: "" });
    const cambios = { estado: nuevo, revisado_por: user.id };
    if (nota.trim()) cambios.nota_admin = nota.trim().slice(0, 500);
    // El trigger `verificaciones_sincronizar` de la BD pone comercios.verificado = (estado = 'aprobada')
    const { error } = await supabase.from("verificaciones").update(cambios).eq("id", actual.id);
    setOcupado(false);
    if (error) { console.error(error); return setAviso({ tipo: "error", texto: "No pudimos guardar la decisión." }); }
    await registrarLog(user.id, `verificacion_${nuevo}`, "verificaciones", actual.id, { comercio: actual.comercio?.nombre });
    setAviso({ tipo: "ok", texto: { en_revision: "Revisión iniciada.", aprobada: "Solicitud aprobada: el negocio ya muestra la insignia.", rechazada: "Solicitud rechazada.", info_adicional: "Se pidió información adicional al comerciante." }[nuevo] });
    setNota(""); await cargar();
  }

  async function abrirDoc(ruta) {
    // Enlace firmado de 2 minutos: el bucket es privado y no hay URL pública
    const { data, error } = await supabase.storage.from(BUCKET_DOCS).createSignedUrl(ruta, 120);
    if (error || !data?.signedUrl) return setAviso({ tipo: "error", texto: "No pudimos abrir el documento." });
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const cerrada = actual && ["aprobada", "rechazada"].includes(actual.estado);
  const fase = actual ? { pendiente: 1, en_revision: 2, info_adicional: 2, aprobada: 3, rechazada: 3 }[actual.estado] : 0;

  return (
    <>
      <div className="pn-cabecera"><div>
        <p className="pn-fecha">CONFIANZA Y SEGURIDAD</p>
        <h1>{actual ? "Revisar solicitud" : "Verificaciones"}</h1>
        <p className="muted">{actual ? "Comprueba la información y los documentos enviados." : "Solicitudes de verificación de los comercios."}</p>
      </div>
      {actual && <span className={`pn-estado ${tono(actual.estado)}`}>{ESTADO_VERIF[actual.estado]}</span>}</div>
      <div aria-live="polite" className="pn-aviso-zona">{aviso.texto && <p className={`msg ${aviso.tipo}`} role={aviso.tipo === "error" ? "alert" : undefined}>{aviso.texto}</p>}</div>

      {!actual ? (
        <section className="pn-card">
          <div className="pn-filtros">
            <select className="campo" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar solicitudes">
              <option value="activas">Por revisar</option><option value="todas">Todas</option>
              {Object.entries(ESTADO_VERIF).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="pn-tabla-caja">
            <table className="pn-tabla">
              <thead><tr><th>Negocio</th><th>Propietario</th><th>Documentos</th><th>Enviada</th><th>Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                {filas === null && <tr><td colSpan={6} className="muted">Cargando…</td></tr>}
                {filas && lista.length === 0 && <tr><td colSpan={6} className="muted">No hay solicitudes en esta vista.</td></tr>}
                {lista.map((v) => (
                  <tr key={v.id}>
                    <td><strong>{v.comercio?.nombre || "—"}</strong></td>
                    <td>{nombreCompleto(v.comercio?.propietario)}</td>
                    <td>{v.documentos?.length || 0}</td><td>{fecha(v.created_at)}</td>
                    <td><span className={`pn-estado ${tono(v.estado)}`}>{ESTADO_VERIF[v.estado]}</span></td>
                    <td><button className="pn-link" onClick={() => { setSel(v.id); setNota(v.nota_admin || ""); setAviso({ tipo: "", texto: "" }); }}>Revisar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="pn-dos pn-dos-ver">
          <section className="pn-card">
            <button className="pn-link" onClick={() => { setSel(null); setAviso({ tipo: "", texto: "" }); }}>← Volver a la lista</button>
            <h2>Datos del negocio</h2>
            <div className="pn-filas-info">
              <div><span>Negocio</span><strong>{actual.comercio?.nombre}</strong></div>
              <div><span>Propietario</span><strong>{nombreCompleto(actual.comercio?.propietario)}</strong></div>
              <div><span>Teléfono</span><strong>{actual.comercio?.propietario?.telefono || actual.comercio?.telefono || "—"}</strong></div>
              <div><span>Dirección</span><strong>{actual.comercio?.direccion || "—"}</strong></div>
              <div><span>RFC</span><strong>{actual.rfc || "No proporcionado"}</strong></div>
              <div><span>Enviada</span><strong>{fecha(actual.created_at)}</strong></div>
            </div>

            <h2 className="pn-sep">Documentos enviados</h2>
            {(actual.documentos || []).length === 0 ? <p className="muted">No hay documentos.</p> : (
              <ul className="pn-archivos">
                {actual.documentos.map((r, i) => (
                  <li key={r}><Icono n="reporte" size={16} /><span>Documento {i + 1} · {r.split(".").pop().toUpperCase()}</span>
                    <button className="pn-link" onClick={() => abrirDoc(r)}>Abrir</button></li>
                ))}
              </ul>
            )}

            {!cerrada ? (
              <>
                <label className="pn-campo pn-sep"><span>Nota para el comerciante {`(obligatoria al rechazar o pedir información)`}</span>
                  <textarea className="campo" rows={3} maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)} /></label>
                <div className="pn-botones">
                  {actual.estado === "pendiente" && <button className="btn btn-borde" disabled={ocupado} onClick={() => resolver("en_revision")}>Iniciar revisión</button>}
                  <button className="pn-btn-oscuro" disabled={ocupado} onClick={() => resolver("aprobada")}>Aprobar</button>
                  <button className="btn pn-peligro" disabled={ocupado} onClick={() => resolver("rechazada")}>Rechazar</button>
                  <button className="btn btn-borde" disabled={ocupado} onClick={() => resolver("info_adicional")}>Solicitar información adicional</button>
                </div>
              </>
            ) : (
              <p className="muted pn-sep">Esta solicitud ya fue {actual.estado === "aprobada" ? "aprobada" : "rechazada"}.{actual.nota_admin ? ` Nota: ${actual.nota_admin}` : ""}</p>
            )}
          </section>

          <section className="pn-card">
            <h2>Estado de solicitud</h2>
            <div className="pn-linea">
              {[["Pendiente", "Solicitud recibida", fase >= 1], ["En revisión", "Validación de documentos", fase >= 2],
                [actual.estado === "rechazada" ? "Rechazada" : "Aprobada", actual.estado === "rechazada" ? "Requiere cambios" : "Insignia activada", fase >= 3]]
                .map(([t, s, ok], i) => <div key={i} className={ok ? (actual.estado === "rechazada" && i === 2 ? "malo" : "hecho") : ""}><span><Icono n={actual.estado === "rechazada" && i === 2 ? "cerrar" : "check"} size={14} /></span><p><strong>{t}</strong><small>{s}</small></p></div>)}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
