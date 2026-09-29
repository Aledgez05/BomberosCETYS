import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabaseClient'

export default function Login() {
  const navigate = useNavigate()
  const { session, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { error: signInError } = await signIn(email.trim(), password)
      if (signInError) throw signInError
      navigate('/', { replace: true })
    } catch (cause) {
      setError(cause?.message || 'Sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <p className="eyebrow">Dirección de Bomberos Tijuana</p>
        <h1>Recursos Humanos</h1>
        {!isSupabaseConfigured && (
          <p className="notice" role="alert">Configure Supabase in .env.local before signing in.</p>
        )}
        <label>
          Correo institucional
          <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Contraseña
          <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error && <p className="notice" role="alert">{error}</p>}
        <button type="submit" disabled={busy || !isSupabaseConfigured}>
          {busy ? 'Verificando…' : 'Iniciar sesión'}
        </button>
      </form>
    </main>
  )
}
