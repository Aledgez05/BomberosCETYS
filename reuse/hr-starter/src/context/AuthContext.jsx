import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { getSupabaseClient } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const supabase = useMemo(() => getSupabaseClient(), [])
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }

    let active = true
    const applySession = (nextSession) => {
      setSession(nextSession)
      setProfileLoading(Boolean(nextSession?.user?.id))
      setProfileError(null)
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setProfileError(error.message)
      applySession(data.session)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) applySession(nextSession)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    let active = true
    setProfile(null)
    setProfileError(null)

    if (!supabase || !session?.user?.id) {
      setProfileLoading(false)
      return undefined
    }

    setProfileLoading(true)

    supabase
      .from('profiles')
      .select('user_id, display_name, role_key')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) setProfileError(error.message)
        else if (!data) setProfileError('No application profile is assigned to this account.')
        else setProfile(data)
        setProfileLoading(false)
      })

    return () => {
      active = false
    }
  }, [supabase, session?.user?.id])

  const signIn = useCallback(async (email, password) => {
    if (!supabase) return { error: new Error('Supabase is not configured.') }
    return supabase.auth.signInWithPassword({ email, password })
  }, [supabase])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setProfile(null)
  }, [supabase])

  const value = useMemo(() => ({
    supabase,
    session,
    user: session?.user ?? null,
    profile,
    loading,
    profileLoading,
    profileError,
    signIn,
    signOut,
  }), [supabase, session, profile, loading, profileLoading, profileError, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider.')
  return value
}
