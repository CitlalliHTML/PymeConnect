import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase.js";

// El rol NO viene del navegador ni del token: se lee de la tabla `perfiles`, protegida por RLS
// (un usuario no puede cambiarse su propio rol: lo impide el trigger proteger_campos_perfil).
export const ROL_UI = { comerciante: "comerciante", admin: "administrador" };
export const DESTINO = { comerciante: "/panel", administrador: "/admin" };

const AuthContext = createContext({ cargando: true, sesion: null, user: null, perfil: null, rol: null, salir: async () => {} });

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null);
  const [listo, setListo] = useState(false);               // ¿ya sabemos si hay sesión?
  const [info, setInfo] = useState({ id: null, perfil: null });

  useEffect(() => {
    if (!supabase) { setListo(true); return; }
    supabase.auth.getSession().then(({ data }) => { setSesion(data.session); setListo(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const uid = sesion?.user?.id ?? null;
  const cargarPerfil = useCallback(async () => {
    if (!uid) return setInfo({ id: null, perfil: null });
    const { data } = await supabase.from("perfiles").select("rol,estado,nombre,apellidos").eq("id", uid).maybeSingle();
    setInfo({ id: uid, perfil: data ?? null });
  }, [uid]);
  useEffect(() => { cargarPerfil(); }, [cargarPerfil]);

  const salir = useCallback(async () => { await supabase?.auth.signOut(); setSesion(null); setInfo({ id: null, perfil: null }); }, []);
  const user = sesion?.user ?? null;
  const cargando = !listo || (!!uid && info.id !== uid);
  const perfil = info.id === uid ? info.perfil : null;
  const rol = perfil && perfil.estado === "activo" ? ROL_UI[perfil.rol] ?? null : null;

  return <AuthContext.Provider value={{ cargando, sesion, user, perfil, rol, salir, recargarPerfil: cargarPerfil }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
