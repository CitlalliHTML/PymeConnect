import { supabase } from "../supabase.js";

// Firmas ("magic bytes") para no confiar en la extensión ni en file.type, que el usuario puede falsificar.
const FIRMAS = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png":  (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/webp": (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  "application/pdf": (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
};
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
// Nombres reales de los buckets en Supabase
export const BUCKET_FOTOS = "fotos-comercios";            // público (fotos, logo, productos) · solo JPG/PNG · 5 MB
export const BUCKET_DOCS  = "documentos-verificacion";    // PRIVADO (INE, comprobantes) · PDF/JPG/PNG · 10 MB
export const IMAGENES = ["image/jpeg", "image/png"];
export const DOCS = [...IMAGENES, "application/pdf"];

// Devuelve { tipo } si el archivo es válido, o { error } con el motivo.
export async function inspeccionar(file, { tipos, maxMB }) {
  if (!file) return { error: "Selecciona un archivo." };
  if (file.size === 0) return { error: "El archivo está vacío." };
  if (file.size > maxMB * 1024 * 1024) return { error: `El archivo supera ${maxMB} MB.` };
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const tipo = tipos.find((t) => FIRMAS[t]?.(b));
  if (!tipo) return { error: "Formato no permitido. Usa " + tipos.map((t) => EXT[t].toUpperCase()).join(", ") + "." };
  return { tipo };
}

// Sube a <bucket>/<uid>/<uuid>.<ext>. El nombre original del archivo se descarta (evita rutas raras / XSS por nombre).
export async function subir(bucket, uid, file, opciones) {
  const r = await inspeccionar(file, opciones);
  if (r.error) return { error: r.error };
  const ruta = `${uid}/${crypto.randomUUID()}.${EXT[r.tipo]}`;
  const { error } = await supabase.storage.from(bucket).upload(ruta, file, { contentType: r.tipo, upsert: false, cacheControl: "3600" });
  if (error) return { error: "No pudimos subir el archivo. Intenta de nuevo." };
  const url = bucket === BUCKET_FOTOS ? supabase.storage.from(bucket).getPublicUrl(ruta).data.publicUrl : null;
  return { ruta, url };
}

// Validaciones de texto compartidas
export const soloDigitos = (s) => String(s || "").replace(/\D/g, "");
export const telefonoOk = (s) => /^\d{10}$/.test(soloDigitos(s));
export const limpiar = (s) => String(s ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
