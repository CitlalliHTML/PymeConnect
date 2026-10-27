# PYMECONNECT Maravatío — Fase 1 (visitante)

1. Instala Node.js 18 o superior.
2. En esta carpeta: `npm install`
3. Copia `.env.example` como `.env` y pega tu URL y llave anon de Supabase.
4. `npm run dev` y abre la dirección que muestre la terminal.

Requiere haber ejecutado `pymeconnect_supabase.sql` (y `antispam_reportes.sql` para los reportes).

## Comerciante y administrador
1. `npm install` (incluye leaflet) y `npm run dev`. No hay que correr SQL: la app usa tu esquema actual (`perfiles`, `comercios`, `productos`, `verificaciones`, `reportes`, `admin_log`) y sus políticas RLS.
2. El **rol se lee de `perfiles.rol`** (`comerciante` | `admin`); una cuenta con `estado != 'activo'` no puede entrar.
3. Rutas comerciante: `/#/login`, `/#/registro`, `/#/panel`, `/#/panel/negocio`, `/#/panel/productos`, `/#/panel/verificacion`.
4. Rutas administrador: `/#/admin` (Resumen), `/#/admin/usuarios`, `/#/admin/comercios`, `/#/admin/verificaciones`, `/#/admin/reportes`.
5. Crear un administrador (ejecútalo tú en el SQL Editor, con el correo de una cuenta ya registrada):

```sql
update public.perfiles
set rol = 'admin', nivel_acceso = 'general'
where id = (select id from auth.users where email = 'TU_CORREO');
```

Nota: la protección de rutas en el navegador es solo UX; la seguridad real es RLS y los triggers de la base de datos.

## Diseño del login
`src/pages/login.css` (bloque "Login v2", todo bajo `.lg-v2`) usa la foto `src/assets/fondo-cafe.jpg` como fondo. Para cambiarla, reemplaza ese archivo. Registro aún usa el diseño anterior.
