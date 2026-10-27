import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import Sello from "./Sello.jsx";
import Icono from "./Icono.jsx";
import { useAuth } from "../auth.jsx";
import "../pages/panel/panel.css";

// Estructura común de los paneles (comerciante y administrador): menú lateral + barra superior.
export default function Workspace({ nav, cuentaEtiqueta, cuentaNombre, barra, ayudaTo, contexto }) {
  const { salir } = useAuth();
  const go = useNavigate();
  const loc = useLocation();
  const [abierto, setAbierto] = useState(false);
  const titulo = nav.find(([to]) => to === loc.pathname)?.[2];
  useEffect(() => setAbierto(false), [loc.pathname]);
  const cerrarSesion = async () => { await salir(); go("/login", { replace: true }); };

  return (
    <div className="pn-app">
      <aside className={`pn-lado ${abierto ? "abierto" : ""}`} aria-label="Menú del panel">
        <div className="pn-marca">
          <Sello className="pn-sello" />
          <span><strong>PYMECONNECT</strong><small>TUS NEGOCIOS MÁS CERCA</small></span>
        </div>
        <div className="pn-cuenta"><small>{cuentaEtiqueta}</small><strong>{cuentaNombre}</strong></div>
        <nav>
          <ul>
            {nav.map(([to, ico, txt, end]) => (
              <li key={to}><NavLink to={to} end={end} className="pn-item"><Icono n={ico} /> <span>{txt}</span></NavLink></li>
            ))}
            <li><button className="pn-item" onClick={cerrarSesion}><Icono n="salir" /> <span>Cerrar sesión</span></button></li>
          </ul>
        </nav>
      </aside>
      {abierto && <div className="pn-velo" onClick={() => setAbierto(false)} aria-hidden="true" />}

      <div className="pn-cuerpo">
        <header className="pn-barra">
          <button className="pn-hamb" onClick={() => setAbierto(!abierto)} aria-expanded={abierto} aria-label="Abrir menú">
            <Icono n={abierto ? "cerrar" : "menu"} size={22} />
          </button>
          <span className="pn-barra-titulo">{barra}{titulo && titulo !== "Inicio" && titulo !== "Resumen" ? ` · ${titulo}` : ""}</span>
          {ayudaTo && <NavLink to={ayudaTo} className="btn btn-borde pn-ayuda"><Icono n="ayuda" /> Ayuda</NavLink>}
        </header>
        <main className="pn-main"><Outlet context={contexto} /></main>
      </div>
    </div>
  );
}
