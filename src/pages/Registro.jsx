import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase, configurado, recordarSesion } from "../supabase.js";
import Sello from "../components/Sello.jsx";
import { limpiar, telefonoOk, soloDigitos } from "../lib/archivos.js";
import "./login.css";

const EMAIL_OK = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const CATS_RESPALDO = [];

export default function Registro() {
  const nav = useNavigate();
  const [cats, setCats] = useState(CATS_RESPALDO);
  const [f, setF] = useState({ nombre: "", negocio: "", correo: "", telefono: "", categoria: "", direccion: "", clave: "", clave2: "", acepto: false });
  const [ver, setVer] = useState(false);
  const [errores, setErrores] = useState({});
  const [msg, setMsg] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);
  const trampa = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  useEffect(() => {
    if (!supabase) return;
    supabase.from("categorias").select("id,nombre").order("id").then(({ data }) => setCats(data || []));
  }, []);

  function validar() {
    const e = {};
    const nombre = limpiar(f.nombre), negocio = limpiar(f.negocio), dir = limpiar(f.direccion);
    if (nombre.length < 3 || nombre.length > 80) e.nombre = "Escribe tu nombre completo (3 a 80 caracteres).";
    if (negocio.length < 2 || negocio.length > 80) e.negocio = "Escribe el nombre de tu negocio (2 a 80 caracteres).";
    if (!EMAIL_OK.test(f.correo.trim()) || f.correo.length > 254) e.correo = "Escribe un correo electrónico válido.";
    if (!telefonoOk(f.telefono)) e.telefono = "Escribe un teléfono de 10 dígitos.";
    if (!f.categoria) e.categoria = "Selecciona una categoría.";
    if (dir.length < 5 || dir.length > 160) e.direccion = "Escribe calle, número y colonia.";
    if (f.clave.length < 8 || f.clave.length > 128 || !/[A-Za-z]/.test(f.clave) || !/\d/.test(f.clave)) e.clave = "Mínimo 8 caracteres, con letras y números.";
    if (f.clave2 !== f.clave) e.clave2 = "Las contraseñas no coinciden.";
    if (!f.acepto) e.acepto = "Debes aceptar el aviso de privacidad y los términos.";
    return e;
  }

  async function enviar(ev) {
    ev.preventDefault();
    if (enviando || trampa.current?.value) return;      // honeypot
    if (!supabase) return setMsg("Falta conectar Supabase (.env).");
    const e = validar(); setErrores(e); setMsg("");
    if (Object.keys(e).length) return;

    setEnviando(true);
    recordarSesion(false);
    const { data, error } = await supabase.auth.signUp({
      email: f.correo.trim().toLowerCase(),
      password: f.clave,
      options: {
        emailRedirectTo: `${window.location.origin}/#/login`,
        // Solo datos de presentación. El ROL lo asigna el servidor (trigger), nunca el navegador.
        data: { nombre: limpiar(f.nombre), negocio: limpiar(f.negocio), telefono: soloDigitos(f.telefono), direccion: limpiar(f.direccion), categoria_id: f.categoria },
      },
    });
    setEnviando(false);
    if (error) {
      const c = error.code || "";
      setMsg(c === "weak_password" ? "Esa contraseña es muy fácil de adivinar. Elige otra."
        : c.includes("rate_limit") || error.status === 429 ? "Demasiados intentos. Espera unos minutos."
        : c === "signup_disabled" ? "El registro está desactivado por ahora."
        : "No pudimos crear tu cuenta. Revisa los datos e intenta de nuevo.");
      if (!["weak_password"].includes(c)) console.error("[registro]", error);
      return;
    }
    // Con confirmación de correo activa NO hay sesión todavía; sin ella, entra directo al panel.
    // Respuesta igual si el correo ya existía (Supabase lo oculta) → no se revela qué correos están registrados.
    if (data.session) nav("/panel", { replace: true }); else setListo(true);
  }

  const Err = ({ k }) => (errores[k] ? <small className="lg-err" role="alert">{errores[k]}</small> : null);
  const inv = (k) => (errores[k] ? true : undefined);

  return (
    <div className="lg-pagina">
      <aside className="lg-lado">
        <span className="lg-insignia"><span aria-hidden="true">🏪</span> Acceso para comerciante</span>
        <h1 className="lg-titulo">Haz crecer tu negocio dentro de tu comunidad.</h1>
        <p className="lg-texto">Actualiza tu perfil, publica productos y responde a tus clientes desde un solo lugar.</p>
        <ul className="lg-puntos">
          {["Perfil comercial completo", "Catálogo de productos y servicios", "Proceso de verificación"].map((p) => <li key={p}><span aria-hidden="true">✓</span> {p}</li>)}
        </ul>
        <Link to="/" className="lg-regresar"><span aria-hidden="true">←</span> Regresar</Link>
      </aside>

      <main className="lg-form-zona">
        <div className="lg-caja ancha">
          <Sello />
          <hr className="lg-linea" />
          <Link to="/" className="lg-volver">← Volver al directorio</Link>

          {listo ? (
            <section className="lg-exito" role="status">
              <span aria-hidden="true">✓</span>
              <h1>Revisa tu correo</h1>
              <p>Te enviamos un enlace para confirmar tu cuenta. Después podrás iniciar sesión y completar tu perfil.</p>
              <Link to="/login" className="lg-enviar lg-enlace-btn">Ir a iniciar sesión</Link>
            </section>
          ) : (
            <>
              <p className="lg-eyebrow">CREAR CUENTA · COMERCIANTE</p>
              <h1 className="lg-h2">Registro de comerciante</h1>
              <p className="lg-sub">Completa todos los campos obligatorios marcados con un asterisco.</p>
              {!configurado && <div className="aviso" role="alert">Falta conectar Supabase (.env).</div>}

              <form onSubmit={enviar} noValidate>
                <div className="lg-grid">
                  <label className="lg-campo"><span>Nombre completo *</span>
                    <input className="campo" autoComplete="name" placeholder="Nombre de la persona responsable" value={f.nombre} onChange={set("nombre")} maxLength={80} aria-invalid={inv("nombre")} /><Err k="nombre" /></label>
                  <label className="lg-campo"><span>Nombre del negocio *</span>
                    <input className="campo" placeholder="Ej. Panadería La Espiga" value={f.negocio} onChange={set("negocio")} maxLength={80} aria-invalid={inv("negocio")} /><Err k="negocio" /></label>
                  <label className="lg-campo"><span>Correo electrónico *</span>
                    <input className="campo" type="email" autoComplete="email" inputMode="email" placeholder="tu@negocio.com" value={f.correo} onChange={set("correo")} maxLength={254} aria-invalid={inv("correo")} /><Err k="correo" /></label>
                  <label className="lg-campo"><span>Teléfono *</span>
                    <input className="campo" type="tel" autoComplete="tel-national" inputMode="tel" placeholder="55 1234 5678" value={f.telefono} onChange={set("telefono")} maxLength={16} aria-invalid={inv("telefono")} /><Err k="telefono" /></label>
                  <label className="lg-campo"><span>Categoría del negocio *</span>
                    <select className="campo" value={f.categoria} onChange={set("categoria")} aria-invalid={inv("categoria")}>
                      <option value="" disabled>Selecciona una categoría</option>
                      {cats.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select><Err k="categoria" /></label>
                  <label className="lg-campo"><span>Dirección del negocio *</span>
                    <input className="campo" autoComplete="street-address" placeholder="Calle, número y colonia" value={f.direccion} onChange={set("direccion")} maxLength={160} aria-invalid={inv("direccion")} /><Err k="direccion" /></label>
                  <label className="lg-campo"><span>Contraseña *</span>
                    <span className="lg-clave">
                      <input className="campo" type={ver ? "text" : "password"} autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={f.clave} onChange={set("clave")} maxLength={128} aria-invalid={inv("clave")} />
                      <button type="button" className="lg-mostrar" aria-pressed={ver} onClick={() => setVer(!ver)}>{ver ? "Ocultar" : "Mostrar"}</button>
                    </span><Err k="clave" /></label>
                  <label className="lg-campo"><span>Confirmar contraseña *</span>
                    <input className="campo" type={ver ? "text" : "password"} autoComplete="new-password" placeholder="Repite tu contraseña" value={f.clave2} onChange={set("clave2")} maxLength={128} aria-invalid={inv("clave2")} /><Err k="clave2" /></label>
                </div>

                <input ref={trampa} className="trampa" type="text" name="sitio_web" tabIndex={-1} autoComplete="off" aria-hidden="true" />

                <label className="lg-check lg-acepto">
                  <input type="checkbox" checked={f.acepto} onChange={set("acepto")} aria-invalid={inv("acepto")} />
                  Acepto el aviso de privacidad y los términos de uso
                </label>
                <Err k="acepto" />

                <div aria-live="polite" className="lg-estado">{msg && <p className="msg error" role="alert">{msg}</p>}</div>
                <button type="submit" className="lg-enviar" disabled={enviando}>{enviando ? "Creando cuenta…" : "Crear cuenta de comerciante"}</button>
              </form>
              <p className="lg-pie">¿Ya tienes una cuenta? <Link to="/login">Iniciar sesión</Link></p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
