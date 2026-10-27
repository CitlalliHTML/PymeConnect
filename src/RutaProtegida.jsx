import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth.jsx";

// Guardia de rutas (mejora de UX). La seguridad REAL está en las políticas RLS de Supabase:
// aunque alguien salte esta guardia, la base de datos no le entrega datos ajenos.
export default function RutaProtegida({ rol }) {
  const { cargando, user, rol: rolReal } = useAuth();   // rolReal viene de `perfiles`
  const loc = useLocation();
  if (cargando) return <p className="pn-cargando" role="status">Verificando sesión…</p>;
  if (!user || rolReal !== rol) return <Navigate to="/login" replace state={{ desde: loc.pathname }} />;
  return <Outlet />;
}
