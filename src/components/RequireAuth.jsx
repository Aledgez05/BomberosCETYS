import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { roleLabel } from '../lib/hrRepository'

const OPERATIONAL_ROLES = new Set(['admin', 'rh_admin'])

export default function RequireAuth({ children }) {
  const { session, profile, loading, profileLoading, profileError, signOut } = useAuth()

  if (!isSupabaseConfigured) {
    return <Status title="Supabase no está configurado" detail="Completa .env.local con la URL y la llave pública, y reinicia la aplicación." />
  }
  if (loading) return <Status title="Cargando cuenta" detail="Revisando la sesión." />
  if (!session) return <Navigate to="/login" replace />
  if (profileLoading) return <Status title="Cargando perfil" detail="Revisando el acceso autorizado." />
  if (profileError) return <Status title="La cuenta no está lista" detail={profileError} onSignOut={signOut} />
  if (!profile) return <Status title="Sin perfil de Recursos Humanos" detail="Un administrador debe preparar esta cuenta." onSignOut={signOut} />
  if (!profile.activo || !OPERATIONAL_ROLES.has(profile.rol)) {
    return (
      <Status
        title="Cuenta sin acceso operativo"
        detail={`El rol actual es ${roleLabel(profile.rol)}. Un administrador debe activar la cuenta y asignar Administrador RH o Administrador de desarrollo.`}
        onSignOut={signOut}
      />
    )
  }

  return children
}

function Status({ title, detail, onSignOut }) {
  return (
    <main className="status-page" role="status">
      <h1>{title}</h1>
      <p>{detail}</p>
      {onSignOut && <SignOutButton onSignOut={onSignOut} />}
    </main>
  )
}

function SignOutButton({ onSignOut }) {
  const [error, setError] = useState('')

  async function handleSignOut() {
    setError('')
    try {
      await onSignOut()
    } catch (cause) {
      setError(cause?.message || 'No se pudo cerrar la sesión.')
    }
  }

  return (
    <>
      <button type="button" onClick={handleSignOut}>Cerrar sesión</button>
      {error && <p role="alert">{error}</p>}
    </>
  )
}
