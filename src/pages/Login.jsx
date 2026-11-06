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
      setError(cause?.message || 'No se pudo iniciar sesión.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-label="Acceso al sistema">
        <div className="login-brand">
          <img src="/logoayu.png" alt="XXV Ayuntamiento de Tijuana" className="login-logo" />
          <div>
            <p className="eyebrow">Dirección de Bomberos Tijuana</p>
            <h1>Recursos Humanos</h1>
            <p className="login-lead">Ingresa con tu cuenta institucional para continuar.</p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {!isSupabaseConfigured && (
            <p className="notice" role="alert">Configura Supabase en .env.local antes de iniciar sesión.</p>
          )}
          <label>
            Correo institucional
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="correo@tijuana.gob.mx"
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </label>
          {error && <p className="notice" role="alert">{error}</p>}
          <div className="login-actions">
            <button
              type="submit"
              className="button button-primary login-submit"
              disabled={busy || !isSupabaseConfigured}
            >
              {busy ? 'Verificando…' : 'Iniciar sesión'}
            </button>
            <button
              type="button"
              className="button button-secondary"
              disabled={busy}
              onClick={() => {
                setEmail('')
                setPassword('')
                setError('')
              }}
            >
              Limpiar
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
