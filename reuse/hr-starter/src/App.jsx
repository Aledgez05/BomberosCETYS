import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import RequireAuth from './components/RequireAuth'
import Login from './pages/Login'
import { usePermissions } from './hooks/usePermissions'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<RequireAuth><Workspace /></RequireAuth>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

function Workspace() {
  const { user, signOut } = useAuth()
  const { roleKey, can } = usePermissions()

  return (
    <div className="app-shell">
      <header className="topbar">
        <strong>Dirección de Bomberos Tijuana · Recursos Humanos</strong>
        <button type="button" onClick={() => void signOut()}>Cerrar sesión</button>
      </header>
      <main className="page-content">
        <p className="eyebrow">Base de aplicación</p>
        <h1>Gestión de Recursos Humanos</h1>
        <p>Sesión: {user?.email ?? '—'} · Rol asignado: {roleKey ?? 'sin rol'}</p>
        <div className="starter-note">
          <strong>Starter scaffold</strong>
          <p>Agregue el directorio de empleados y módulos de historial después de aprobar el modelo de datos y la matriz de acceso.</p>
        </div>
        <p>Permission placeholder check: <code>employees.read</code> = {String(can('employees.read'))}</p>
        <p><Link to="/login">Volver a acceso</Link></p>
      </main>
    </div>
  )
}
