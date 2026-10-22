# Configuración de Supabase

## 1. Crear el proyecto

En Supabase crea un proyecto nuevo. La contraseña de PostgreSQL se queda en Supabase; no es necesaria para conectar el frontend.

## 2. Ejecutar el esquema

1. Abre **SQL Editor** y crea una consulta nueva.
2. Copia el contenido de [`supabase/migrations/001_init_rh_schema.sql`](supabase/migrations/001_init_rh_schema.sql).
3. Presiona **Run**.

El script crea las 13 tablas vacías, relaciones, índices, triggers, RLS y el perfil automático de usuarios nuevos de Supabase Auth.

No ejecutes también `0001_hr_foundation_template.sql` en el mismo proyecto: es una plantilla anterior con otro modelo de tablas.

## 3. Crear y promover el primer usuario

Después de crear el primer usuario en **Authentication > Users**, copia su UUID y ejecuta en el SQL Editor:

```sql
update public.profiles
set rol = 'rh_admin', activo = true
where id = 'UUID_DEL_USUARIO';
```

Los usuarios nuevos quedan como `viewer` hasta que un administrador los promueva.

## 4. Conectar el frontend

Copia `.env.example` a `.env.local` y completa únicamente:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_llave_anon_o_publishable
```

No compartas ni coloques en el frontend:

- la contraseña de PostgreSQL;
- la llave `service_role`;
- secretos de Supabase.

Para la conexión del frontend solo se requiere la URL del proyecto y la llave pública `anon` o `publishable`.
