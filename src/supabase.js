import { createClient } from "@supabase/supabase-js";

// Limpia errores típicos del .env: espacios, comillas, "/" final o rutas pegadas (/rest/v1, /auth/v1).
const limpio = (v) => String(v ?? "").trim().replace(/^["']|["']$/g, "");
const url = limpio(import.meta.env.VITE_SUPABASE_URL).replace(/\/(rest|auth)\/v1\/?$/, "").replace(/\/+$/, "");
const key = limpio(import.meta.env.VITE_SUPABASE_ANON_KEY);

// Diagnóstico solo en desarrollo (npm run dev): visible en la consola del navegador (F12)
if (import.meta.env.DEV) {
  const hostOk = /^https:\/\/[a-z0-9]{15,25}\.supabase\.co$/.test(url);
  console.info("[supabase] URL:", url || "(vacía)", hostOk ? "✓ formato correcto" : "✗ formato inesperado (debe ser https://xxxx.supabase.co)");
  try {
    const rol = JSON.parse(atob(key.split(".")[1] || "")).role;
    if (rol === "service_role") console.error("[supabase] ⚠ ESA ES LA LLAVE service_role. Usa la anon/publishable; la service_role NUNCA va en el navegador.");
  } catch { /* llave tipo sb_publishable_… (no es JWT): es válida */ }
}

export const configurado = Boolean(url && key);

// SEGURIDAD: "Mantener mi sesión activa".
// Si está marcada, el token vive en localStorage (sobrevive al cerrar el navegador).
// Si no, vive en sessionStorage (se borra al cerrar la pestaña). Útil en equipos compartidos.
const FLAG = "pc_recordar";
const almacen = () => {
  try { return localStorage.getItem(FLAG) === "1" ? localStorage : sessionStorage; }
  catch { return null; }
};
export const recordarSesion = (si) => {
  try {
    if (si) localStorage.setItem(FLAG, "1"); else localStorage.removeItem(FLAG);
  } catch { /* sin almacenamiento */ }
};
const storage = {
  getItem: (k) => almacen()?.getItem(k) ?? null,
  setItem: (k, v) => almacen()?.setItem(k, v),
  removeItem: (k) => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch { /* */ } },
};

export const supabase = configurado
  ? createClient(url, key, { auth: { storage, persistSession: true, autoRefreshToken: true } })
  : null;
