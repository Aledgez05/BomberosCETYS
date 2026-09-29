import { useAuth } from '../context/AuthContext'

// TODO: Add only permissions approved in the HR access matrix.
// Unknown roles and permissions intentionally receive no access.
const ROLE_PERMISSIONS = Object.freeze({})

export function hasPermission(roleKey, permission) {
  return Boolean(ROLE_PERMISSIONS[roleKey]?.includes(permission))
}

export function usePermissions() {
  const { profile, loading, profileError } = useAuth()
  const roleKey = profile?.role_key ?? null

  return {
    roleKey,
    loading,
    profileError,
    can: (permission) => hasPermission(roleKey, permission),
  }
}
