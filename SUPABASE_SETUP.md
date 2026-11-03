# Configuración de Supabase

El proyecto conectado es **bomberos Tijuana RH**. El esquema inicial ya está aplicado. La migración `002_roles_access_and_directory.sql` agrega los roles operativos, el guardado del directorio y los catálogos base.

## Roles

| Rol en la base | Quién | Qué puede hacer |
|---|---|---|
| `admin` | Desarrolladores | Expediente completo y todas las cuentas, incluida la de desarrollo |
| `rh_admin` | Cliente que opera el sistema | Expediente completo y cuentas `rh_admin` o pendientes. No puede ver ni editar cuentas `admin` |
| `viewer` | Cuenta recién creada | Entra a Auth, pero la aplicación no abre el escritorio y no lee personal |

## Conectar el frontend

Copia `.env.example` a `.env.local` y completa únicamente:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_llave_anon_o_publishable
```

No compartas ni coloques en el frontend la contraseña de PostgreSQL, la llave `service_role` ni otros secretos.

## Cuentas

Las dos primeras cuentas se crean en **Authentication > Users**, con el registro público desactivado. Después de cada alta, el trigger deja el perfil en `viewer`. Promueve cada una en el SQL Editor:

```sql
update public.profiles
set rol = 'admin', activo = true
where id = 'UUID_DEL_DESARROLLADOR';

update public.profiles
set rol = 'rh_admin', activo = true
where id = 'UUID_DEL_CLIENTE';
```

Con la aplicación ya en marcha, un `admin` o un `rh_admin` puede crear las siguientes cuentas desde Configuración. El cliente no puede asignar el rol `admin`.

En el proyecto de Supabase, desactiva **Allow new users to sign up** para que las cuentas solo nazcan desde Configuración o desde el panel.
