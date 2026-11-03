-- Acceso de admin (desarrolladores) y rh_admin (cliente).
-- Se aplica encima de 001_init_rh_schema.sql. Las cuentas nuevas siguen
-- naciendo como viewer y no pueden leer el expediente.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role, supabase_auth_admin;

create or replace function private.has_rh_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.activo = true
      and p.rol = any(required_roles)
  );
$$;

revoke all on function private.has_rh_role(text[]) from public, anon, authenticated;
grant execute on function private.has_rh_role(text[]) to authenticated, service_role;

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
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

revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
grant execute on function private.handle_new_auth_user() to supabase_auth_admin, service_role;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on public.%I', policy_row.policyname, policy_row.tablename);
  end loop;
end $$;

create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_select_admin on public.profiles
  for select to authenticated
  using ((select private.has_rh_role(array['admin']::text[])));
create policy profiles_select_rh on public.profiles
  for select to authenticated
  using (
    (select private.has_rh_role(array['rh_admin']::text[]))
    and rol <> 'admin'
  );
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using ((select private.has_rh_role(array['admin']::text[])))
  with check ((select private.has_rh_role(array['admin']::text[])));
create policy profiles_update_rh on public.profiles
  for update to authenticated
  using (
    (select private.has_rh_role(array['rh_admin']::text[]))
    and rol <> 'admin'
  )
  with check (
    (select private.has_rh_role(array['rh_admin']::text[]))
    and rol in ('rh_admin', 'viewer')
  );

do $$
declare
  staff_table text;
begin
  for staff_table in
    select unnest(array[
      'cat_estaciones_areas',
      'cat_puestos',
      'cat_turnos',
      'unidades',
      'empleados',
      'plazas_salarios',
      'asignaciones_operativas',
      'vacaciones',
      'permisos_licencias',
      'lesiones_incapacidades',
      'actas_administrativas',
      'bajas_personal'
    ]::text[])
  loop
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select private.has_rh_role(array[''admin'', ''rh_admin'']::text[]))) with check ((select private.has_rh_role(array[''admin'', ''rh_admin'']::text[])))',
      staff_table || '_staff',
      staff_table
    );
  end loop;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

drop function if exists public.handle_new_auth_user();
drop function if exists public.has_rh_role(text[]);

revoke all on function public.set_updated_at() from public, anon;
grant execute on function public.set_updated_at() to authenticated, service_role;

create or replace function public.save_directorio_empleado(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  emp_id uuid;
  v_numero bigint;
  v_nombres text;
  v_paterno text;
  v_materno text;
  v_nombre text;
  v_rfc text;
  v_curp text;
  v_fecha date;
  v_estatus text;
  v_puesto uuid;
  v_estacion uuid;
  v_turno uuid;
  v_unidad uuid;
  v_rol text;
  v_unidad_nueva text;
begin
  if not private.has_rh_role(array['admin', 'rh_admin']::text[]) then
    raise exception 'Sin permiso para modificar el directorio';
  end if;

  v_numero := (payload->>'numero_empleado')::bigint;
  v_nombres := btrim(coalesce(payload->>'nombres', ''));
  v_paterno := btrim(coalesce(payload->>'apellido_paterno', ''));
  v_materno := nullif(btrim(coalesce(payload->>'apellido_materno', '')), '');
  v_rfc := upper(btrim(coalesce(payload->>'rfc', '')));
  v_curp := upper(btrim(coalesce(payload->>'curp', '')));
  v_fecha := (payload->>'fecha_alta')::date;
  v_estatus := payload->>'estatus_actual';
  v_puesto := nullif(payload->>'puesto_id', '')::uuid;
  v_estacion := nullif(payload->>'estacion_id', '')::uuid;
  v_turno := nullif(payload->>'turno_id', '')::uuid;
  v_unidad := nullif(payload->>'unidad_id', '')::uuid;
  v_unidad_nueva := nullif(btrim(coalesce(payload->>'unidad_nueva', '')), '');

  if v_numero is null or v_numero <= 0 then
    raise exception 'El número de empleado es obligatorio';
  end if;
  if v_nombres = '' or v_paterno = '' then
    raise exception 'Nombres y apellido paterno son obligatorios';
  end if;
  if v_rfc !~ '^[A-ZÑ&0-9]{12,13}$' then
    raise exception 'El RFC debe tener 12 o 13 caracteres';
  end if;
  if v_curp !~ '^[A-Z0-9]{18}$' then
    raise exception 'La CURP debe tener 18 caracteres';
  end if;
  if v_fecha is null then
    raise exception 'La fecha de alta es obligatoria';
  end if;
  if v_estatus not in (
    'ACTIVO', 'VACACIONES', 'PERMISO', 'LICENCIA', 'LESIONADO_INCAPACIDAD',
    'COMISIONADO', 'SUSPENDIDO', 'BAJA', 'JUBILADO'
  ) then
    raise exception 'El estatus no es válido';
  end if;
  if v_puesto is null or v_estacion is null or v_turno is null then
    raise exception 'Puesto, estación y turno son obligatorios';
  end if;

  select nombre_puesto into v_rol
  from public.cat_puestos
  where id = v_puesto;
  if v_rol is null then
    raise exception 'El puesto seleccionado no existe';
  end if;
  if not exists (select 1 from public.cat_estaciones_areas where id = v_estacion) then
    raise exception 'La estación seleccionada no existe';
  end if;
  if not exists (select 1 from public.cat_turnos where id = v_turno) then
    raise exception 'El turno seleccionado no existe';
  end if;

  v_nombre := left(btrim(concat_ws(' ', v_nombres, v_paterno, v_materno)), 250);

  if nullif(payload->>'id', '') is null then
    insert into public.empleados (
      numero_empleado, nombres, apellido_paterno, apellido_materno, nombre_completo,
      rfc, curp, fecha_alta, estatus_actual
    ) values (
      v_numero, v_nombres, v_paterno, v_materno, v_nombre,
      v_rfc, v_curp, v_fecha, v_estatus
    )
    returning id into emp_id;
  else
    emp_id := (payload->>'id')::uuid;
    update public.empleados
    set numero_empleado = v_numero,
        nombres = v_nombres,
        apellido_paterno = v_paterno,
        apellido_materno = v_materno,
        nombre_completo = v_nombre,
        rfc = v_rfc,
        curp = v_curp,
        fecha_alta = v_fecha,
        estatus_actual = v_estatus
    where id = emp_id;
    if not found then
      raise exception 'El empleado no existe';
    end if;
  end if;

  if v_unidad is null and v_unidad_nueva is not null then
    insert into public.unidades (numero_economico, tipo_vehiculo, estacion_id)
    values (left(v_unidad_nueva, 40), 'Unidad', v_estacion)
    on conflict (numero_economico) do update
      set estacion_id = excluded.estacion_id
    returning id into v_unidad;
  end if;

  update public.asignaciones_operativas
  set asignacion_activa = false,
      fecha_fin = current_date
  where empleado_id = emp_id
    and asignacion_activa = true
    and (
      estacion_id is distinct from v_estacion
      or turno_id is distinct from v_turno
      or rol_en_estacion is distinct from v_rol
      or unidad_id is distinct from v_unidad
    );

  if not exists (
    select 1
    from public.asignaciones_operativas
    where empleado_id = emp_id
      and asignacion_activa = true
  ) then
    insert into public.asignaciones_operativas (
      empleado_id, estacion_id, turno_id, unidad_id, rol_en_estacion, registrado_por
    ) values (
      emp_id, v_estacion, v_turno, v_unidad, v_rol, (select auth.uid())
    );
  end if;

  return emp_id;
exception
  when unique_violation then
    raise exception 'Ya existe un empleado con ese número, RFC o CURP';
  when invalid_text_representation then
    raise exception 'Revisa el número de empleado, la fecha de alta y los catálogos';
end;
$$;

revoke all on function public.save_directorio_empleado(jsonb) from public, anon;
grant execute on function public.save_directorio_empleado(jsonb) to authenticated, service_role;

insert into public.cat_estaciones_areas (clave_estacion, nombre, tipo_area, sector, direccion)
values
  ('CENTRAL', 'Estación Central', 'ESTACION', 'Centro y Zona Río', 'Zona Centro'),
  ('OTAY', 'Estación Otay', 'ESTACION', 'Otay y aeropuerto', 'Mesa de Otay'),
  ('PLAYAS', 'Estación Playas', 'ESTACION', 'Playas y zona costera', 'Playas de Tijuana'),
  ('LA_PRESA', 'Estación La Presa', 'ESTACION', 'Este de la ciudad', 'La Presa'),
  ('SANCHEZ_TABOADA', 'Estación Sánchez Taboada', 'ESTACION', 'Sur de Tijuana', 'Sánchez Taboada')
on conflict (clave_estacion) do nothing;

insert into public.cat_puestos (codigo_oficialia, nombre_puesto, rango_jerarquico)
values
  (1, 'Jefe de estación', 'Mando'),
  (2, 'Bombero', 'Operativo'),
  (3, 'Operador', 'Operativo'),
  (4, 'Paramédico', 'Operativo'),
  (5, 'Administrativo', 'Administrativo')
on conflict (codigo_oficialia) do nothing;

insert into public.cat_turnos (clave_turno, nombre_turno, horario_descripcion)
values
  ('A', 'Turno A', 'Turno A'),
  ('B', 'Turno B', 'Turno B'),
  ('C', 'Turno C', 'Turno C'),
  ('ADM', 'Administrativo', 'Horario administrativo')
on conflict (clave_turno) do nothing;

insert into public.unidades (numero_economico, tipo_vehiculo, estacion_id)
select unidad.numero, unidad.tipo, estacion.id
from (
  values
    ('Mando 01', 'Mando', 'CENTRAL'),
    ('Bomba 01', 'Bomba', 'CENTRAL'),
    ('Bomba 12', 'Bomba', 'OTAY'),
    ('Ambulancia 07', 'Ambulancia', 'PLAYAS'),
    ('Bomba 18', 'Bomba', 'LA_PRESA'),
    ('Rescate 03', 'Rescate', 'SANCHEZ_TABOADA')
) as unidad(numero, tipo, clave)
join public.cat_estaciones_areas estacion on estacion.clave_estacion = unidad.clave
on conflict (numero_economico) do nothing;
