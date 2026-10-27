import { useEffect, useState } from "react";
import { supabase } from "../../supabase.js";
import Icono from "../../components/Icono.jsx";
import { celdaCsv, hace, nombreCompleto, MOTIVOS } from "../../lib/etiquetas.js";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const cuenta = (q) => q.then((r) => (r.error ? null : r.count ?? 0));
const num = (v) => (v === null || v === undefined ? "—" : v.toLocaleString("es-MX"));

function Tarjeta({ titulo, valor, nota, icono }) {
  return (
    <article className="pn-stat">
      <div className="pn-stat-ico"><Icono n={icono} /></div>
      <h2>{titulo}</h2><p className="pn-stat-num">{num(valor)}</p><small>{nota || " "}</small>
    </article>
  );
}

export default function Resumen() {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    (async () => {
      const head = { count: "exact", head: true };
      const desde = new Date(); desde.setMonth(desde.getMonth() - 11); desde.setDate(1); desde.setHours(0, 0, 0, 0);
      const [usuarios, comercios, verificados, solicitudes, reportes, serie, ultC, ultU, ultR, ultV] = await Promise.all([
        cuenta(supabase.from("perfiles").select("*", head)),
        cuenta(supabase.from("comercios").select("*", head)),
        cuenta(supabase.from("comercios").select("*", head).eq("verificado", true)),
        cuenta(supabase.from("verificaciones").select("*", head).in("estado", ["pendiente", "en_revision", "info_adicional"])),
        cuenta(supabase.from("reportes").select("*", head).neq("estado", "resuelto")),
        supabase.from("comercios").select("created_at").gte("created_at", desde.toISOString()),
        supabase.from("comercios").select("nombre,verificado,created_at").order("created_at", { ascending: false }).limit(4),
        supabase.from("perfiles").select("nombre,apellidos,created_at").order("created_at", { ascending: false }).limit(4),
        supabase.from("reportes").select("motivo,created_at,comercios(nombre)").order("created_at", { ascending: false }).limit(4),
        supabase.from("verificaciones").select("estado,created_at,comercios(nombre)").order("created_at", { ascending: false }).limit(4),
      ]);
      if (!vivo) return;
      if ([usuarios, comercios].some((v) => v === null)) setError("No pudimos cargar algunos datos. Verifica que tu cuenta sea de administrador.");

      // Comercios registrados por mes (últimos 12)
      const meses = Array.from({ length: 12 }, (_, i) => { const m = new Date(desde); m.setMonth(desde.getMonth() + i); return { m: m.getMonth(), a: m.getFullYear(), n: 0 }; });
      (serie.data || []).forEach((r) => { const f = new Date(r.created_at); const k = meses.find((x) => x.m === f.getMonth() && x.a === f.getFullYear()); if (k) k.n++; });

      const act = [
        ...(ultC.data || []).map((r) => ({ t: r.created_at, ico: "negocio", tono: "soft", tit: "Nuevo comercio", sub: r.nombre })),
        ...(ultU.data || []).map((r) => ({ t: r.created_at, ico: "usuario", tono: "soft", tit: "Nuevo usuario", sub: nombreCompleto(r) })),
        ...(ultR.data || []).map((r) => ({ t: r.created_at, ico: "reporte", tono: "rojo", tit: "Nuevo reporte", sub: `${r.comercios?.nombre || "Comercio"} · ${MOTIVOS[r.motivo] || ""}` })),
        ...(ultV.data || []).map((r) => ({ t: r.created_at, ico: "check", tono: "lima", tit: r.estado === "aprobada" ? "Comercio verificado" : "Solicitud de verificación", sub: r.comercios?.nombre || "Comercio" })),
      ].sort((a, b) => new Date(b.t) - new Date(a.t)).slice(0, 5);

      setD({ usuarios, comercios, verificados, solicitudes, reportes, meses, act });
    })();
    return () => { vivo = false; };
  }, []);

  function descargar() {
    const filas = [["Indicador", "Valor"], ["Usuarios", d.usuarios], ["Comercios", d.comercios], ["Verificados", d.verificados], ["Solicitudes pendientes", d.solicitudes], ["Reportes abiertos", d.reportes],
      ...d.meses.map((x) => [`Comercios registrados ${MESES[x.m]} ${x.a}`, x.n])];
    const csv = "﻿" + filas.map((f) => f.map(celdaCsv).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `resumen-pymeconnect-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  const max = Math.max(1, ...(d?.meses || []).map((x) => x.n));
  return (
    <>
      <div className="pn-cabecera">
        <div>
          <p className="pn-fecha">VISTA GENERAL</p>
          <h1>Panel administrativo</h1>
          <p className="muted">Actividad y tareas pendientes de la plataforma.</p>
        </div>
        <button className="btn btn-borde" onClick={descargar} disabled={!d}><Icono n="descarga" /> Descargar reporte</button>
      </div>
      {error && <div className="aviso" role="alert">{error}</div>}

      <section className="pn-stats pn-stats-5" aria-label="Métricas">
        <Tarjeta titulo="Usuarios" valor={d?.usuarios} icono="usuario" />
        <Tarjeta titulo="Comercios" valor={d?.comercios} icono="negocio" />
        <Tarjeta titulo="Verificados" valor={d?.verificados} icono="check" />
        <Tarjeta titulo="Solicitudes" valor={d?.solicitudes} icono="reporte" nota="Pendientes de revisar" />
        <Tarjeta titulo="Reportes" valor={d?.reportes} icono="reporte" nota="Sin resolver" />
      </section>

      <div className="pn-dos">
        <section className="pn-card" aria-labelledby="t-act">
          <h2 id="t-act">Comercios registrados por mes</h2>
          {!d ? <p className="muted" role="status">Cargando…</p> : (
            <figure className="pn-grafica" role="img" aria-label={`Comercios registrados por mes: ${d.meses.map((x) => `${MESES[x.m]} ${x.n}`).join(", ")}`}>
              <div className="pn-barras">{d.meses.map((x, i) => <span key={i} title={`${MESES[x.m]} ${x.a}: ${x.n}`} style={{ height: `${Math.max(4, (x.n / max) * 100)}%` }} />)}</div>
              <div className="pn-ejes">{d.meses.map((x, i) => <span key={i}>{i % 2 === 0 ? MESES[x.m] : ""}</span>)}</div>
            </figure>
          )}
        </section>
        <section className="pn-card" aria-labelledby="t-rec">
          <h2 id="t-rec">Actividad reciente</h2>
          {!d ? <p className="muted">Cargando…</p> : d.act.length === 0 ? <p className="muted">Todavía no hay actividad.</p> : (
            <ul className="pn-actividad">
              {d.act.map((a, i) => (
                <li key={i}><span className={`pn-act-ico ${a.tono}`}><Icono n={a.ico} size={16} /></span><div><strong>{a.tit}</strong><small>{a.sub} · {hace(a.t)}</small></div></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
