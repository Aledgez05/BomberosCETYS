import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Building2, ClipboardList, Eye, Home, Pencil, Plus, Search, Settings, Users } from 'lucide-react'
import Login from './pages/Login'
import RequireAuth from './components/RequireAuth'
import { useAuth } from './context/AuthContext'
import { usePermissions } from './hooks/usePermissions'
import {
  STATUS_OPTIONS,
  createAccount,
  fetchCatalogs,
  fetchDirectory,
  fetchProfiles,
  roleLabel,
  saveDirectoryEmployee,
  updateProfile,
} from './lib/hrRepository'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<RequireAuth><HRWorkspace /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  )
}

function HRWorkspace() {
  const { supabase, profile, signOut } = useAuth()
  const { can } = usePermissions()
  const location = useLocation()
  const [employees, setEmployees] = useState([])
  const [catalogs, setCatalogs] = useState({ stations: [], puestos: [], turnos: [], unidades: [] })
  const [profiles, setProfiles] = useState([])
  const [search, setSearch] = useState('')
  const [stationFilter, setStationFilter] = useState('')
  const [shiftFilter, setShiftFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dialog, setDialog] = useState(null)
  const [ready, setReady] = useState(false)
  const [dataError, setDataError] = useState('')

  const reload = useCallback(async () => {
    const [directory, nextCatalogs, people] = await Promise.all([
      fetchDirectory(supabase),
      fetchCatalogs(supabase),
      can('users.read') ? fetchProfiles(supabase) : Promise.resolve([]),
    ])
    setEmployees(directory)
    setCatalogs(nextCatalogs)
    setProfiles(people)
  }, [supabase, can])

  useEffect(() => {
    let active = true
    setReady(false)
    reload()
      .then(() => {
        if (active) setDataError('')
      })
      .catch((cause) => {
        if (active) setDataError(cause.message || 'No se pudo cargar la información.')
      })
      .finally(() => {
        if (active) setReady(true)
      })
    return () => {
      active = false
    }
  }, [reload])

  const pageTitles = {
    '/dashboard': 'Inicio',
    '/employees': 'Empleados',
    '/stations': 'Estaciones',
    '/reports': 'Reportes',
    '/settings': 'Configuración',
  }
  const pageTitle = pageTitles[location.pathname] ?? 'Inicio'
  const canWrite = can('employees.write')

  const filteredEmployees = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase('es-MX')
    return employees.filter((employee) => {
      const matchesSearch = !normalized || `${employee.fullName} ${employee.numeroEmpleado}`.toLocaleLowerCase('es-MX').includes(normalized)
      return matchesSearch
        && (!stationFilter || employee.estacionId === stationFilter)
        && (!shiftFilter || employee.shift === shiftFilter)
        && (!statusFilter || employee.status === statusFilter)
    })
  }, [employees, search, stationFilter, shiftFilter, statusFilter])

  async function saveEmployee(employee) {
    try {
      await saveDirectoryEmployee(supabase, employee)
      await reload()
      setDialog(null)
      return ''
    } catch (cause) {
      return cause.message || 'No se pudo guardar el empleado.'
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">BT</div>
          <div>
            <p>Tijuana Bomberoides</p>
            <strong>Dirección de Bomberos</strong>
          </div>
        </div>
        <div className="sidebar-rule" />
        <p className="nav-caption">Administración</p>
        <nav className="primary-nav" aria-label="Navegación principal">
          <NavItem to="/dashboard" icon={Home}>Inicio</NavItem>
          <NavItem to="/employees" icon={Users}>Empleados</NavItem>
          <NavItem to="/stations" icon={Building2}>Estaciones</NavItem>
          <NavItem to="/reports" icon={ClipboardList}>Reportes</NavItem>
          <NavItem to="/settings" icon={Settings}>Configuración</NavItem>
        </nav>
        <div className="sidebar-footer">
          <span className="environment-dot" />
          <span>Supabase</span>
          <span className="sidebar-version">{roleLabel(profile?.rol)}</span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-context">
            <span>Recursos Humanos</span><span className="crumb-divider">/</span><strong>{pageTitle}</strong>
          </div>
          <div className="topbar-user"><span className="user-avatar">RH</span><span>{profile?.nombre_completo ?? 'Cuenta'}</span><button type="button" onClick={signOut}>Cerrar sesión</button></div>
        </header>

        <main className="page-content">
          {dataError && <p className="page-error" role="alert">{dataError}</p>}
          {!ready && !dataError && <p className="data-note">Cargando información compartida…</p>}
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard employees={employees} stations={catalogs.stations} canWrite={canWrite} onAdd={() => setDialog({ mode: 'add' })} />} />
            <Route path="/employees" element={(
              <EmployeesPage
                employees={filteredEmployees}
                total={employees.length}
                stations={catalogs.stations}
                turnos={catalogs.turnos}
                search={search}
                setSearch={setSearch}
                stationFilter={stationFilter}
                setStationFilter={setStationFilter}
                shiftFilter={shiftFilter}
                setShiftFilter={setShiftFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                canWrite={canWrite}
                onAdd={() => setDialog({ mode: 'add' })}
                onView={(employee) => setDialog({ mode: 'view', employee })}
                onEdit={(employee) => setDialog({ mode: 'edit', employee })}
              />
            )} />
            <Route path="/stations" element={<StationsPage employees={employees} stations={catalogs.stations} />} />
            <Route path="/reports" element={<ReportsPage employees={employees} stations={catalogs.stations} />} />
            <Route path="/settings" element={(
              <SettingsPage
                supabase={supabase}
                profile={profile}
                employees={employees.length}
                stations={catalogs.stations.length}
                profiles={profiles}
                canCreate={can('users.create')}
                canManageAdmins={can('users.manage_admins')}
                onChanged={reload}
              />
            )} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      {dialog && (
        <EmployeeDialog
          key={`${dialog.mode}-${dialog.employee?.id ?? 'new'}`}
          dialog={dialog}
          catalogs={catalogs}
          onClose={() => setDialog(null)}
          onSave={saveEmployee}
        />
      )}
    </div>
  )
}

function NavItem({ to, icon: Icon, children }) {
  return (
    <NavLink to={to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
      <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
      <span>{children}</span>
    </NavLink>
  )
}

function Dashboard({ employees, stations, canWrite, onAdd }) {
  const activeCount = employees.filter((employee) => employee.estatusActual === 'ACTIVO').length
  const pendingCount = employees.length - activeCount
  const recentEmployees = employees.slice(0, 4)

  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <p className="eyebrow">Dirección de Bomberos de Tijuana · Recursos Humanos</p>
          <h1>Resumen de Recursos Humanos</h1>
          <p className="heading-subtitle">Concentrado general de personal y asignaciones.</p>
        </div>
        <NavLink className="button button-secondary" to="/employees">Consultar empleados</NavLink>
      </div>

      <section className="stat-grid" aria-label="Estadísticas de personal">
        <StatCard label="Total empleados" value={employees.length} />
        <StatCard label="Estaciones" value={stations.length} />
        <StatCard label="Activos" value={activeCount} />
        <StatCard label="Otros estados" value={pendingCount} />
      </section>

      <section className="dashboard-lower">
        <section className="dashboard-section recent-section">
          <SectionHeading title="Altas recientes" action={<NavLink to="/employees" className="text-link">Ver directorio</NavLink>} />
          <div className="table-wrap">
            <table className="admin-table recent-table">
              <thead><tr><th>ID</th><th>Nombre</th><th>Puesto</th><th>Estación</th></tr></thead>
              <tbody>
                {recentEmployees.map((employee) => (
                  <tr key={employee.id}><td className="id-cell">{employee.numeroEmpleado}</td><td>{employee.fullName}</td><td>{employee.position}</td><td>{employee.stationName}</td></tr>
                ))}
                {!recentEmployees.length && <tr><td colSpan="4" className="table-empty">No hay registros disponibles.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <div className="dashboard-aside">
          <section className="dashboard-section">
            <SectionHeading title="Empleados por estación" action={<NavLink to="/stations" className="text-link">Ver estaciones</NavLink>} />
            <table className="admin-table station-count-table">
              <thead><tr><th>Estación</th><th className="numeric-cell">Empleados</th></tr></thead>
              <tbody>{stations.map((station) => (
                <tr key={station.id}><td>{station.nombre}</td><td className="numeric-cell">{employees.filter((employee) => employee.estacionId === station.id).length}</td></tr>
              ))}</tbody>
            </table>
          </section>
          <section className="dashboard-section pending-section">
            <SectionHeading title="Otros estados" />
            {pendingCount ? (
              <div className="pending-summary"><strong>{pendingCount}</strong><span>expediente(s) con estado distinto a activo</span><NavLink to="/employees" className="text-link">Revisar directorio</NavLink></div>
            ) : <p className="quiet-empty">Todo el personal registrado está activo.</p>}
          </section>
          {canWrite && <button className="button button-primary dashboard-add" type="button" onClick={onAdd}><Plus size={15} /> Registrar empleado</button>}
        </div>
      </section>
      <p className="data-note"><span className="note-mark">i</span> Los registros se guardan en Supabase y se comparten entre sesiones autorizadas.</p>
    </>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="stat-item"><span>{label}</span><strong>{value}</strong></div>
  )
}

function SectionHeading({ title, action }) {
  return <div className="section-heading"><h2>{title}</h2>{action}</div>
}

function EmployeesPage({ employees, total, stations, turnos, search, setSearch, stationFilter, setStationFilter, shiftFilter, setShiftFilter, statusFilter, setStatusFilter, canWrite, onAdd, onView, onEdit }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Sistema de Administración de Recursos Humanos</p>
          <h1>Empleados</h1>
          <p className="heading-subtitle">Directorio y asignación del personal operativo y administrativo.</p>
        </div>
        {canWrite && <button className="button button-primary" type="button" onClick={onAdd}><Plus size={15} /> Agregar empleado</button>}
      </div>

      <section className="employee-panel">
        <div className="table-toolbar">
          <label className="search-field">
            <Search size={15} strokeWidth={1.8} aria-hidden="true" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o número..." aria-label="Buscar por nombre o número" />
            {search && <button className="clear-search" type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">×</button>}
          </label>
          <div className="table-filters" aria-label="Filtros de empleados">
            <label><span>Estación</span><select value={stationFilter} onChange={(event) => setStationFilter(event.target.value)}><option value="">Todas</option>{stations.map((station) => <option value={station.id} key={station.id}>{station.nombre}</option>)}</select></label>
            <label><span>Turno</span><select value={shiftFilter} onChange={(event) => setShiftFilter(event.target.value)}><option value="">Todos</option>{turnos.map((turno) => <option key={turno.id} value={turno.nombre_turno}>{turno.nombre_turno}</option>)}</select></label>
            <label><span>Estado</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Todos</option>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={label}>{label}</option>)}</select></label>
          </div>
        </div>
        <div className="table-wrap">
          <table className="employee-table">
            <thead><tr><th>ID</th><th>Nombre</th><th>Puesto</th><th>Estación</th><th>Unidad</th><th>Turno</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td className="id-cell">{employee.numeroEmpleado}</td>
                  <td className="employee-name">{employee.fullName}</td>
                  <td>{employee.position}</td>
                  <td>{employee.stationName}</td>
                  <td>{employee.unit || 'Sin unidad'}</td>
                  <td>{employee.shift}</td>
                  <td><StatusLabel status={employee.status} code={employee.estatusActual} /></td>
                  <td><div className="row-actions"><button type="button" onClick={() => onView(employee)} aria-label={`Ver a ${employee.fullName}`} title="Ver detalle"><Eye size={15} /></button>{canWrite && <button type="button" onClick={() => onEdit(employee)} aria-label={`Editar a ${employee.fullName}`} title="Editar"><Pencil size={14} /></button>}</div></td>
                </tr>
              ))}
              {!employees.length && <tr><td className="table-empty" colSpan="8">No se encontraron registros con los criterios seleccionados.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="table-footnote">Mostrando {employees.length} de {total} empleados <span>·</span> Directorio de Recursos Humanos</div>
      </section>
    </>
  )
}

function StationsPage({ employees, stations }) {
  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">Catálogo operativo</p><h1>Estaciones</h1><p className="heading-subtitle">Estaciones registradas y personal asignado.</p></div>
        <span className="record-total">{stations.length} estaciones</span>
      </div>
      <div className="table-wrap directory-table-wrap">
        <table className="admin-table station-directory">
          <thead><tr><th>No.</th><th>Estación</th><th>Ubicación</th><th>Zona de cobertura</th><th className="numeric-cell">Personal asignado</th></tr></thead>
          <tbody>{stations.map((station, index) => (
            <tr key={station.id}><td className="station-code">{String(index + 1).padStart(2, '0')}</td><td className="employee-name">{station.nombre}</td><td>{station.direccion}</td><td>{station.sector}</td><td className="numeric-cell">{employees.filter((employee) => employee.estacionId === station.id).length}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <p className="data-note">La asignación de estación se administra desde el expediente del empleado.</p>
    </>
  )
}

function ReportsPage({ employees, stations }) {
  const activeEmployees = employees.filter((employee) => employee.estatusActual === 'ACTIVO').length

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">Consultas internas</p><h1>Reportes</h1><p className="heading-subtitle">Concentrados básicos del directorio de Recursos Humanos.</p></div>
      </div>
      <section className="report-summary" aria-label="Resumen de empleados">
        <div><span>Total de empleados</span><strong>{employees.length}</strong></div>
        <div><span>Activos</span><strong>{activeEmployees}</strong></div>
        <div><span>Otros estados</span><strong>{employees.length - activeEmployees}</strong></div>
      </section>
      <section className="report-section">
        <SectionHeading title="Concentrado por estación" />
        <div className="table-wrap">
          <table className="admin-table">
            <thead><tr><th>Estación</th><th className="numeric-cell">Total</th><th className="numeric-cell">Activos</th><th className="numeric-cell">Otros estados</th></tr></thead>
            <tbody>{stations.map((station) => {
              const stationEmployees = employees.filter((employee) => employee.estacionId === station.id)
              const active = stationEmployees.filter((employee) => employee.estatusActual === 'ACTIVO').length
              return <tr key={station.id}><td className="employee-name">{station.nombre}</td><td className="numeric-cell">{stationEmployees.length}</td><td className="numeric-cell">{active}</td><td className="numeric-cell">{stationEmployees.length - active}</td></tr>
            })}</tbody>
            <tfoot><tr><th>Total general</th><th className="numeric-cell">{employees.length}</th><th className="numeric-cell">{activeEmployees}</th><th className="numeric-cell">{employees.length - activeEmployees}</th></tr></tfoot>
          </table>
        </div>
      </section>
    </>
  )
}

function SettingsPage({ supabase, profile, employees, stations, profiles, canCreate, canManageAdmins, onChanged }) {
  const [form, setForm] = useState({ email: '', password: '', nombreCompleto: '', rol: 'rh_admin' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const roleChoices = canManageAdmins ? ['rh_admin', 'viewer', 'admin'] : ['rh_admin', 'viewer']

  async function handleCreate(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await createAccount(supabase, form)
      setForm({ email: '', password: '', nombreCompleto: '', rol: 'rh_admin' })
      setMessage('La cuenta quedó creada.')
      await onChanged()
    } catch (cause) {
      setError(cause.message || 'No se pudo crear la cuenta.')
    } finally {
      setBusy(false)
    }
  }

  async function changeAccount(person, changes) {
    setError('')
    setMessage('')
    try {
      await updateProfile(supabase, person.id, changes)
      await onChanged()
    } catch (cause) {
      setError(cause.message || 'No se pudo actualizar la cuenta.')
    }
  }

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">Sistema</p><h1>Configuración</h1><p className="heading-subtitle">Operación compartida y cuentas de acceso.</p></div>
      </div>
      <section className="settings-section">
        <SectionHeading title="Datos de la aplicación" />
        <dl className="settings-list">
          <div><dt>Modo de operación</dt><dd>Supabase</dd></div>
          <div><dt>Tu rol</dt><dd>{roleLabel(profile?.rol)}</dd></div>
          <div><dt>Empleados registrados</dt><dd>{employees}</dd></div>
          <div><dt>Estaciones en catálogo</dt><dd>{stations}</dd></div>
          <div><dt>Base de datos compartida</dt><dd>Conectada</dd></div>
        </dl>
      </section>
      <section className="settings-section settings-block">
        <SectionHeading title="Cuentas" />
        {error && <p className="page-error" role="alert">{error}</p>}
        {message && <p className="data-note">{message}</p>}
        <div className="settings-people">
          {profiles.map((person) => (
            <div className="people-row" key={person.id}>
              <div>
                <strong>{person.nombre_completo}</strong>
                <span>{person.username} · {person.id === profile?.id ? 'Tu cuenta' : roleLabel(person.rol)}</span>
              </div>
              {person.id === profile?.id ? <span>Sesión actual</span> : (
                <select aria-label={`Rol de ${person.nombre_completo}`} value={person.rol} onChange={(event) => changeAccount(person, { rol: event.target.value })}>
                  {roleChoices.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
                  {!roleChoices.includes(person.rol) && <option value={person.rol}>{roleLabel(person.rol)}</option>}
                </select>
              )}
              <span>{person.activo ? 'Activa' : 'Inactiva'}</span>
              {person.id !== profile?.id && (
                <button className="button button-secondary" type="button" onClick={() => changeAccount(person, { activo: !person.activo })}>
                  {person.activo ? 'Desactivar' : 'Activar'}
                </button>
              )}
            </div>
          ))}
          {!profiles.length && <p className="quiet-empty">No hay otras cuentas visibles.</p>}
        </div>
        {canCreate && (
          <form className="employee-form" onSubmit={handleCreate}>
            <label>Nombre completo<input required value={form.nombreCompleto} onChange={(event) => setForm({ ...form, nombreCompleto: event.target.value })} /></label>
            <label>Correo<input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label>Contraseña inicial<input type="password" required minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
            <label>Rol<select value={form.rol} onChange={(event) => setForm({ ...form, rol: event.target.value })}>{roleChoices.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select></label>
            <div className="dialog-actions"><button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Creando…' : 'Crear cuenta'}</button></div>
          </form>
        )}
      </section>
    </>
  )
}

function StatusLabel({ status, code }) {
  const statusClass = code === 'ACTIVO' ? 'active' : code === 'LICENCIA' || code === 'PERMISO' || code === 'VACACIONES' ? 'leave' : 'inactive'
  return <span className={`status-indicator status-${statusClass}`}><span aria-hidden="true" />{status}</span>
}

function EmployeeDialog({ dialog, catalogs, onClose, onSave }) {
  const isView = dialog.mode === 'view'
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const employee = dialog.employee
  const puestoMatch = catalogs.puestos.find((puesto) => puesto.nombre_puesto === employee?.position)
  const [form, setForm] = useState(employee ? {
    id: employee.id,
    numeroEmpleado: String(employee.numeroEmpleado ?? ''),
    nombres: employee.nombres ?? '',
    apellidoPaterno: employee.apellidoPaterno ?? '',
    apellidoMaterno: employee.apellidoMaterno ?? '',
    rfc: employee.rfc ?? '',
    curp: employee.curp ?? '',
    fechaAlta: employee.fechaAlta ?? '',
    estatusActual: employee.estatusActual ?? 'ACTIVO',
    puestoId: puestoMatch?.id ?? catalogs.puestos[0]?.id ?? '',
    estacionId: employee.estacionId || catalogs.stations[0]?.id || '',
    turnoId: employee.turnoId || catalogs.turnos[0]?.id || '',
    unidadId: employee.unidadId || '',
    unidadNueva: '',
  } : {
    numeroEmpleado: '',
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    rfc: '',
    curp: '',
    fechaAlta: '',
    estatusActual: 'ACTIVO',
    puestoId: catalogs.puestos[0]?.id ?? '',
    estacionId: catalogs.stations[0]?.id ?? '',
    turnoId: catalogs.turnos[0]?.id ?? '',
    unidadId: '',
    unidadNueva: '',
  })
  const title = isView ? 'Expediente de personal' : dialog.mode === 'edit' ? 'Editar personal' : 'Registrar personal'
  const units = catalogs.unidades.filter((unit) => !form.estacionId || unit.estacion_id === form.estacionId)

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setFormError('')
    const message = await onSave({
      ...form,
      numeroEmpleado: form.numeroEmpleado.trim(),
      nombres: form.nombres.trim(),
      apellidoPaterno: form.apellidoPaterno.trim(),
      apellidoMaterno: form.apellidoMaterno.trim(),
      rfc: form.rfc.trim(),
      curp: form.curp.trim(),
    })
    if (message) setFormError(message)
    setBusy(false)
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <section className="employee-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="dialog-heading"><div><p className="eyebrow">Recursos Humanos</p><h2 id="dialog-title">{title}</h2></div><button className="dialog-close" type="button" onClick={onClose} aria-label="Cerrar">×</button></div>
        {isView ? (
          <>
            <div className="detail-identity"><span className="detail-avatar">{initials(form.nombres + ' ' + form.apellidoPaterno)}</span><div><h3>{employee.fullName}</h3><span>{employee.numeroEmpleado}</span></div><span className={`status-pill ${employee.estatusActual === 'ACTIVO' ? 'status-active' : 'status-leave'}`}>{employee.status}</span></div>
            <dl className="detail-grid">
              <Detail label="Puesto" value={employee.position} /><Detail label="Estación" value={employee.stationName} />
              <Detail label="Unidad" value={employee.unit} /><Detail label="Turno" value={employee.shift} />
              <Detail label="RFC" value={employee.rfc} /><Detail label="CURP" value={employee.curp} />
              <Detail label="Fecha de alta" value={employee.fechaAlta} />
            </dl>
            <div className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cerrar</button></div>
          </>
        ) : (
          <form className="employee-form" onSubmit={submit}>
            <label>Número de empleado<input required inputMode="numeric" value={form.numeroEmpleado} onChange={(event) => update('numeroEmpleado', event.target.value)} /></label>
            <label>Fecha de alta<input required type="date" value={form.fechaAlta} onChange={(event) => update('fechaAlta', event.target.value)} /></label>
            <label>Nombres<input required value={form.nombres} onChange={(event) => update('nombres', event.target.value)} /></label>
            <label>Apellido paterno<input required value={form.apellidoPaterno} onChange={(event) => update('apellidoPaterno', event.target.value)} /></label>
            <label>Apellido materno<input value={form.apellidoMaterno} onChange={(event) => update('apellidoMaterno', event.target.value)} /></label>
            <label>Estado<select value={form.estatusActual} onChange={(event) => update('estatusActual', event.target.value)}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>RFC<input required minLength={12} maxLength={13} value={form.rfc} onChange={(event) => update('rfc', event.target.value.toUpperCase())} /></label>
            <label>CURP<input required minLength={18} maxLength={18} value={form.curp} onChange={(event) => update('curp', event.target.value.toUpperCase())} /></label>
            <label>Puesto<select required value={form.puestoId} onChange={(event) => update('puestoId', event.target.value)}>{catalogs.puestos.map((puesto) => <option key={puesto.id} value={puesto.id}>{puesto.nombre_puesto}</option>)}</select></label>
            <label>Estación<select required value={form.estacionId} onChange={(event) => update('estacionId', event.target.value)}>{catalogs.stations.map((station) => <option key={station.id} value={station.id}>{station.nombre}</option>)}</select></label>
            <label>Turno<select required value={form.turnoId} onChange={(event) => update('turnoId', event.target.value)}>{catalogs.turnos.map((turno) => <option key={turno.id} value={turno.id}>{turno.nombre_turno}</option>)}</select></label>
            <label>Unidad<select value={form.unidadId} onChange={(event) => update('unidadId', event.target.value)}><option value="">Sin unidad</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.numero_economico}</option>)}</select></label>
            <label>Nueva unidad<input value={form.unidadNueva} onChange={(event) => update('unidadNueva', event.target.value)} placeholder="Opcional, por ejemplo Bomba 08" /></label>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <div className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose} disabled={busy}>Cancelar</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar registro'}</button></div>
          </form>
        )}
      </section>
    </div>
  )
}

function Detail({ label, value }) {
  return <div><dt>{label}</dt><dd>{value || 'Sin información'}</dd></div>
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('es-MX')
}
