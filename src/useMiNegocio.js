import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import { useAuth } from "./auth.jsx";

// Campos que cuentan para el % de perfil completo
const CAMPOS = ["nombre", "descripcion", "direccion", "telefono", "whatsapp", "foto_url", "latitud", "longitud", "categoria_id"];
export const porcentajePerfil = (n) =>
  n ? Math.round((CAMPOS.filter((c) => n[c] !== null && n[c] !== undefined && String(n[c]).trim() !== "").length / CAMPOS.length) * 100) : 0;

// Carga el negocio del comerciante en sesión y sus métricas.
// SEGURIDAD: se filtra por propietario_id = auth.uid(); además las políticas RLS deben impedir leer/editar lo ajeno.
export function useMiNegocio() {
  const { user } = useAuth();
  const [tick, setTick] = useState(0);
  const [d, setD] = useState({ cargando: true, error: "", negocio: null, productos: null, servicios: null, nuevosMes: null, favoritos: null, reportes: null });

  useEffect(() => {
    if (!supabase || !user) return;
    let vivo = true;
    (async () => {
      const { data: negocio, error } = await supabase.from("comercios").select("*").eq("propietario_id", user.id).order("created_at").limit(1).maybeSingle();
      if (!vivo) return;
      if (error) return setD((p) => ({ ...p, cargando: false, error: "No pudimos cargar tu negocio. Intenta de nuevo." }));
      if (!negocio) return setD((p) => ({ ...p, cargando: false }));

      const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
      const semana = new Date(Date.now() - 7 * 864e5).toISOString();
      const [prods, favs, favSem, reps] = await Promise.all([
        supabase.from("productos").select("*").eq("comercio_id", negocio.id).eq("activo", true),
        supabase.from("favoritos").select("*", { count: "exact", head: true }).eq("comercio_id", negocio.id),
        supabase.from("favoritos").select("*", { count: "exact", head: true }).eq("comercio_id", negocio.id).gte("created_at", semana),
        supabase.from("reportes").select("*", { count: "exact", head: true }).eq("comercio_id", negocio.id).eq("estado", "pendiente"),
      ]);
      if (!vivo) return;
      const lista = prods.data || [];
      const esServicio = (p) => p.tipo === "servicio";
      setD({
        cargando: false, error: "", negocio,
        productos: prods.error ? null : lista.filter((p) => !esServicio(p)).length,
        servicios: prods.error ? null : lista.filter(esServicio).length,
        nuevosMes: prods.error ? null : lista.filter((p) => p.created_at && new Date(p.created_at) >= inicioMes).length,
        favoritos: favs.error ? null : favs.count ?? 0,
        favSemana: favSem.error ? null : favSem.count ?? 0,
        reportes: reps.error ? null : reps.count ?? 0,
      });
    })();
    return () => { vivo = false; };
  }, [user, tick]);

  return { ...d, recargar: () => setTick((t) => t + 1) };
}
