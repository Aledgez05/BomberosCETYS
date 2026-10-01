import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Building2, ClipboardList, Eye, Home, Pencil, Plus, Search, Settings, Users } from 'lucide-react'
import { demoEmployees, stationName, stations } from './lib/demoData'

const STORAGE_KEY = 'bomberos-tijuana-hr-employees-v1'

function readEmployees() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : demoEmployees
  } catch {
    return demoEmployees
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <HRWorkspace />
    </BrowserRouter>
  )
}

function HRWorkspace() {
  const location = useLocation()
  const [employees, setEmployees] = useState(readEmployees)
  const [search, setSearch] = useState('')
  const [stationFilter, setStationFilter] = useState('')
  const [shiftFilter, setShiftFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dialog, setDialog] = useState(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees))
  }, [employees])

  const pageTitles = {
    '/dashboard': 'Inicio',
    '/employees': 'Empleados',
    '/stations': 'Estaciones',
    '/reports': 'Reportes',
    '/settings': 'Configuración',
  }
  const pageTitle = pageTitles[location.pathname] ?? 'Inicio'

  const filteredEmployees = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase('es-MX')
    return employees.filter((employee) => {
      const matchesSearch = !normalized || `${employee.fullName} ${employee.id}`.toLocaleLowerCase('es-MX').includes(normalized)
      return matchesSearch
        && (!stationFilter || employee.station === stationFilter)
        && (!shiftFilter || employee.shift === shiftFilter)
        && (!statusFilter || employee.status === statusFilter)
    })
  }, [employees, search, stationFilter, shiftFilter, statusFilter])

  function saveEmployee(employee) {
    const isEdit = dialog?.mode === 'edit'
    const duplicateId = employees.some((item) => item.id === employee.id && (!isEdit || item.id !== dialog.employee.id))
    if (duplicateId) return false

    setEmployees((current) => {
      return isEdit
        ? current.map((item) => item.id === dialog.employee.id ? employee : item)
        : [employee, ...current]
    })
    setDialog(null)
    return true
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
          <span>Prototipo local</span>
          <span className="sidebar-version">MVP · 2026</span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="topbar-context">
            <span>Recursos Humanos</span><span className="crumb-divider">/</span><strong>{pageTitle}</strong>
          </div>
          <div className="topbar-user"><span className="user-avatar">RH</span><span>Administración</span></div>
        </header>

        <main className="page-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard employees={employees} onAdd={() => setDialog({ mode: 'add' })} />} />
            <Route path="/employees" element={(
              <EmployeesPage
                employees={filteredEmployees}
                total={employees.length}
                search={search}
                setSearch={setSearch}
                stationFilter={stationFilter}
                setStationFilter={setStationFilter}
                shiftFilter={shiftFilter}
                setShiftFilter={setShiftFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                onAdd={() => setDialog({ mode: 'add' })}
                onView={(employee) => setDialog({ mode: 'view', employee })}
                onEdit={(employee) => setDialog({ mode: 'edit', employee })}
              />
            )} />
            <Route path="/stations" element={<StationsPage employees={employees} />} />
            <Route path="/reports" element={<ReportsPage employees={employees} />} />
            <Route path="/settings" element={<SettingsPage employees={employees.length} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      {dialog && (
        <EmployeeDialog
          key={`${dialog.mode}-${dialog.employee?.id ?? 'new'}`}
          dialog={dialog}
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

function Dashboard({ employees, onAdd }) {
  const activeCount = employees.filter((employee) => employee.status === 'Activo').length
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
        <StatCard label="Pendientes" value={pendingCount} />
      </section>

      <section className="dashboard-lower">
        <section className="dashboard-section recent-section">
          <SectionHeading title="Altas recientes" action={<NavLink to="/employees" className="text-link">Ver directorio</NavLink>} />
          <div className="table-wrap">
            <table className="admin-table recent-table">
              <thead><tr><th>ID</th><th>Nombre</th><th>Puesto</th><th>Estación</th></tr></thead>
              <tbody>
            {recentEmployees.map((employee) => (
                  <tr key={employee.id}><td className="id-cell">{employee.id}</td><td>{employee.fullName}</td><td>{employee.position}</td><td>{stationName(employee.station)}</td></tr>
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
                <tr key={station.id}><td>{station.name}</td><td className="numeric-cell">{employees.filter((employee) => employee.station === station.id).length}</td></tr>
              ))}</tbody>
            </table>
          </section>
          <section className="dashboard-section pending-section">
            <SectionHeading title="Acciones pendientes" />
            {pendingCount ? (
              <div className="pending-summary"><strong>{pendingCount}</strong><span>expediente(s) con estado distinto a activo</span><NavLink to="/employees" className="text-link">Revisar directorio</NavLink></div>
            ) : <p className="quiet-empty">No hay acciones pendientes registradas.</p>}
          </section>
          <button className="button button-primary dashboard-add" type="button" onClick={onAdd}><Plus size={15} /> Registrar empleado</button>
        </div>
      </section>
      <p className="data-note"><span className="note-mark">i</span> Datos de demostración guardados únicamente en este navegador.</p>
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

function EmployeesPage({ employees, total, search, setSearch, stationFilter, setStationFilter, shiftFilter, setShiftFilter, statusFilter, setStatusFilter, onAdd, onView, onEdit }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Sistema de Administración de Recursos Humanos</p>
          <h1>Empleados</h1>
          <p className="heading-subtitle">Directorio y asignación del personal operativo y administrativo.</p>
        </div>
        <button className="button button-primary" type="button" onClick={onAdd}><Plus size={15} /> Agregar empleado</button>
      </div>

      <section className="employee-panel">
        <div className="table-toolbar">
          <label className="search-field">
            <Search size={15} strokeWidth={1.8} aria-hidden="true" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o ID..." aria-label="Buscar por nombre o ID" />
            {search && <button className="clear-search" type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">×</button>}
          </label>
          <div className="table-filters" aria-label="Filtros de empleados">
            <label><span>Estación</span><select value={stationFilter} onChange={(event) => setStationFilter(event.target.value)}><option value="">Todas</option>{stations.map((station) => <option value={station.id} key={station.id}>{station.name}</option>)}</select></label>
            <label><span>Turno</span><select value={shiftFilter} onChange={(event) => setShiftFilter(event.target.value)}><option value="">Todos</option>{['A', 'B', 'C', 'Administrativo'].map((shift) => <option key={shift}>{shift}</option>)}</select></label>
            <label><span>Estado</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Todos</option>{['Activo', 'Licencia', 'Inactivo'].map((status) => <option key={status}>{status}</option>)}</select></label>
          </div>
        </div>
        <div className="table-wrap">
          <table className="employee-table">
            <thead><tr><th>ID</th><th>Nombre</th><th>Puesto</th><th>Estación</th><th>Unidad</th><th>Turno</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td className="id-cell">{employee.id}</td>
                  <td className="employee-name">{employee.fullName}</td>
                  <td>{employee.position}</td>
                  <td>{stationName(employee.station)}</td>
                  <td>{employee.unit}</td>
                  <td>{employee.shift}</td>
                  <td><StatusLabel status={employee.status} /></td>
                  <td><div className="row-actions"><button type="button" onClick={() => onView(employee)} aria-label={`Ver a ${employee.fullName}`} title="Ver detalle"><Eye size={15} /></button><button type="button" onClick={() => onEdit(employee)} aria-label={`Editar a ${employee.fullName}`} title="Editar"><Pencil size={14} /></button></div></td>
                </tr>
              ))}
              {!employees.length && <tr><td className="table-empty" colSpan="8">No se encontraron registros con los criterios seleccionados.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="table-footnote">Mostrando {employees.length} de {total} empleados <span>·</span> Directorio de Recursos Humanos</div>
      </section>
      <p className="data-note">Los cambios se guardan localmente en este navegador.</p>
    </>
  )
}

function StationsPage({ employees }) {
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
            <tr key={station.id}><td className="station-code">{String(index + 1).padStart(2, '0')}</td><td className="employee-name">{station.name}</td><td>{station.address}</td><td>{station.coverage}</td><td className="numeric-cell">{employees.filter((employee) => employee.station === station.id).length}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <p className="data-note">La asignación de estación se administra desde el expediente del empleado.</p>
    </>
  )
}

function ReportsPage({ employees }) {
  const activeEmployees = employees.filter((employee) => employee.status === 'Activo').length

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
              const stationEmployees = employees.filter((employee) => employee.station === station.id)
              const active = stationEmployees.filter((employee) => employee.status === 'Activo').length
              return <tr key={station.id}><td className="employee-name">{station.name}</td><td className="numeric-cell">{stationEmployees.length}</td><td className="numeric-cell">{active}</td><td className="numeric-cell">{stationEmployees.length - active}</td></tr>
            })}</tbody>
            <tfoot><tr><th>Total general</th><th className="numeric-cell">{employees.length}</th><th className="numeric-cell">{activeEmployees}</th><th className="numeric-cell">{employees.length - activeEmployees}</th></tr></tfoot>
          </table>
        </div>
        <p className="data-note">Cifras calculadas a partir de los registros disponibles en este navegador.</p>
      </section>
    </>
  )
}

function SettingsPage({ employees }) {
  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">Sistema</p><h1>Configuración</h1><p className="heading-subtitle">Información de operación del prototipo.</p></div>
      </div>
      <section className="settings-section">
        <SectionHeading title="Datos de la aplicación" />
        <dl className="settings-list">
          <div><dt>Modo de operación</dt><dd>Demostración local</dd></div>
          <div><dt>Almacenamiento</dt><dd>Este navegador</dd></div>
          <div><dt>Empleados registrados</dt><dd>{employees}</dd></div>
          <div><dt>Estaciones en catálogo</dt><dd>{stations.length}</dd></div>
          <div><dt>Base de datos compartida</dt><dd>No conectada</dd></div>
        </dl>
        <p className="data-note">Esta versión no incluye autenticación, permisos ni sincronización entre equipos.</p>
      </section>
    </>
  )
}

function StatusLabel({ status }) {
  const statusClass = status === 'Activo' ? 'active' : status === 'Licencia' ? 'leave' : 'inactive'
  return <span className={`status-indicator status-${statusClass}`}><span aria-hidden="true" />{status}</span>
}

function EmployeeDialog({ dialog, onClose, onSave }) {
  const isView = dialog.mode === 'view'
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState(dialog.employee ?? {
    id: '', fullName: '', position: '', station: stations[0].id, unit: '', shift: 'A', status: 'Activo',
  })
  const title = isView ? 'Expediente de personal' : dialog.mode === 'edit' ? 'Editar personal' : 'Registrar personal'

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function submit(event) {
    event.preventDefault()
    const saved = onSave({ ...form, id: form.id.trim(), fullName: form.fullName.trim() })
    setFormError(saved ? '' : 'Este ID de empleado ya está registrado.')
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="employee-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="dialog-heading"><div><p className="eyebrow">Recursos Humanos</p><h2 id="dialog-title">{title}</h2></div><button className="dialog-close" type="button" onClick={onClose} aria-label="Cerrar">×</button></div>
        {isView ? (
          <>
            <div className="detail-identity"><span className="detail-avatar">{initials(form.fullName)}</span><div><h3>{form.fullName}</h3><span>{form.id}</span></div><span className={`status-pill ${form.status === 'Activo' ? 'status-active' : 'status-leave'}`}>{form.status}</span></div>
            <dl className="detail-grid">
              <Detail label="Puesto" value={form.position} /><Detail label="Estación" value={stationName(form.station)} />
              <Detail label="Unidad" value={form.unit} /><Detail label="Turno" value={form.shift} />
            </dl>
            <div className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cerrar</button></div>
          </>
        ) : (
          <form className="employee-form" onSubmit={submit}>
            <label>ID de empleado<input required value={form.id} onChange={(event) => update('id', event.target.value)} placeholder="Ej. BT-1402" /></label>
            <label>Nombre completo<input required value={form.fullName} onChange={(event) => update('fullName', event.target.value)} placeholder="Nombre y apellidos" /></label>
            <label>Puesto / cargo<input required value={form.position} onChange={(event) => update('position', event.target.value)} placeholder="Ej. Bombero" /></label>
            <label>Estación<select value={form.station} onChange={(event) => update('station', event.target.value)}>{stations.map((station) => <option value={station.id} key={station.id}>{station.name}</option>)}</select></label>
            <label>Unidad<input required value={form.unit} onChange={(event) => update('unit', event.target.value)} placeholder="Ej. Bomba 08" /></label>
            <label>Turno<select value={form.shift} onChange={(event) => update('shift', event.target.value)}>{['A', 'B', 'C', 'Administrativo'].map((shift) => <option key={shift}>{shift}</option>)}</select></label>
            <label>Estado<select value={form.status} onChange={(event) => update('status', event.target.value)}>{['Activo', 'Licencia', 'Inactivo'].map((status) => <option key={status}>{status}</option>)}</select></label>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <div className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancelar</button><button className="button button-primary" type="submit">Guardar registro</button></div>
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