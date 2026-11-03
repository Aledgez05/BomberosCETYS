import { useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const ROLE_PERMISSIONS = Object.freeze({
  admin: ['employees.read', 'employees.write', 'stations.read', 'reports.read', 'users.read', 'users.create', 'users.manage_admins'],
  rh_admin: ['employees.read', 'employees.write', 'stations.read', 'reports.read', 'users.read', 'users.create'],
})

export function hasPermission(roleKey, permission) {
  return Boolean(ROLE_PERMISSIONS[roleKey]?.includes(permission))
}

export function usePermissions() {
  const { profile, loading, profileError } = useAuth()
  const roleKey = profile?.rol ?? null
  const can = useCallback((permission) => hasPermission(roleKey, permission), [roleKey])

  return {
    roleKey,
    loading,
    profileError,
    can,
  }
}
