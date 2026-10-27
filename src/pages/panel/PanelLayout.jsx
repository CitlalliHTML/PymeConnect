import Workspace from "../../components/Workspace.jsx";
import { useMiNegocio } from "../../useMiNegocio.js";

const NAV = [
  ["/panel", "inicio", "Inicio", true],
  ["/panel/negocio", "negocio", "Mi negocio"],
  ["/panel/productos", "capas", "Productos y servicios"],
  ["/panel/ubicacion", "pin", "Ubicación"],
  ["/panel/verificacion", "check", "Verificación"],
  ["/panel/perfil", "usuario", "Perfil"],
  ["/panel/ayuda", "ayuda", "Ayuda"],
];

export default function PanelLayout() {
  const datos = useMiNegocio();
  return <Workspace nav={NAV} cuentaEtiqueta="CUENTA COMERCIANTE" cuentaNombre={datos.negocio?.nombre || "Mi cuenta"}
    barra="Panel del comerciante" ayudaTo="/panel/ayuda" contexto={datos} />;
}
