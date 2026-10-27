import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase, configurado, recordarSesion } from "../supabase.js";
import { useAuth, ROL_UI, DESTINO } from "../auth.jsx";
import Sello from "../components/Sello.jsx";
import "./login.css";

// ── Contenido de cada rol ────────────────────────────────────────────────
const ROLES = {
  comerciante: {
    tab: "Comerciante", icono: "🏪", etiqueta: "Acceso para comerciante",
    titulo: "Haz crecer tu negocio dentro de tu comunidad.",
    texto: "Actualiza tu perfil, publica productos y responde a tus clientes desde un solo lugar.",
    puntos: ["Perfil comercial completo", "Catálogo de productos y servicios", "Proceso de verificación"],
    eyebrow: "INICIAR SESIÓN · COMERCIANTE", h2: "Acceso de comerciante",
    placeholder: "tu@negocio.com", boton: "Entrar como comerciante", destino: "/panel",
  },
  administrador: {
    tab: "Administrador", icono: "▦", etiqueta: "Acceso para administrador",
    titulo: "Cuida la confianza de la comunidad.",
    texto: "Revisa solicitudes, verifica negocios y atiende los reportes del directorio.",
    puntos: ["Verificación de negocios", "Moderación de reportes", "Control de usuarios"],
    eyebrow: "INICIAR SESIÓN · ADMINISTRADOR", h2: "Acceso de administrador",
    placeholder: "admin@pymeconnect.mx", boton: "Entrar como administrador", destino: "/admin",
  },
};

const EMAIL_OK = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const MAX_INTENTOS = 5;   // intentos fallidos antes de bloquear el botón
const BLOQUEO_SEG = 30;   // (refuerzo de UX; el límite real lo aplica Supabase en el servidor)
const MSG_GENERICO = "Correo o contraseña incorrectos.";

// Icono decorativo de los campos (solo visual)
function IconoCampo({ tipo }) {
  return (
    <svg className="lg-ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {tipo === "correo"
        ? <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7.5 8 5.5 8-5.5" /></>
        : <><rect x="5" y="10.5" width="14" height="9.5" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>}
    </svg>
  );
}

export default function Login() {
  const nav = useNavigate();
  const [rol, setRol] = useState("comerciante");
  const [modo, setModo] = useState("entrar"); // "entrar" | "recuperar"
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [ver, setVer] = useState(false);
  const [recordar, setRecordar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState({ tipo: "", texto: "" });
  const [fallos, setFallos] = useState(0);
  const [bloqueo, setBloqueo] = useState(0);
  const trampa = useRef(null);
  const r = ROLES[rol];

  // Cuenta regresiva del bloqueo temporal
  useEffect(() => {
    if (bloqueo <= 0) return;
    const t = setTimeout(() => setBloqueo((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [bloqueo]);

  // Si ya hay sesión válida, no mostrar el formulario otra vez
  const { cargando, rol: rolSesion } = useAuth();
  const revisada = useRef(false);   // solo al abrir la página; el inicio de sesión lo gestiona el envío del formulario
  useEffect(() => {
    if (cargando || revisada.current) return;
    revisada.current = true;
    if (rolSesion) nav(DESTINO[rolSesion], { replace: true });
  }, [cargando, rolSesion, nav]);

  const cambiarRol = (nuevo) => { setRol(nuevo); setMsg({ tipo: "", texto: "" }); setClave(""); };

  function validar() {
    const c = correo.trim();
    if (!EMAIL_OK.test(c) || c.length > 254) return "Escribe un correo electrónico válido.";
    if (modo === "entrar" && (clave.length < 8 || clave.length > 128)) return "La contraseña debe tener entre 8 y 128 caracteres.";
    return "";
  }

  async function enviar(e) {
    e.preventDefault();
    if (enviando || bloqueo > 0) return;
    if (trampa.current?.value) return;               // honeypot: los bots lo llenan
    if (!supabase) return setMsg({ tipo: "error", texto: "Falta conectar Supabase (.env)." });
    const problema = validar();
    if (problema) return setMsg({ tipo: "error", texto: problema });

    setEnviando(true); setMsg({ tipo: "", texto: "" });
    const email = correo.trim().toLowerCase();

    if (modo === "recuperar") {
      await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/#/restablecer` });
      // Respuesta idéntica exista o no la cuenta → evita enumeración de usuarios.
      setMsg({ tipo: "ok", texto: "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña." });
      return setEnviando(false);
    }

    recordarSesion(recordar);                        // debe fijarse ANTES de iniciar sesión
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: clave });

    if (error || !data?.user) {
      const n = fallos + 1; setFallos(n);
      if (n >= MAX_INTENTOS) { setBloqueo(BLOQUEO_SEG); setFallos(0); }
      // Solo "invalid_credentials" es un fallo de datos del usuario. Los demás casos se distinguen
      // para poder diagnosticarlos (Supabase solo devuelve email_not_confirmed si la contraseña SÍ era correcta,
      // así que no permite descubrir qué correos existen).
      const codigo = error?.code || "";
      let texto = MSG_GENERICO;
      if (error?.status === 429 || codigo === "over_request_rate_limit") texto = "Demasiados intentos. Espera un momento.";
      else if (codigo === "email_not_confirmed") texto = "Debes confirmar tu correo antes de entrar. Revisa tu bandeja (y spam).";
      else if (codigo !== "invalid_credentials") {
        console.error("[login] Error de Supabase:", error);   // visible en la consola del navegador (F12)
        texto = "No pudimos conectar con el servidor. Revisa tu .env (URL y llave) e intenta de nuevo.";
        // En desarrollo mostramos la causa técnica real para poder diagnosticar
        if (import.meta.env.DEV) texto += ` [${error?.name || "Error"} · estado ${error?.status ?? "sin respuesta"} · ${error?.message || "sin mensaje"}]`;
      }
      setMsg({ tipo: "error", texto });
      setClave(""); return setEnviando(false);
    }

    // El rol sale de la tabla `perfiles` (protegida por RLS), nunca de datos que el usuario pueda editar.
    const { data: perf } = await supabase.from("perfiles").select("rol,estado").eq("id", data.user.id).maybeSingle();
    if (!perf) {
      await supabase.auth.signOut();
      setMsg({ tipo: "error", texto: "No pudimos verificar tu cuenta. Intenta de nuevo o contacta al equipo." });
      setClave(""); return setEnviando(false);
    }
    if (perf.estado !== "activo") {
      await supabase.auth.signOut();
      setMsg({ tipo: "error", texto: "Tu cuenta está suspendida. Contacta al equipo de PYMECONNECT." });
      setClave(""); return setEnviando(false);
    }
    if (ROL_UI[perf.rol] !== rol) {
      await supabase.auth.signOut();
      setMsg({ tipo: "error", texto: `Esta cuenta no tiene acceso de ${ROLES[rol].tab.toLowerCase()}. Revisa la pestaña seleccionada.` });
      setClave(""); return setEnviando(false);
    }
    nav(r.destino, { replace: true });
  }

  const recuperar = modo === "recuperar";

  return (
    <div className="lg-pagina lg-v2">
     <div className="lg-tarjeta">
      {/* ── Panel izquierdo (marca) ── */}
      <aside className="lg-lado">
        <span className="lg-insignia"><span aria-hidden="true">{r.icono}</span> {r.etiqueta}</span>
        <h1 className="lg-titulo">{r.titulo}</h1>
        <p className="lg-texto">{r.texto}</p>
        <ul className="lg-puntos">
          {r.puntos.map((p) => <li key={p}><span aria-hidden="true">✓</span> {p}</li>)}
        </ul>
        <Link to="/" className="lg-regresar"><span aria-hidden="true">←</span> Regresar</Link>
      </aside>

      {/* ── Panel derecho (formulario) ── */}
      <main className="lg-form-zona">
        <div className="lg-caja">
          <Sello />
          <hr className="lg-linea" />
          <Link to="/" className="lg-volver">← Volver al directorio</Link>

          <div className="lg-tabs" role="tablist" aria-label="Tipo de acceso">
            {Object.entries(ROLES).map(([k, v]) => (
              <button key={k} role="tab" type="button" aria-selected={rol === k}
                className={`lg-tab ${rol === k ? "activo" : ""}`} onClick={() => cambiarRol(k)}>
                <span aria-hidden="true">{v.icono}</span> {v.tab}
              </button>
            ))}
          </div>

          <p className="lg-eyebrow">{recuperar ? "RECUPERAR CONTRASEÑA" : r.eyebrow}</p>
          <h2 className="lg-h2">{recuperar ? "Restablece tu acceso" : r.h2}</h2>
          <p className="lg-sub">
            {recuperar ? "Escribe tu correo y te enviaremos un enlace." : "Escribe tus datos de acceso para continuar."}
          </p>

          {!configurado && <div className="aviso" role="alert">Falta conectar Supabase (.env).</div>}

          <form onSubmit={enviar} noValidate>
            <label className="lg-campo">
              <span>Correo electrónico *</span>
              <span className="lg-entrada">
                <IconoCampo tipo="correo" />
                <input className="campo" type="email" name="email" autoComplete="username" inputMode="email"
                  placeholder={r.placeholder} value={correo} maxLength={254} required
                  aria-invalid={msg.tipo === "error" || undefined}
                  onChange={(e) => setCorreo(e.target.value)} />
              </span>
            </label>

            {!recuperar && (
              <label className="lg-campo">
                <span>Contraseña *</span>
                <span className="lg-clave lg-entrada">
                  <IconoCampo tipo="clave" />
                  <input className="campo" type={ver ? "text" : "password"} name="password"
                    autoComplete="current-password" placeholder="Escribe tu contraseña"
                    value={clave} maxLength={128} required onChange={(e) => setClave(e.target.value)} />
                  <button type="button" className="lg-mostrar" aria-pressed={ver} onClick={() => setVer(!ver)}>
                    {ver ? "Ocultar" : "Mostrar"}
                  </button>
                </span>
              </label>
            )}

            {/* Honeypot anti-bots: invisible para personas */}
            <input ref={trampa} className="trampa" type="text" name="sitio_web" tabIndex={-1} autoComplete="off" aria-hidden="true" />

            {!recuperar && (
              <div className="lg-fila">
                <label className="lg-check">
                  <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
                  Mantener mi sesión activa
                </label>
                <button type="button" className="lg-enlace" onClick={() => { setModo("recuperar"); setMsg({ tipo: "", texto: "" }); }}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            <div aria-live="polite" className="lg-estado">
              {msg.texto && <p className={`msg ${msg.tipo}`} role={msg.tipo === "error" ? "alert" : undefined}>{msg.texto}</p>}
            </div>

            <button type="submit" className="lg-enviar" disabled={enviando || bloqueo > 0}>
              {bloqueo > 0 ? `Espera ${bloqueo} s…` : enviando ? "Un momento…" : recuperar ? "Enviar enlace" : r.boton}
            </button>

            {recuperar && (
              <button type="button" className="lg-enlace lg-centro" onClick={() => { setModo("entrar"); setMsg({ tipo: "", texto: "" }); }}>
                ← Volver a iniciar sesión
              </button>
            )}
          </form>

          {rol === "comerciante" && !recuperar && (
            <p className="lg-pie">¿Aún no tienes cuenta? <Link to="/registro">Registra tu negocio</Link></p>
          )}
        </div>
      </main>
     </div>
    </div>
  );
}
