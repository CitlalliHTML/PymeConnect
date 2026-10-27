import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../supabase.js";
import { useAuth } from "../../auth.jsx";
import Icono from "../../components/Icono.jsx";
import MapaPicker from "../../components/MapaPicker.jsx";
import { subir, IMAGENES, BUCKET_FOTOS, limpiar, soloDigitos, telefonoOk } from "../../lib/archivos.js";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const ORDEN = [1, 2, 3, 4, 5, 6, 0];
const hhmm = (t) => (t ? String(t).slice(0, 5) : "");
const horarioBase = () => DIAS.map((_, i) => ({ dia_semana: i, abre: "09:00", cierra: "18:00", cerrado: i === 0 }));

export default function MiNegocio() {
  const { user } = useAuth();
  const d = useOutletContext();
  const n = d.negocio;
  const [f, setF] = useState(null);
  const [cats, setCats] = useState([]);
  const [horas, setHoras] = useState(horarioBase());
  const [msg, setMsg] = useState({ tipo: "", texto: "" });
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState("");

  useEffect(() => { supabase?.from("categorias").select("id,nombre").order("id").then(({ data }) => setCats(data || [])); }, []);

  // Cargar formulario cuando llega el negocio (o se abre por primera vez sin negocio)
  useEffect(() => {
    if (d.cargando) return;
    // Sin negocio todavía: precarga lo que el comerciante escribió al registrarse
    const meta = n ? {} : user?.user_metadata || {};
    setF({
      nombre: n?.nombre || limpiar(meta.negocio), categoria_id: n?.categoria_id ?? (/^\d+$/.test(meta.categoria_id || "") ? Number(meta.categoria_id) : ""), descripcion: n?.descripcion || "", direccion: n?.direccion || limpiar(meta.direccion),
      telefono: n?.telefono || soloDigitos(meta.telefono), whatsapp: n?.whatsapp || "", redes: n?.redes_sociales || "",
      foto_url: n?.foto_url || "", logo_url: n?.logo_url || "", latitud: n?.latitud ?? null, longitud: n?.longitud ?? null,
    });
    if (n?.id) supabase.from("horarios").select("*").eq("comercio_id", n.id).then(({ data }) => {
      if (data?.length) {
        const base = horarioBase();
        data.forEach((h) => { base[h.dia_semana] = { dia_semana: h.dia_semana, abre: hhmm(h.abre) || "09:00", cierra: hhmm(h.cierra) || "18:00", cerrado: !!h.cerrado }; });
        setHoras(base);
      }
    });
  }, [d.cargando, n]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!f) return <p className="muted" role="status">Cargando…</p>;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setH = (i, k, v) => setHoras(horas.map((h) => (h.dia_semana === i ? { ...h, [k]: v } : h)));

  async function archivo(campo, file, etiqueta) {
    if (!file) return;
    setSubiendo(campo); setMsg({ tipo: "", texto: "" });
    const r = await subir(BUCKET_FOTOS, user.id, file, { tipos: IMAGENES, maxMB: 5 });
    setSubiendo("");
    if (r.error) return setMsg({ tipo: "error", texto: `${etiqueta}: ${r.error}` });
    setF((p) => ({ ...p, [campo]: r.url }));
    setMsg({ tipo: "ok", texto: `${etiqueta} lista. Pulsa “Guardar cambios” para publicarla.` });
  }

  function validar() {
    const nombre = limpiar(f.nombre);
    if (nombre.length < 2 || nombre.length > 120) return "El nombre del negocio debe tener entre 2 y 120 caracteres.";
    if (!f.categoria_id) return "Selecciona una categoría.";
    if (limpiar(f.descripcion).length > 600) return "La descripción no puede pasar de 600 caracteres.";
    if (limpiar(f.direccion).length < 5) return "Escribe la dirección (calle, número y colonia).";
    if (!telefonoOk(f.telefono)) return "El teléfono debe tener 10 dígitos.";
    if (f.whatsapp && !telefonoOk(f.whatsapp)) return "El WhatsApp debe tener 10 dígitos.";
    if (limpiar(f.redes).length > 100) return "Las redes sociales no pueden pasar de 100 caracteres.";
    for (const h of horas) if (!h.cerrado && h.abre >= h.cierra) return `${DIAS[h.dia_semana]}: la hora de cierre debe ser después de la apertura.`;
    return "";
  }

  async function guardar(e) {
    e.preventDefault();
    if (guardando) return;
    const problema = validar();
    if (problema) return setMsg({ tipo: "error", texto: problema });
    setGuardando(true); setMsg({ tipo: "", texto: "" });

    // Solo las columnas permitidas (la BD además bloquea verificado y propietario_id)
    const datos = {
      nombre: limpiar(f.nombre), categoria_id: Number(f.categoria_id), descripcion: limpiar(f.descripcion) || null,
      direccion: limpiar(f.direccion), telefono: soloDigitos(f.telefono), whatsapp: soloDigitos(f.whatsapp) || null,
      redes_sociales: limpiar(f.redes) || null, foto_url: f.foto_url || null, logo_url: f.logo_url || null,
      latitud: f.latitud, longitud: f.longitud,
    };
    let id = n?.id, error;
    if (id) ({ error } = await supabase.from("comercios").update(datos).eq("id", id));
    else {
      const r = await supabase.from("comercios").insert({ ...datos, propietario_id: user.id }).select("id").single();
      error = r.error; id = r.data?.id;
    }
    if (!error && id) {
      ({ error } = await supabase.from("horarios").upsert(
        horas.map((h) => ({ comercio_id: id, dia_semana: h.dia_semana, abre: h.cerrado ? null : h.abre, cierra: h.cerrado ? null : h.cierra, cerrado: h.cerrado })),
        { onConflict: "comercio_id,dia_semana" }));
    }
    setGuardando(false);
    if (error) { console.error("[mi negocio]", error); return setMsg({ tipo: "error", texto: "No pudimos guardar los cambios. Intenta de nuevo." }); }
    setMsg({ tipo: "ok", texto: "Cambios guardados." });
    d.recargar();
  }

  return (
    <form onSubmit={guardar} noValidate>
      <div className="pn-cabecera">
        <div>
          <p className="pn-fecha">MI NEGOCIO</p>
          <h1>Información del negocio</h1>
          <p className="muted">Mantén tus datos actualizados para que puedan encontrarte.</p>
        </div>
        <button type="submit" className="pn-btn-oscuro" disabled={guardando || !!subiendo}>{guardando ? "Guardando…" : "Guardar cambios"}</button>
      </div>
      <div aria-live="polite" className="pn-aviso-zona">{msg.texto && <p className={`msg ${msg.tipo}`} role={msg.tipo === "error" ? "alert" : undefined}>{msg.texto}</p>}</div>

      <section className="pn-card pn-form">
        <label className="pn-campo"><span>Nombre del negocio *</span><input className="campo" value={f.nombre} onChange={set("nombre")} maxLength={120} /></label>
        <label className="pn-campo"><span>Categoría *</span>
          <select className="campo" value={f.categoria_id} onChange={set("categoria_id")}>
            <option value="" disabled>Selecciona una categoría</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select></label>
        <label className="pn-campo pn-ancho"><span>Descripción</span>
          <textarea className="campo" rows={4} maxLength={600} value={f.descripcion} onChange={set("descripcion")} placeholder="Cuéntales a tus clientes qué ofreces" />
          <small className="muted">{f.descripcion.length}/600</small></label>
        <label className="pn-campo"><span>Dirección *</span><input className="campo" value={f.direccion} onChange={set("direccion")} maxLength={160} placeholder="Av. Central 124" autoComplete="street-address" /></label>
        <label className="pn-campo"><span>Teléfono *</span><input className="campo" type="tel" inputMode="tel" value={f.telefono} onChange={set("telefono")} maxLength={16} placeholder="55 1234 5678" /></label>
        <label className="pn-campo"><span>WhatsApp</span><input className="campo" type="tel" inputMode="tel" value={f.whatsapp} onChange={set("whatsapp")} maxLength={16} placeholder="55 1234 5678" /></label>
        <label className="pn-campo"><span>Redes sociales</span><input className="campo" value={f.redes} onChange={set("redes")} maxLength={100} placeholder="@panlaespiga" /></label>
      </section>

      <section className="pn-card" aria-labelledby="t-hor">
        <h2 id="t-hor">Horario</h2>
        <ul className="pn-horas">
          {ORDEN.map((i) => { const h = horas[i]; return (
            <li key={i}>
              <strong>{DIAS[i]}</strong>
              <label className="pn-chk"><input type="checkbox" checked={h.cerrado} onChange={(e) => setH(i, "cerrado", e.target.checked)} /> Cerrado</label>
              <input className="campo" type="time" aria-label={`${DIAS[i]} abre`} value={h.abre} disabled={h.cerrado} onChange={(e) => setH(i, "abre", e.target.value)} />
              <span aria-hidden="true">–</span>
              <input className="campo" type="time" aria-label={`${DIAS[i]} cierra`} value={h.cierra} disabled={h.cerrado} onChange={(e) => setH(i, "cierra", e.target.value)} />
            </li>); })}
        </ul>
      </section>

      <section className="pn-card" aria-labelledby="t-img">
        <h2 id="t-img">Imágenes</h2>
        <div className="pn-subidas">
          {[["foto_url", "Subir fotografía", "Fotografía"], ["logo_url", "Subir logotipo (opcional)", "Logotipo"]].map(([campo, titulo, et]) => (
            <label key={campo} className="pn-subida">
              {campo === "logo_url" && <span className="pn-opcional">Opcional</span>}
              {f[campo] ? <img src={f[campo]} alt={`${et} actual`} /> : <Icono n={campo === "foto_url" ? "negocio" : "inicio"} size={28} />}
              <strong>{subiendo === campo ? "Subiendo…" : f[campo] ? `Cambiar ${et.toLowerCase()}` : titulo}</strong>
              <small>JPG o PNG · máximo 5 MB</small>
              <input type="file" className="sr-only" accept="image/jpeg,image/png" onChange={(e) => { archivo(campo, e.target.files?.[0], et); e.target.value = ""; }} />
            </label>
          ))}
        </div>
      </section>

      <section className="pn-card" aria-labelledby="t-ubi">
        <h2 id="t-ubi">Ubicación en el mapa</h2>
        <p className="muted">Arrastra el marcador (o toca el mapa) para ajustar la ubicación exacta.</p>
        <MapaPicker lat={f.latitud} lng={f.longitud} onChange={(la, lo) => setF((p) => ({ ...p, latitud: la, longitud: lo }))} />
        <small className="muted">{f.latitud ? `Coordenadas: ${f.latitud}, ${f.longitud}` : "Aún no has marcado la ubicación."}</small>
      </section>
    </form>
  );
}
