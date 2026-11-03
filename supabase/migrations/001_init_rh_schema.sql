-- Sistema de Gestión de Recursos Humanos y Flota
-- Dirección de Bomberos Tijuana
--
-- Ejecutar una sola vez en Supabase > SQL Editor sobre un proyecto nuevo.
-- Este archivo crea el esquema vacío, índices, triggers, RLS y el perfil
-- automático para usuarios nuevos de Supabase Auth.
--
-- Seguridad:
--   * El frontend solamente debe usar la URL del proyecto y la llave anon/
--     publishable.
--   * Nunca colocar la llave service_role ni la contraseña de PostgreSQL en
--     el navegador, en .env público o en el repositorio.
--   * Los usuarios nuevos empiezan como viewer. Promover el primer usuario
--     a rh_admin desde el SQL Editor, después de conocer su auth.users.id.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Funciones comunes
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. Perfiles de acceso
-- -----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username varchar(50) not null unique,
  nombre_completo varchar(150) not null,
  rol varchar(20) not null default 'viewer'
    check (rol in ('rh_admin', 'admin', 'viewer')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Se declara después de crear profiles porque consulta esa tabla.
create or replace function public.has_rh_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.activo = true
      and p.rol = any(required_roles)
  );
$$;

revoke all on function public.has_rh_role(text[]) from public;
grant execute on function public.has_rh_role(text[]) to authenticated, service_role;

-- Crea un perfil de solo lectura al registrar un usuario en Supabase Auth.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  full_name text;
begin
  base_username := lower(
    regexp_replace(
      coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, ''), '@', 1), 'usuario'),
      '[^a-zA-Z0-9_.-]',
      '_',
      'g'
    )
  );

  if length(btrim(base_username)) = 0 then
    base_username := 'usuario';
  end if;

  final_username := left(base_username, 50);
  if exists (select 1 from public.profiles where username = final_username) then
    final_username := left(base_username, 40) || '_' || replace(left(new.id::text, 8), '-', '');
  end if;

  full_name := left(
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', final_username),
    150
  );

  insert into public.profiles (id, username, nombre_completo, rol)
  values (new.id, final_username, full_name, 'viewer')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- 2. Catálogo de estaciones y áreas
-- -----------------------------------------------------------------------------

create table public.cat_estaciones_areas (
  id uuid primary key default gen_random_uuid(),
  clave_estacion varchar(30) not null unique,
  nombre varchar(120) not null,
  tipo_area varchar(30) not null
    check (tipo_area in ('ESTACION', 'DIVISION_ESPECIAL', 'ADMINISTRATIVO', 'JEFATURA', 'TALLER_BODEGA')),
  sector varchar(30),
  direccion text,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3. Catálogo de puestos oficiales
-- -----------------------------------------------------------------------------

create table public.cat_puestos (
  id uuid primary key default gen_random_uuid(),
  codigo_oficialia integer not null unique,
  nombre_puesto varchar(100) not null,
  rango_jerarquico varchar(50),
  nivel_tabulador integer,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 4. Catálogo de turnos
-- -----------------------------------------------------------------------------

create table public.cat_turnos (
  id uuid primary key default gen_random_uuid(),
  clave_turno varchar(20) not null unique,
  nombre_turno varchar(50) not null,
  horario_descripcion varchar(100),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 5. Unidades y máquinas
-- -----------------------------------------------------------------------------

create table public.unidades (
  id uuid primary key default gen_random_uuid(),
  numero_economico varchar(40) not null unique,
  tipo_vehiculo varchar(60) not null,
  marca varchar(60),
  linea_modelo varchar(60),
  modelo_anio integer check (modelo_anio is null or modelo_anio between 1900 and 2200),
  placas varchar(20) default 'S/P',
  serie_vin varchar(40),
  estacion_id uuid references public.cat_estaciones_areas(id) on delete set null,
  estado_operativo varchar(30) not null default 'Operando'
    check (estado_operativo in ('Operando', 'En taller', 'Baja en servicio', 'Fuera de servicio', 'Siniestrada')),
  resguardante varchar(150),
  taller_asignado varchar(150),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 6. Empleados
-- -----------------------------------------------------------------------------

create table public.empleados (
  id uuid primary key default gen_random_uuid(),
  numero_empleado bigint not null unique,
  numero_empleado_anterior bigint,
  nombres varchar(100) not null,
  apellido_paterno varchar(100) not null,
  apellido_materno varchar(100),
  nombre_completo varchar(250) not null,
  rfc varchar(13) not null unique,
  curp varchar(18) not null unique,
  nss varchar(20),
  fecha_nacimiento date,
  genero varchar(20) check (genero in ('MASCULINO', 'FEMENINO', 'OTRO')),
  tipo_sangre varchar(10),
  telefono varchar(25),
  correo_electronico varchar(120),
  direccion_domicilio text,
  contacto_emergencia_nombre varchar(150),
  contacto_emergencia_telefono varchar(25),
  fecha_alta date not null,
  fecha_base date,
  estatus_actual varchar(30) not null default 'ACTIVO'
    check (estatus_actual in ('ACTIVO', 'VACACIONES', 'PERMISO', 'LICENCIA', 'LESIONADO_INCAPACIDAD', 'COMISIONADO', 'SUSPENDIDO', 'BAJA', 'JUBILADO')),
  foto_url text,
  observaciones_generales text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint empleados_fecha_base_check check (fecha_base is null or fecha_base >= fecha_alta)
);

-- Evita duplicados que solo cambien por mayúsculas/minúsculas.
create unique index empleados_rfc_lower_uidx on public.empleados (lower(rfc));
create unique index empleados_curp_lower_uidx on public.empleados (lower(curp));

-- -----------------------------------------------------------------------------
-- 7. Plazas y salarios
-- -----------------------------------------------------------------------------

create table public.plazas_salarios (
  id uuid primary key default gen_random_uuid(),
  numero_plaza varchar(30) not null unique,
  empleado_id uuid references public.empleados(id) on delete set null,
  puesto_id uuid references public.cat_puestos(id) on delete restrict,
  estatus_plaza varchar(20) not null default 'Ocupada'
    check (estatus_plaza in ('Ocupada', 'Vacante')),
  tipo_empleado varchar(40) not null
    check (tipo_empleado in ('BASE', 'CONFIANZA', 'CONFIANZA II', 'TIEMPO DETERMINADO')),
  sub_tipo varchar(40) default 'BOMBERO',
  disponible boolean not null default false,
  es_interinato boolean not null default false,
  clave_dependencia integer default 83,
  clave_departamento integer default 1,
  clave_area integer default 0,
  clave_adscripcion varchar(30),
  descripcion_adscripcion varchar(150),
  sueldo_mensual_bruto numeric(12,2) not null default 0.00 check (sueldo_mensual_bruto >= 0),
  sueldo_neto numeric(12,2) check (sueldo_neto is null or sueldo_neto >= 0),
  compensacion numeric(12,2) not null default 0.00 check (compensacion >= 0),
  nivel_salarial integer,
  categoria varchar(30),
  quinquenio integer not null default 0 check (quinquenio >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plazas_ocupada_tiene_empleado check (estatus_plaza = 'Vacante' or empleado_id is not null)
);

-- -----------------------------------------------------------------------------
-- 8. Asignaciones operativas
-- -----------------------------------------------------------------------------

create table public.asignaciones_operativas (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados(id) on delete cascade,
  estacion_id uuid not null references public.cat_estaciones_areas(id) on delete restrict,
  turno_id uuid not null references public.cat_turnos(id) on delete restrict,
  unidad_id uuid references public.unidades(id) on delete set null,
  rol_en_estacion varchar(80) not null,
  es_comisionado boolean not null default false,
  fecha_inicio date not null default current_date,
  fecha_fin date,
  asignacion_activa boolean not null default true,
  notas text,
  registrado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asignacion_fecha_order check (fecha_fin is null or fecha_fin >= fecha_inicio)
);

-- -----------------------------------------------------------------------------
-- 9. Vacaciones
-- -----------------------------------------------------------------------------

create table public.vacaciones (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados(id) on delete cascade,
  periodo_anio integer not null check (periodo_anio between 2000 and 2200),
  periodo_semestre varchar(20) not null
    check (periodo_semestre in ('PRIMER PERIODO', 'SEGUNDO PERIODO', 'EXTRAORDINARIO')),
  fecha_inicio date not null,
  fecha_fin date not null,
  fecha_reincorporacion date not null,
  dias_habiles integer not null check (dias_habiles > 0),
  folio_oficio varchar(50),
  estatus_vacaciones varchar(30) not null default 'PROGRAMADAS'
    check (estatus_vacaciones in ('PROGRAMADAS', 'EN CURSO', 'CONCLUIDAS', 'CANCELADAS', 'SUSPENDIDAS POR EMERGENCIA')),
  observaciones text,
  documento_url text,
  registrado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint vacaciones_fecha_order check (fecha_fin >= fecha_inicio and fecha_reincorporacion > fecha_fin)
);

-- -----------------------------------------------------------------------------
-- 10. Permisos y licencias
-- -----------------------------------------------------------------------------

create table public.permisos_licencias (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados(id) on delete cascade,
  tipo_registro varchar(30) not null
    check (tipo_registro in ('PERMISO ECONOMICO', 'LICENCIA CON GOCE', 'LICENCIA SIN GOCE', 'COMISION SINDICAL', 'PERMISO ESPECIAL')),
  subtipo_motivo varchar(80) not null,
  con_goce_sueldo boolean not null default true,
  fecha_inicio date not null,
  fecha_fin date not null,
  dias_totales integer not null check (dias_totales > 0),
  folio_autorizacion varchar(50),
  motivo_detallado text,
  documento_url text,
  estatus varchar(30) not null default 'APROBADO'
    check (estatus in ('APROBADO', 'ACTIVO', 'CONCLUIDO', 'CANCELADO')),
  registrado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint permisos_fecha_order check (fecha_fin >= fecha_inicio)
);

-- -----------------------------------------------------------------------------
-- 11. Lesiones e incapacidades
-- -----------------------------------------------------------------------------

create table public.lesiones_incapacidades (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados(id) on delete cascade,
  estacion_incidente_id uuid references public.cat_estaciones_areas(id) on delete set null,
  unidad_incidente_id uuid references public.unidades(id) on delete set null,
  tipo_evento varchar(40) not null
    check (tipo_evento in ('LESION EN SERVICIO', 'ACCIDENTE EN TRAYECTO', 'ENFERMEDAD GENERAL', 'MATERNIDAD_PATERNIDAD')),
  riesgo_trabajo boolean not null default true,
  fecha_incidente date not null,
  fecha_inicio_incapacidad date not null,
  fecha_fin_incapacidad date,
  dias_incapacidad integer check (dias_incapacidad is null or dias_incapacidad >= 0),
  folio_certificado_medico varchar(60),
  institucion_medica varchar(60) default 'ISSSTECALI',
  diagnostico_lesion text not null,
  parte_cuerpo_afectada varchar(100),
  estatus_recuperacion varchar(30) not null default 'INCAPACITADO'
    check (estatus_recuperacion in ('INCAPACITADO', 'REUBICADO LABORES ADMINISTRATIVAS', 'ALTA MEDICA', 'DICTAMEN INVALIDEZ')),
  documento_url text,
  registrado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint lesiones_fecha_order check (fecha_fin_incapacidad is null or fecha_fin_incapacidad >= fecha_inicio_incapacidad)
);

-- -----------------------------------------------------------------------------
-- 12. Actas administrativas
-- -----------------------------------------------------------------------------

create table public.actas_administrativas (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados(id) on delete cascade,
  estacion_id uuid references public.cat_estaciones_areas(id) on delete set null,
  folio_acta varchar(50) not null unique,
  fecha_hechos date not null,
  fecha_levantamiento date not null default current_date,
  motivo_falta text not null,
  articulos_infringidos varchar(150),
  sancion_determinada varchar(100) not null
    check (sancion_determinada in ('AMONESTACION VERBAL', 'AMONESTACION ESCRITA', 'SUSPENSION SIN GOCE', 'REMOCION DE CARGO', 'TURNADO A SINDICATURA')),
  dias_suspension integer not null default 0 check (dias_suspension >= 0),
  estatus_acta varchar(30) not null default 'VIGENTE'
    check (estatus_acta in ('EN REVISION', 'VIGENTE', 'CUMPLIDA', 'REVOCADA')),
  documento_firmado_url text,
  registrado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint acta_fecha_order check (fecha_levantamiento >= fecha_hechos)
);

-- -----------------------------------------------------------------------------
-- 13. Bajas de personal
-- -----------------------------------------------------------------------------

create table public.bajas_personal (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados(id) on delete cascade,
  plaza_liberada_id uuid references public.plazas_salarios(id) on delete set null,
  fecha_baja date not null,
  motivo_baja varchar(60) not null
    check (motivo_baja in ('JUBILACION', 'RENUNCIA VOLUNTARIA', 'TERMINO DE CONTRATO', 'BASIFICACION CAMBIO PLAZA', 'DEFUNCION', 'CESE_DESTITUCION', 'INCAPACIDAD PERMANENTE')),
  folio_baja_oficialia varchar(50),
  finiquito_liquidado boolean not null default false,
  recontratable boolean not null default true,
  detalle_baja text,
  documento_baja_url text,
  registrado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Índices de consultas frecuentes
-- -----------------------------------------------------------------------------

create index idx_empleados_numero on public.empleados (numero_empleado);
create index idx_empleados_estatus on public.empleados (estatus_actual);
create index idx_empleados_nombre_busqueda
  on public.empleados using gin (to_tsvector('spanish', nombre_completo));
create index idx_plazas_empleado on public.plazas_salarios (empleado_id);
create index idx_plazas_estatus on public.plazas_salarios (estatus_plaza);
create index idx_asignaciones_empleado_activa
  on public.asignaciones_operativas (empleado_id)
  where asignacion_activa = true;
create index idx_asignaciones_estacion_turno
  on public.asignaciones_operativas (estacion_id, turno_id)
  where asignacion_activa = true;
create index idx_vacaciones_empleado on public.vacaciones (empleado_id, periodo_anio);
create index idx_permisos_empleado on public.permisos_licencias (empleado_id, fecha_inicio);
create index idx_lesiones_empleado on public.lesiones_incapacidades (empleado_id, estatus_recuperacion);
create index idx_actas_empleado on public.actas_administrativas (empleado_id);
create index idx_bajas_empleado on public.bajas_personal (empleado_id, fecha_baja);

-- -----------------------------------------------------------------------------
-- Triggers de updated_at
-- -----------------------------------------------------------------------------

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_unidades_updated_at
  before update on public.unidades
  for each row execute function public.set_updated_at();
create trigger trg_empleados_updated_at
  before update on public.empleados
  for each row execute function public.set_updated_at();
create trigger trg_plazas_updated_at
  before update on public.plazas_salarios
  for each row execute function public.set_updated_at();
create trigger trg_asignaciones_updated_at
  before update on public.asignaciones_operativas
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: viewer puede consultar; admin/rh_admin puede modificar.
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.cat_estaciones_areas enable row level security;
alter table public.cat_puestos enable row level security;
alter table public.cat_turnos enable row level security;
alter table public.unidades enable row level security;
alter table public.empleados enable row level security;
alter table public.plazas_salarios enable row level security;
alter table public.asignaciones_operativas enable row level security;
alter table public.vacaciones enable row level security;
alter table public.permisos_licencias enable row level security;
alter table public.lesiones_incapacidades enable row level security;
alter table public.actas_administrativas enable row level security;
alter table public.bajas_personal enable row level security;

-- Perfiles: cada usuario puede ver el suyo; los administradores pueden verlos todos.
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.has_rh_role(array['rh_admin', 'admin']::text[]));
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin']::text[]))
  with check (public.has_rh_role(array['rh_admin', 'admin']::text[]));

-- Catálogos y datos del expediente.
create policy cat_estaciones_select on public.cat_estaciones_areas
  for select to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin', 'viewer']::text[]));
create policy cat_estaciones_write on public.cat_estaciones_areas
  for all to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin']::text[]))
  with check (public.has_rh_role(array['rh_admin', 'admin']::text[]));

create policy cat_puestos_select on public.cat_puestos
  for select to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin', 'viewer']::text[]));
create policy cat_puestos_write on public.cat_puestos
  for all to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin']::text[]))
  with check (public.has_rh_role(array['rh_admin', 'admin']::text[]));

create policy cat_turnos_select on public.cat_turnos
  for select to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin', 'viewer']::text[]));
create policy cat_turnos_write on public.cat_turnos
  for all to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin']::text[]))
  with check (public.has_rh_role(array['rh_admin', 'admin']::text[]));

create policy unidades_select on public.unidades
  for select to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin', 'viewer']::text[]));
create policy unidades_write on public.unidades
  for all to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin']::text[]))
  with check (public.has_rh_role(array['rh_admin', 'admin']::text[]));

create policy empleados_select on public.empleados
  for select to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin', 'viewer']::text[]));
create policy empleados_write on public.empleados
  for all to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin']::text[]))
  with check (public.has_rh_role(array['rh_admin', 'admin']::text[]));

create policy plazas_select on public.plazas_salarios
  for select to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin', 'viewer']::text[]));
create policy plazas_write on public.plazas_salarios
  for all to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin']::text[]))
  with check (public.has_rh_role(array['rh_admin', 'admin']::text[]));

create policy asignaciones_select on public.asignaciones_operativas
  for select to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin', 'viewer']::text[]));
create policy asignaciones_write on public.asignaciones_operativas
  for all to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin']::text[]))
  with check (public.has_rh_role(array['rh_admin', 'admin']::text[]));

create policy vacaciones_select on public.vacaciones
  for select to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin', 'viewer']::text[]));
create policy vacaciones_write on public.vacaciones
  for all to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin']::text[]))
  with check (public.has_rh_role(array['rh_admin', 'admin']::text[]));

create policy permisos_select on public.permisos_licencias
  for select to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin', 'viewer']::text[]));
create policy permisos_write on public.permisos_licencias
  for all to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin']::text[]))
  with check (public.has_rh_role(array['rh_admin', 'admin']::text[]));

create policy lesiones_select on public.lesiones_incapacidades
  for select to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin', 'viewer']::text[]));
create policy lesiones_write on public.lesiones_incapacidades
  for all to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin']::text[]))
  with check (public.has_rh_role(array['rh_admin', 'admin']::text[]));

create policy actas_select on public.actas_administrativas
  for select to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin', 'viewer']::text[]));
create policy actas_write on public.actas_administrativas
  for all to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin']::text[]))
  with check (public.has_rh_role(array['rh_admin', 'admin']::text[]));

create policy bajas_select on public.bajas_personal
  for select to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin', 'viewer']::text[]));
create policy bajas_write on public.bajas_personal
  for all to authenticated
  using (public.has_rh_role(array['rh_admin', 'admin']::text[]))
  with check (public.has_rh_role(array['rh_admin', 'admin']::text[]));

-- -----------------------------------------------------------------------------
-- Promoción inicial (ejecutar manualmente después de crear el usuario Auth):
-- update public.profiles set rol = 'rh_admin' where id = 'UUID_DEL_USUARIO';
-- -----------------------------------------------------------------------------
