import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase.js";
import { useAuth } from "../../auth.jsx";
import Icono from "../../components/Icono.jsx";
import { registrarLog } from "../../lib/admin.js";
import { ESTADO_CUENTA, ROL, fecha, nombreCompleto, tono } from "../../lib/etiquetas.js";

export default function Usuarios() {
  const { user } = useAuth();
  const [filas, setFilas] = useState(null);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("todos");
  const [abierto, setAbierto] = useState(null);
  const [confirmar, setConfirmar] = useState(null);
  const [aviso, setAviso] = useState({ tipo: "", texto: "" });

  const cargar = async () => {
    const { data, error } = await supabase.from("perfiles").select("id,nombre,apellidos,telefono,rol,estado,nivel_acceso,created_at").order("created_at", { ascending: false });
    if (error) setAviso({ tipo: "error", texto: "No pudimos cargar los usuarios." });
    setFilas(data || []);
  };
  useEffect(() => { cargar(); }, []);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (filas || []).filter((u) => (estado === "todos" || u.estado === estado) && (!t || `${nombreCompleto(u)} ${u.telefono || ""}`.toLowerCase().includes(t)));
  }, [filas, q, estado]);

  async function cambiar(u, nuevo) {
    setConfirmar(null);
    if (u.id === user.id) return setAviso({ tipo: "error", texto: "No puedes cambiar el estado de tu propia cuenta." });
    if (u.rol === "admin") return setAviso({ tipo: "error", texto: "Las cuentas de administrador no se suspenden desde aquí." });
    const { error } = await supabase.from("perfiles").update({ estado: nuevo }).eq("id", u.id);
    if (error) { console.error(error); return setAviso({ tipo: "error", texto: "No pudimos actualizar la cuenta." }); }
    await registrarLog(user.id, nuevo === "suspendido" ? "suspender_usuario" : "reactivar_usuario", "perfiles", u.id, { nombre: nombreCompleto(u) });
    setAviso({ tipo: "ok", texto: nuevo === "suspendido" ? "Cuenta suspendida." : "Cuenta reactivada." });
    cargar();
  }

  return (
    <>
      <div className="pn-cabecera"><div>
        <p className="pn-fecha">ADMINISTRACIÓN</p><h1>Gestión de usuarios</h1>
        <p className="muted">{filas ? `${lista.length} de ${filas.length} registros en esta vista.` : "Cargando…"}</p>
      </div></div>
      <div aria-live="polite" className="pn-aviso-zona">{aviso.texto && <p className={`msg ${aviso.tipo}`} role={aviso.tipo === "error" ? "alert" : undefined}>{aviso.texto}</p>}</div>

      <section className="pn-card">
        <div className="pn-filtros">
          <label className="pn-buscar"><Icono n="busca" /><input type="search" placeholder="Buscar por nombre o teléfono" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar usuarios" maxLength={80} /></label>
          <select className="campo" value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado">
            <option value="todos">Todos los estados</option><option value="activo">Activo</option><option value="suspendido">Suspendido</option>
          </select>
        </div>
        <div className="pn-tabla-caja">
          <table className="pn-tabla">
            <thead><tr><th>Nombre</th><th>Teléfono</th><th>Tipo</th><th>Estado</th><th>Registro</th><th>Acciones</th></tr></thead>
            <tbody>
              {(filas === null) && <tr><td colSpan={6} className="muted">Cargando…</td></tr>}
              {filas && lista.length === 0 && <tr><td colSpan={6} className="muted">No hay usuarios con ese filtro.</td></tr>}
              {lista.map((u) => (
                <FilaUsuario key={u.id} u={u} yo={u.id === user.id} abierto={abierto === u.id} confirmar={confirmar === u.id}
                  onVer={() => setAbierto(abierto === u.id ? null : u.id)} onPedir={() => setConfirmar(u.id)} onNo={() => setConfirmar(null)} onCambiar={(n) => cambiar(u, n)} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function FilaUsuario({ u, yo, abierto, confirmar, onVer, onPedir, onNo, onCambiar }) {
  const protegido = yo || u.rol === "admin";
  return (
    <>
      <tr>
        <td><strong>{nombreCompleto(u)}</strong>{yo && <small className="muted"> (tú)</small>}</td>
        <td>{u.telefono || "—"}</td><td>{ROL[u.rol]}</td>
        <td><span className={`pn-estado ${tono(u.estado)}`}>{ESTADO_CUENTA[u.estado]}</span></td>
        <td>{fecha(u.created_at)}</td>
        <td><div className="pn-acciones">
          <button className="pn-link" onClick={onVer} aria-expanded={abierto}>{abierto ? "Ocultar" : "Ver"}</button>
          {!protegido && (u.estado === "activo"
            ? (confirmar ? <><button className="pn-link peligro" onClick={() => onCambiar("suspendido")}>Sí, suspender</button><button className="pn-link" onClick={onNo}>No</button></> : <button className="pn-link peligro" onClick={onPedir}>Suspender</button>)
            : <button className="pn-link" onClick={() => onCambiar("activo")}>Reactivar</button>)}
        </div></td>
      </tr>
      {abierto && (
        <tr className="pn-detalle"><td colSpan={6}>
          <dl className="pn-datos">
            <div><dt>Nombre completo</dt><dd>{nombreCompleto(u)}</dd></div>
            <div><dt>Teléfono</dt><dd>{u.telefono || "—"}</dd></div>
            <div><dt>Tipo de cuenta</dt><dd>{ROL[u.rol]}{u.nivel_acceso ? ` · acceso ${u.nivel_acceso}` : ""}</dd></div>
            <div><dt>Registro</dt><dd>{fecha(u.created_at)}</dd></div>
          </dl>
        </td></tr>
      )}
    </>
  );
}
