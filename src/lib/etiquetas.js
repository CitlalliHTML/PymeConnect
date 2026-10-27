// Textos en español para los valores (enums) de la base de datos
export const MOTIVOS = { informacion_falsa: "Información falsa", comercio_inexistente: "El comercio ya no existe", informacion_desactualizada: "Información desactualizada", contenido_inapropiado: "Contenido inapropiado", otro: "Otro" };
export const ESTADO_REPORTE = { pendiente: "Pendiente", en_revision: "En revisión", resuelto: "Resuelto" };
export const ESTADO_VERIF = { pendiente: "Pendiente", en_revision: "En revisión", info_adicional: "Falta información", aprobada: "Aprobada", rechazada: "Rechazada" };
export const ESTADO_COMERCIO = { activo: "Activo", suspendido: "Suspendido", baja: "Baja" };
export const ESTADO_CUENTA = { activo: "Activo", suspendido: "Suspendido" };
export const ROL = { comerciante: "Comerciante", admin: "Administrador" };

// Color del distintivo según el estado: "" verde · "pausado" ámbar · "rechazo" rojo
export const tono = (v) => (["suspendido", "baja", "rechazada", "rechazo"].includes(v) ? "rechazo"
  : ["pendiente", "en_revision", "info_adicional"].includes(v) ? "pausado" : "");

export const fecha = (x) => (x ? new Date(x).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "—");
export function hace(x) {
  const s = Math.max(0, (Date.now() - new Date(x).getTime()) / 1000);
  if (s < 3600) return `hace ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} d`;
}
export const nombreCompleto = (p) => [p?.nombre, p?.apellidos].filter(Boolean).join(" ") || "Sin nombre";

// CSV seguro: evita "inyección de fórmulas" en Excel (celdas que empiezan con = + - @)
export const celdaCsv = (v) => {
  let t = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
  return `"${t.replace(/"/g, '""')}"`;
};
