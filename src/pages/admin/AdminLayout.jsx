import Workspace from "../../components/Workspace.jsx";
import { useAuth } from "../../auth.jsx";

const NAV = [
  ["/admin", "inicio", "Resumen", true],
  ["/admin/usuarios", "usuario", "Usuarios"],
  ["/admin/comercios", "negocio", "Comercios"],
  ["/admin/verificaciones", "check", "Verificaciones"],
  ["/admin/reportes", "reporte", "Reportes"],
];

export default function AdminLayout() {
  const { perfil } = useAuth();
  return <Workspace nav={NAV} cuentaEtiqueta="ADMINISTRACIÓN" cuentaNombre={perfil?.nombre ? `Equipo · ${perfil.nombre}` : "Equipo PYMECONNECT"}
    barra="Panel administrativo" contexto={null} />;
}
