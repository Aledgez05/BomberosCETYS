import { useMemo, useState } from 'react'
import { BarChart3, Download, PieChart, Printer } from 'lucide-react'
import { STATUS_OPTIONS, statusLabel } from '../lib/hrRepository'

const CHART_COLORS = {
  ACTIVO: '#617a68',
  LICENCIA: '#a37d4d',
  PERMISO: '#8b6b45',
  VACACIONES: '#7a8f9c',
  LESIONADO_INCAPACIDAD: '#c47a3a',
  COMISIONADO: '#6b7c8f',
  SUSPENDIDO: '#9a6b6b',
  BAJA: '#a0444a',
  JUBILADO: '#89837c',
  OTRO: '#9b948b',
}

function countBy(items, keyFn) {
  const map = new Map()
  for (const item of items) {
    const key = keyFn(item) || 'Sin dato'
    map.set(key, (map.get(key) || 0) + 1)
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function toCsv(rows) {
  const headers = ['ID', 'Nombre', 'Puesto', 'Estación', 'Unidad', 'Turno', 'Estado']
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const lines = [
    headers.join(','),
    ...rows.map((row) => [
      row.numeroEmpleado,
      row.fullName,
      row.position,
      row.stationName,
      row.unit || 'Sin unidad',
      row.shift || 'Sin turno',
      row.status,
    ].map(escape).join(',')),
  ]
  return lines.join('\n')
}

function downloadCsv(filename, content) {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function BarChart({ series, maxBars = 8 }) {
  const data = series.slice(0, maxBars)
  const max = Math.max(...data.map((item) => item.value), 1)

  return (
    <div className="chart-bars" role="img" aria-label="Gráfica de barras">
      {data.map((item) => (
        <div key={item.label} className="chart-bar-row">
          <div className="chart-bar-label" title={item.label}>{item.label}</div>
          <div className="chart-bar-track">
            <span
              style={{
                width: `${(item.value / max) * 100}%`,
                background: item.color || '#691c32',
              }}
            />
          </div>
          <strong className="chart-bar-value">{item.value}</strong>
        </div>
      ))}
      {!data.length && <p className="quiet-empty">Sin datos para graficar.</p>}
    </div>
  )
}

function DonutChart({ series }) {
  const total = series.reduce((sum, item) => sum + item.value, 0) || 1
  const size = 180
  const stroke = 28
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Gráfica de pastel">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eee9e1" strokeWidth={stroke} />
        {series.map((item) => {
          const length = (item.value / total) * circumference
          const dash = `${length} ${circumference - length}`
          const el = (
            <circle
              key={item.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color || '#691c32'}
              strokeWidth={stroke}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          )
          offset += length
          return el
        })}
        <text x="50%" y="48%" textAnchor="middle" className="donut-total">{total}</text>
        <text x="50%" y="58%" textAnchor="middle" className="donut-caption">total</text>
      </svg>
      <ul className="donut-legend">
        {series.map((item) => (
          <li key={item.label}>
            <span style={{ background: item.color || '#691c32' }} />
            <em>{item.label}</em>
            <strong>{item.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Reports({ employees, stations, turnos = [] }) {
  const [stationFilter, setStationFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [shiftFilter, setShiftFilter] = useState('')
  const [groupBy, setGroupBy] = useState('estatus')
  const [viewMode, setViewMode] = useState('ambos')

  const filtered = useMemo(() => employees.filter((employee) => (
    (!stationFilter || employee.estacionId === stationFilter)
    && (!statusFilter || employee.status === statusFilter)
    && (!shiftFilter || employee.shift === shiftFilter)
  )), [employees, stationFilter, statusFilter, shiftFilter])

  const activeCount = filtered.filter((employee) => employee.estatusActual === 'ACTIVO').length
  const leaveCount = filtered.filter((employee) => ['LICENCIA', 'PERMISO', 'VACACIONES', 'LESIONADO_INCAPACIDAD'].includes(employee.estatusActual)).length
  const outCount = filtered.filter((employee) => ['BAJA', 'JUBILADO', 'SUSPENDIDO'].includes(employee.estatusActual)).length

  const statusSeries = useMemo(() => countBy(filtered, (employee) => employee.status).map((item) => {
    const code = STATUS_OPTIONS.find(([, label]) => label === item.label)?.[0]
    return { ...item, color: CHART_COLORS[code] || CHART_COLORS.OTRO }
  }), [filtered])

  const stationSeries = useMemo(() => countBy(filtered, (employee) => employee.stationName).map((item, index) => ({
    ...item,
    color: `hsl(${(index * 37) % 360} 32% 42%)`,
  })), [filtered])

  const shiftSeries = useMemo(() => countBy(filtered, (employee) => employee.shift || 'Sin turno').map((item, index) => ({
    ...item,
    color: `hsl(${210 + index * 28} 28% 45%)`,
  })), [filtered])

  const chartSeries = groupBy === 'estacion' ? stationSeries : groupBy === 'turno' ? shiftSeries : statusSeries

  const stationRows = useMemo(() => stations.map((station) => {
    const stationEmployees = filtered.filter((employee) => employee.estacionId === station.id)
    const active = stationEmployees.filter((employee) => employee.estatusActual === 'ACTIVO').length
    return {
      id: station.id,
      nombre: station.nombre,
      total: stationEmployees.length,
      activos: active,
      otros: stationEmployees.length - active,
    }
  }).filter((row) => !stationFilter || row.id === stationFilter), [stations, filtered, stationFilter])

  function exportDetail() {
    downloadCsv(`reporte-personal-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(filtered))
  }

  function exportStations() {
    const headers = ['Estación', 'Total', 'Activos', 'Otros estados']
    const lines = [
      headers.join(','),
      ...stationRows.map((row) => [row.nombre, row.total, row.activos, row.otros].map((value) => `"${value}"`).join(',')),
    ]
    downloadCsv(`reporte-estaciones-${new Date().toISOString().slice(0, 10)}.csv`, lines.join('\n'))
  }

  function clearFilters() {
    setStationFilter('')
    setStatusFilter('')
    setShiftFilter('')
  }

  return (
    <div className="reports-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Consultas internas</p>
          <h1>Gráficas y reportes</h1>
          <p className="heading-subtitle">Resumen visual del personal · filtra, revisa y descarga el concentrado.</p>
        </div>
        <div className="report-heading-actions">
          <button type="button" className="button button-secondary" onClick={() => window.print()}>
            <Printer size={14} /> Imprimir
          </button>
          <button type="button" className="button button-primary" onClick={exportDetail}>
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      <section className="report-filters" aria-label="Filtros del reporte">
        <label>
          <span>Estación</span>
          <select value={stationFilter} onChange={(event) => setStationFilter(event.target.value)}>
            <option value="">General (todas)</option>
            {stations.map((station) => (
              <option key={station.id} value={station.id}>{station.nombre}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Estatus</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">General (todos)</option>
            {STATUS_OPTIONS.map(([code, label]) => (
              <option key={code} value={label}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Turno</span>
          <select value={shiftFilter} onChange={(event) => setShiftFilter(event.target.value)}>
            <option value="">General (todos)</option>
            {turnos.map((turno) => (
              <option key={turno.id} value={turno.nombre_turno}>{turno.nombre_turno}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Agrupar gráfica</span>
          <select value={groupBy} onChange={(event) => setGroupBy(event.target.value)}>
            <option value="estatus">Por estatus</option>
            <option value="estacion">Por estación</option>
            <option value="turno">Por turno</option>
          </select>
        </label>
        <label>
          <span>Vista</span>
          <select value={viewMode} onChange={(event) => setViewMode(event.target.value)}>
            <option value="ambos">Barras y pastel</option>
            <option value="barras">Solo barras</option>
            <option value="pastel">Solo pastel</option>
          </select>
        </label>
        <button type="button" className="button button-secondary report-clear" onClick={clearFilters}>
          Limpiar filtros
        </button>
      </section>

      <section className="report-kpi-grid" aria-label="Indicadores">
        <article className="report-kpi">
          <span>Personal filtrado</span>
          <strong>{filtered.length}</strong>
          <em>de {employees.length} registrados</em>
        </article>
        <article className="report-kpi report-kpi-green">
          <span>Activos</span>
          <strong>{activeCount}</strong>
          <em>{statusLabel('ACTIVO')}</em>
        </article>
        <article className="report-kpi report-kpi-amber">
          <span>Licencia / permiso</span>
          <strong>{leaveCount}</strong>
          <em>Temporal fuera de línea</em>
        </article>
        <article className="report-kpi report-kpi-red">
          <span>Baja / fuera</span>
          <strong>{outCount}</strong>
          <em>Baja, jubilado o suspendido</em>
        </article>
      </section>

      <section className="report-charts" aria-label="Gráficas">
        {(viewMode === 'ambos' || viewMode === 'barras') && (
          <article className="report-chart-card">
            <header>
              <BarChart3 size={16} />
              <div>
                <h2>Conteo por {groupBy === 'estacion' ? 'estación' : groupBy === 'turno' ? 'turno' : 'estatus'}</h2>
                <p>Barras · datos filtrados en vivo</p>
              </div>
            </header>
            <BarChart series={chartSeries} maxBars={groupBy === 'estacion' ? 12 : 9} />
          </article>
        )}
        {(viewMode === 'ambos' || viewMode === 'pastel') && (
          <article className="report-chart-card">
            <header>
              <PieChart size={16} />
              <div>
                <h2>Distribución</h2>
                <p>Pastel · proporción del filtro actual</p>
              </div>
            </header>
            <DonutChart series={chartSeries.slice(0, 8)} />
          </article>
        )}
      </section>

      <section className="report-section report-block">
        <div className="section-heading">
          <h2>Concentrado por estación</h2>
          <button type="button" className="text-link" onClick={exportStations}>Descargar estaciones CSV</button>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Estación</th>
                <th className="numeric-cell">Total</th>
                <th className="numeric-cell">Activos</th>
                <th className="numeric-cell">Otros estados</th>
              </tr>
            </thead>
            <tbody>
              {stationRows.map((row) => (
                <tr key={row.id}>
                  <td className="employee-name">{row.nombre}</td>
                  <td className="numeric-cell">{row.total}</td>
                  <td className="numeric-cell">{row.activos}</td>
                  <td className="numeric-cell">{row.otros}</td>
                </tr>
              ))}
              {!stationRows.length && (
                <tr><td colSpan={4} className="table-empty">Sin estaciones con el filtro actual.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <th>Total filtrado</th>
                <th className="numeric-cell">{filtered.length}</th>
                <th className="numeric-cell">{activeCount}</th>
                <th className="numeric-cell">{filtered.length - activeCount}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="report-section report-block">
        <div className="section-heading">
          <h2>Detalle del personal ({filtered.length})</h2>
          <button type="button" className="text-link" onClick={exportDetail}>Descargar detalle CSV</button>
        </div>
        <div className="table-wrap directory-table-wrap">
          <table className="admin-table employee-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Puesto</th>
                <th>Estación</th>
                <th>Unidad</th>
                <th>Turno</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((employee) => (
                <tr key={employee.id}>
                  <td className="id-cell">{employee.numeroEmpleado}</td>
                  <td className="employee-name">{employee.fullName}</td>
                  <td>{employee.position || '—'}</td>
                  <td>{employee.stationName}</td>
                  <td>{employee.unit || 'Sin unidad'}</td>
                  <td>{employee.shift || '—'}</td>
                  <td>{employee.status}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={7} className="table-empty">No hay personal con estos filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
