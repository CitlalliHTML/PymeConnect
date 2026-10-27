import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../../supabase.js";
import { useAuth } from "../../auth.jsx";
import { subir, IMAGENES, BUCKET_FOTOS, limpiar } from "../../lib/archivos.js";

const VACIO = { id: null, nombre: "", tipo: "producto", precio: "", descripcion: "", imagen_url: "" };
const dinero = (v) => (v === null || v === undefined || v === "" ? "—" : `$${Number(v).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`);

export default function Catalogo() {
  const { user } = useAuth();
  const d = useOutletContext();
  const n = d.negocio;
  const [lista, setLista] = useState(null);
  const [form, setForm] = useState(null);       // null = cerrado
  const [msg, setMsg] = useState({ tipo: "", texto: "" });
  const [ocupado, setOcupado] = useState(false);
  const [borrar, setBorrar] = useState(null);   // id pendiente de confirmar

  const cargar = useCallback(async () => {
    if (!n?.id) return setLista([]);
    const { data, error } = await supabase.from("productos").select("*").eq("comercio_id", n.id).order("created_at", { ascending: false });
    if (error) setMsg({ tipo: "error", texto: "No pudimos cargar tu catálogo." });
    setLista(data || []);
  }, [n?.id]);
  useEffect(() => { cargar(); }, [cargar]);

  const aviso = (tipo, texto) => setMsg({ tipo, texto });
  const refrescar = async () => { await cargar(); d.recargar(); };

  async function guardar(e) {
    e.preventDefault();
    if (ocupado) return;
    const nombre = limpiar(form.nombre), desc = limpiar(form.descripcion);
    const precio = form.precio === "" ? null : Number(form.precio);
    if (nombre.length < 2 || nombre.length > 120) return aviso("error", "El nombre debe tener entre 2 y 120 caracteres.");
    if (desc.length > 600) return aviso("error", "La descripción no puede pasar de 600 caracteres.");
    if (precio !== null && (!Number.isFinite(precio) || precio < 0 || precio > 999999.99)) return aviso("error", "Escribe un precio válido.");
    setOcupado(true);
    const datos = { nombre, tipo: form.tipo === "servicio" ? "servicio" : "producto", precio, descripcion: desc || null, imagen_url: form.imagen_url || null };
    const { error } = form.id
      ? await supabase.from("productos").update(datos).eq("id", form.id)
      : await supabase.from("productos").insert({ ...datos, comercio_id: n.id, activo: true });
    setOcupado(false);
    if (error) { console.error("[catalogo]", error); return aviso("error", "No pudimos guardar. Intenta de nuevo."); }
    aviso("ok", form.id ? "Cambios guardados." : "Agregado al catálogo.");
    setForm(null); refrescar();
  }

  async function foto(file) {
    if (!file) return;
    setOcupado(true);
    const r = await subir(BUCKET_FOTOS, user.id, file, { tipos: IMAGENES, maxMB: 5 });
    setOcupado(false);
    if (r.error) return aviso("error", r.error);
    setForm((p) => ({ ...p, imagen_url: r.url }));
  }

  async function alternar(p) {
    const { error } = await supabase.from("productos").update({ activo: !p.activo }).eq("id", p.id);
    if (error) return aviso("error", "No pudimos cambiar el estado.");
    refrescar();
  }
  async function eliminar(id) {
    const { error } = await supabase.from("productos").delete().eq("id", id);
    setBorrar(null);
    if (error) return aviso("error", "No pudimos eliminarlo.");
    aviso("ok", "Eliminado."); refrescar();
  }

  const sinNegocio = !d.cargando && !n;

  return (
    <>
      <div className="pn-cabecera">
        <div>
          <p className="pn-fecha">CATÁLOGO</p>
          <h1>Productos y servicios</h1>
          <p className="muted">Agrega y actualiza lo que ofreces.</p>
        </div>
        <button className="pn-btn-oscuro" disabled={sinNegocio} onClick={() => { setMsg({ tipo: "", texto: "" }); setForm({ ...VACIO }); }}>＋ Agregar producto</button>
      </div>
      <div aria-live="polite" className="pn-aviso-zona">{msg.texto && <p className={`msg ${msg.tipo}`} role={msg.tipo === "error" ? "alert" : undefined}>{msg.texto}</p>}</div>

      {sinNegocio && <div className="aviso">Primero completa los datos de <Link to="/panel/negocio"><strong>Mi negocio</strong></Link> para poder publicar productos.</div>}

      {form && (
        <form className="pn-card pn-form" onSubmit={guardar} noValidate aria-label={form.id ? "Editar producto" : "Nuevo producto"}>
          <h2 className="pn-ancho">{form.id ? "Editar" : "Nuevo"} {form.tipo}</h2>
          <label className="pn-campo"><span>Nombre *</span><input className="campo" value={form.nombre} maxLength={120} onChange={(e) => setForm({ ...form, nombre: e.target.value })} autoFocus /></label>
          <label className="pn-campo"><span>Tipo</span>
            <select className="campo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}><option value="producto">Producto</option><option value="servicio">Servicio</option></select></label>
          <label className="pn-campo"><span>Precio (MXN)</span><input className="campo" type="number" inputMode="decimal" min="0" max="999999.99" step="0.01" value={form.precio} placeholder="Opcional" onChange={(e) => setForm({ ...form, precio: e.target.value })} /></label>
          <label className="pn-campo"><span>Fotografía</span><input className="campo" type="file" accept="image/jpeg,image/png" onChange={(e) => { foto(e.target.files?.[0]); e.target.value = ""; }} />
            {form.imagen_url && <img className="pn-mini" src={form.imagen_url} alt="Vista previa" />}</label>
          <label className="pn-campo pn-ancho"><span>Descripción</span><textarea className="campo" rows={3} maxLength={600} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></label>
          <div className="pn-ancho pn-botones">
            <button type="submit" className="pn-btn-oscuro" disabled={ocupado}>{ocupado ? "Guardando…" : "Guardar"}</button>
            <button type="button" className="btn btn-borde" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      <section className="pn-card pn-tabla-caja">
        {lista === null ? <p className="muted" role="status">Cargando…</p> : lista.length === 0 ? (
          <div className="pn-vacio-int"><p><strong>Aún no tienes productos ni servicios.</strong></p><p className="muted">Agrega el primero para que aparezca en tu perfil.</p></div>
        ) : (
          <table className="pn-tabla">
            <thead><tr><th>Producto</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id}>
                  <td><div className="pn-prod">
                    <div className="pn-prod-foto">{p.imagen_url ? <img src={p.imagen_url} alt="" /> : <span aria-hidden="true">{p.tipo === "servicio" ? "🛠" : "📦"}</span>}</div>
                    <div><strong>{p.nombre}</strong><p className="muted">{p.descripcion || (p.tipo === "servicio" ? "Servicio" : "Producto")}</p></div>
                  </div></td>
                  <td>{dinero(p.precio)}</td>
                  <td><span className={`pn-estado ${p.activo ? "" : "pausado"}`}>{p.activo ? "Activo" : "Pausado"}</span></td>
                  <td><div className="pn-acciones">
                    <button className="pn-link" onClick={() => { setMsg({ tipo: "", texto: "" }); setForm({ id: p.id, nombre: p.nombre, tipo: p.tipo, precio: p.precio ?? "", descripcion: p.descripcion || "", imagen_url: p.imagen_url || "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button>
                    <button className="pn-link" onClick={() => alternar(p)}>{p.activo ? "Pausar" : "Activar"}</button>
                    {borrar === p.id ? (
                      <><button className="pn-link peligro" onClick={() => eliminar(p.id)}>Sí, eliminar</button><button className="pn-link" onClick={() => setBorrar(null)}>No</button></>
                    ) : <button className="pn-link peligro" onClick={() => setBorrar(p.id)}>Eliminar</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
