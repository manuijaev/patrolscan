export function isSuperAdminRole(role) {
  return role === 'super-admin'
}

export function isAdminRole(role) {
  return role === 'admin' || isSuperAdminRole(role)
}

export function matchesRole(userRole, expectedRole) {
  if (!userRole || !expectedRole) return false
  if (expectedRole === 'admin') return isAdminRole(userRole)
  return userRole === expectedRole
}

export function matchesAnyRole(userRole, allowedRoles = []) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
  return roles.some(role => matchesRole(userRole, role))
}

export function filterGuardsByUser(user, guards = []) {
  const normalized = Array.isArray(guards) ? guards.filter(g => g.isActive !== false) : []
  if (user?.role === 'supervisor') {
    return normalized.filter(g => Number(g.supervisorId) === Number(user.id))
  }
  return normalized
}

export function guardBelongsToUser(user, guard) {
  if (!guard) return false
  if (user?.role === 'supervisor') {
    return Number(guard.supervisorId) === Number(user.id)
  }
  return true
}

export function guardIdSet(guards = []) {
  return new Set(guards.map(g => Number(g.id)))
}

export function filterScansByGuardIds(scans = [], guardIds = new Set()) {
  if (!guardIds || guardIds.size === 0) return []
  return scans.filter(scan => guardIds.has(Number(scan.guardId)))
}

export function filterIncidentsByGuardIds(incidents = [], guardIds = new Set()) {
  if (!guardIds || guardIds.size === 0) return []
  return incidents.filter(incident => guardIds.has(Number(incident.guardId)))
}
