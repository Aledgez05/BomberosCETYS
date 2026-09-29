import { Navigate } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function RequireAuth({ children }) {
  const { session, profile, loading, profileLoading, profileError } = useAuth()

  if (!isSupabaseConfigured) {
    return <Status title="Supabase is not configured" detail="Set the environment variables in .env.local and restart the app." />
  }
  if (loading) return <Status title="Loading account" detail="Checking the authenticated session." />
  if (!session) return <Navigate to="/login" replace />
  if (profileLoading) return <Status title="Loading account profile" detail="Checking approved application access." />
  if (profileError) return <Status title="Account access is not ready" detail={profileError} />
  if (!profile) return <Status title="No HR application profile" detail="Ask an authorized administrator to provision an approved account." />

  return children
}

function Status({ title, detail }) {
  return (
    <main className="status-page" role="status">
      <h1>{title}</h1>
      <p>{detail}</p>
    </main>
  )
}
