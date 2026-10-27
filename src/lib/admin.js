import { supabase } from "../supabase.js";

// Bitácora de acciones del administrador (la política de la BD exige admin_id = auth.uid()).
export async function registrarLog(adminId, accion, tabla, registroId, detalle = {}) {
  const { error } = await supabase.from("admin_log").insert({ admin_id: adminId, accion, tabla, registro_id: String(registroId), detalle });
  if (error) console.error("[admin_log]", error);
  return !error;
}
