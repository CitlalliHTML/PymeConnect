import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase.js";
import { useFav } from "../favoritos.jsx";

export default function Explorar() {
  const [cats, setCats] = useState([]);
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState("todas");
  const { ids, alternar } = useFav();

  useEffect(() => {
    if (!supabase) { setCargando(false); return; }
    Promise.all([
      supabase.from("categorias").select("id,nombre,slug,icono").order("id"),
      supabase.from("directorio").select("*").order("nombre"),
    ]).then(([c, d]) => {
      if (c.error || d.error) setError("No pudimos cargar los comercios. Intenta de nuevo.");
      setCats(c.data || []);
      setLista(d.data || []);
      setCargando(false);
    });
  }, []);

  const icono = (slug) => cats.find((c) => c.slug === slug)?.icono || "📍";

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lista.filter((n) => {
      if (cat === "favoritos" && !ids.includes(n.id)) return false;
      if (cat !== "todas" && cat !== "favoritos" && n.categoria_slug !== cat) return false;
      return !q || `${n.nombre} ${n.descripcion || ""} ${n.categoria}`.toLowerCase().includes(q);
    });
  }, [lista, busca, cat, ids]);

  return (
    <>
      <p className="etiqueta">DIRECTORIO LOCAL</p>
      <h1>Explorar comercios</h1>

      <section className="panel" aria-label="Buscar comercios">
        <input
          type="search" className="campo" value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="¿Qué estás buscando? Ej. pan, café" aria-label="Buscar comercios"
        />
        <div className="chips" role="group" aria-label="Categorías">
          {[{ slug: "todas", nombre: "Todas" }, ...cats.map((c) => ({ ...c, nombre: `${c.icono} ${c.nombre}` })),
            { slug: "favoritos", nombre: "♥ Favoritos" }].map((c) => (
            <button key={c.slug} className={`chip ${cat === c.slug ? "activo" : ""}`}
              onClick={() => setCat(c.slug)} aria-pressed={cat === c.slug}>
              {c.nombre}
            </button>
          ))}
        </div>
        {cat === "favoritos" && <small className="nota">Tus favoritos se guardan en este dispositivo.</small>}
      </section>

      <p className="conteo" aria-live="polite">
        {cargando ? "Cargando…" : `${filtrados.length} comercios encontrados`}
      </p>
      {error && <div className="aviso" role="alert">{error}</div>}

      <ul className="rejilla">
        {filtrados.map((n) => (
          <li key={n.id} className="tarjeta">
            <Link to={`/comercio/${n.id}`} className="tarjeta-enlace">
              <div className="foto">
                {n.foto_url ? <img src={n.foto_url} alt={`Fachada de ${n.nombre}`} loading="lazy" />
                            : <span aria-hidden="true">{icono(n.categoria_slug)}</span>}
              </div>
              <div className="tarjeta-cuerpo">
                <h2>{n.nombre}</h2>
                <p className="muted">{n.categoria}{n.verificado && " · ✔ Verificado"}</p>
                <span className={`estado ${n.abierto_ahora ? "abierto" : "cerrado"}`}>
                  {n.abierto_ahora ? "Abierto ahora" : "Cerrado"}
                </span>
              </div>
            </Link>
            <button className="corazon" onClick={() => alternar(n.id)}
              aria-pressed={ids.includes(n.id)} aria-label={`Guardar ${n.nombre} en favoritos`}>
              {ids.includes(n.id) ? "♥" : "♡"}
            </button>
          </li>
        ))}
      </ul>
      {!cargando && !filtrados.length && !error && <p className="muted">No encontramos comercios con esa búsqueda.</p>}
    </>
  );
}
