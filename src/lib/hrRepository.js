export const STATUS_OPTIONS = [
  ['ACTIVO', 'Activo'],
  ['LICENCIA', 'Licencia'],
  ['PERMISO', 'Permiso'],
  ['VACACIONES', 'Vacaciones'],
  ['LESIONADO_INCAPACIDAD', 'Lesionado'],
  ['COMISIONADO', 'Comisionado'],
  ['SUSPENDIDO', 'Suspendido'],
  ['BAJA', 'Baja'],
  ['JUBILADO', 'Jubilado'],
]

const STATUS_LABELS = Object.fromEntries(STATUS_OPTIONS)

export function statusLabel(status) {
  return STATUS_LABELS[status] ?? status ?? 'Sin estado'
}

export function roleLabel(role) {
  if (role === 'admin') return 'Administrador de desarrollo'
  if (role === 'rh_admin') return 'Administrador RH'
  if (role === 'viewer') return 'Pendiente de acceso'
  return role || 'Sin rol'
}

export async function fetchCatalogs(supabase) {
  const [stations, puestos, turnos, unidades] = await Promise.all([
    supabase.from('cat_estaciones_areas').select('id, clave_estacion, nombre, direccion, sector, activa').eq('activa', true).order('nombre'),
    supabase.from('cat_puestos').select('id, nombre_puesto').order('nombre_puesto'),
    supabase.from('cat_turnos').select('id, clave_turno, nombre_turno').order('nombre_turno'),
    supabase.from('unidades').select('id, numero_economico, estacion_id').order('numero_economico'),
  ])
  const error = stations.error || puestos.error || turnos.error || unidades.error
  if (error) throw new Error(error.message)
  return {
    stations: stations.data ?? [],
    puestos: puestos.data ?? [],
    turnos: turnos.data ?? [],
    unidades: unidades.data ?? [],
  }
}

export async function fetchDirectory(supabase) {
  const { data, error } = await supabase
    .from('empleados')
    .select(`
      id,
      numero_empleado,
      nombres,
      apellido_paterno,
      apellido_materno,
      nombre_completo,
      rfc,
      curp,
      fecha_alta,
      estatus_actual,
      asignaciones_operativas (
        asignacion_activa,
        rol_en_estacion,
        estacion_id,
        turno_id,
        unidad_id,
        estacion:cat_estaciones_areas ( id, nombre, direccion, sector ),
        turno:cat_turnos ( id, nombre_turno ),
        unidad:unidades ( id, numero_economico )
      )
    `)
    .order('nombre_completo')
  if (error) throw new Error(error.message)
  return (data ?? []).map(toDirectoryEmployee)
}

function activeAssignment(row) {
  const assignments = row.asignaciones_operativas ?? []
  return assignments.find((item) => item.asignacion_activa) ?? null
}

export function toDirectoryEmployee(row) {
  const assignment = activeAssignment(row)
  return {
    id: row.id,
    numeroEmpleado: row.numero_empleado,
    fullName: row.nombre_completo,
    nombres: row.nombres,
    apellidoPaterno: row.apellido_paterno,
    apellidoMaterno: row.apellido_materno ?? '',
    rfc: row.rfc,
    curp: row.curp,
    fechaAlta: row.fecha_alta,
    estatusActual: row.estatus_actual,
    status: statusLabel(row.estatus_actual),
    position: assignment?.rol_en_estacion ?? '',
    estacionId: assignment?.estacion_id ?? '',
    stationName: assignment?.estacion?.nombre ?? 'Sin estación',
    turnoId: assignment?.turno_id ?? '',
    shift: assignment?.turno?.nombre_turno ?? '',
    unidadId: assignment?.unidad_id ?? '',
    unit: assignment?.unidad?.numero_economico ?? '',
  }
}

export async function saveDirectoryEmployee(supabase, employee) {
  const { error } = await supabase.rpc('save_directorio_empleado', {
    payload: {
      id: employee.id || null,
      numero_empleado: Number(employee.numeroEmpleado),
      nombres: employee.nombres,
      apellido_paterno: employee.apellidoPaterno,
      apellido_materno: employee.apellidoMaterno,
      rfc: employee.rfc,
      curp: employee.curp,
      fecha_alta: employee.fechaAlta,
      estatus_actual: employee.estatusActual,
      puesto_id: employee.puestoId,
      estacion_id: employee.estacionId,
      turno_id: employee.turnoId,
      unidad_id: employee.unidadId || null,
      unidad_nueva: employee.unidadNueva || null,
    },
  })
  if (error) throw new Error(error.message)
}

export async function fetchProfiles(supabase) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, nombre_completo, rol, activo')
    .order('nombre_completo')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function updateProfile(supabase, id, changes) {
  const { error } = await supabase.from('profiles').update(changes).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function createAccount(supabase, account) {
  const { data, error } = await supabase.functions.invoke('admin-create-user', {
    body: {
      email: account.email,
      password: account.password,
      nombre_completo: account.nombreCompleto,
      rol: account.rol,
    },
  })
  if (error) {
    let message = error.message
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
    } catch {
      // The function response is not JSON.
    }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return data
}
