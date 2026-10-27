import { Link, useOutletContext } from "react-router-dom";
import Icono from "../../components/Icono.jsx";
import { useAuth } from "../../auth.jsx";
import { porcentajePerfil } from "../../useMiNegocio.js";

const saludo = () => { const h = new Date().getHours(); return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches"; };
const fecha = () => new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }).replace(",", "").toUpperCase();
const num = (v) => (v === null || v === undefined ? "—" : v);

function Tarjeta({ titulo, valor, nota, icono }) {
  return (
    <article className="pn-stat">
      <div className="pn-stat-ico"><Icono n={icono} /></div>
      <h2>{titulo}</h2>
      <p className="pn-stat-num">{num(valor)}</p>
      <small>{nota || " "}</small>
    </article>
  );
}

export default function Inicio() {
  const { user, perfil } = useAuth();
  const d = useOutletContext();
  const n = d.negocio;
  // Nombre mostrado: el que guardó al registrarse (user_metadata es solo texto de presentación, no se usa para permisos)
  const nombre = (perfil?.nombre || user?.user_metadata?.nombre || user?.email?.split("@")[0] || "").split(" ")[0];
  const pct = porcentajePerfil(n);

  return (
    <>
      <div className="pn-cabecera">
        <div>
          <p className="pn-fecha">{fecha()}</p>
          <h1>{saludo()}{nombre ? `, ${nombre}` : ""}</h1>
          <p className="muted">Este es el resumen de tu negocio.</p>
        </div>
        <Link to="/panel/negocio" className="pn-btn-oscuro">Editar mi negocio</Link>
      </div>

      {d.error && <div className="aviso" role="alert">{d.error}</div>}

      <section className="pn-stats" aria-label="Métricas">
        <Tarjeta titulo="Productos" valor={d.productos} icono="capas" nota={d.nuevosMes ? `+${d.nuevosMes} este mes` : ""} />
        <Tarjeta titulo="Servicios" valor={d.servicios} icono="inicio" />
        <Tarjeta titulo="Favoritos" valor={d.favoritos} icono="corazon" nota={d.favSemana ? `+${d.favSemana} esta semana` : ""} />
        <Tarjeta titulo="Reportes pendientes" valor={d.reportes} icono="reporte" />
      </section>

      <div className="pn-dos">
        <section className="pn-card" aria-labelledby="t-res">
          <div className="pn-card-cab">
            <h2 id="t-res">Resumen del negocio</h2>
            {n?.verificado
              ? <span className="pn-sello-ok"><Icono n="check" size={14} /> Negocio verificado</span>
              : n && <span className="pn-sello-no">Verificación pendiente</span>}
          </div>

          {d.cargando ? <p className="muted" role="status">Cargando…</p> : !n ? (
            <div className="pn-vacio-int">
              <p><strong>Aún no has registrado tu negocio.</strong></p>
              <p className="muted">Completa tu perfil comercial para aparecer en el directorio.</p>
              <Link to="/panel/negocio" className="btn btn-primario">Registrar mi negocio</Link>
            </div>
          ) : (
            <div className="pn-resumen">
              <div className="pn-foto">{n.foto_url ? <img src={n.foto_url} alt={`Foto de ${n.nombre}`} /> : <span aria-hidden="true">🏪</span>}</div>
              <div>
                <h3>{n.nombre}</h3>
                <p className="muted">{pct === 100 ? "Tu perfil está completo y visible para todos." : "Completa tu perfil para atraer más clientes."}</p>
                <div className="pn-barra-prog" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Perfil completado">
                  <span style={{ width: `${pct}%` }} />
                </div>
                <small className="pn-pct">Perfil completado al {pct}%</small>
              </div>
            </div>
          )}
        </section>

        <section className="pn-card" aria-labelledby="t-acc">
          <h2 id="t-acc">Accesos rápidos</h2>
          <div className="pn-accesos">
            <Link to="/panel/productos" className="pn-acceso"><Icono n="capas" /> Agregar producto</Link>
            <Link to="/panel/negocio" className="pn-acceso"><Icono n="negocio" /> Actualizar horario</Link>
            <Link to="/panel/verificacion" className="pn-acceso"><Icono n="check" /> Ver verificación</Link>
          </div>
        </section>
      </div>
    </>
  );
}
