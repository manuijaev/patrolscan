import { getAllScans } from '../db/models/index.js'
import { getAllCheckpoints } from '../db/models/index.js'
import { getGuardsWithCheckpoints, getCheckpointResetDate } from '../db/models/index.js'

const RESPONSE_SLA_SECONDS = 15 * 60
const notificationStateByAdmin = new Map()

function toDate(value) {
  return new Date(value)
}

function round(value, places = 0) {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function getAdminNotificationState(adminId) {
  if (!notificationStateByAdmin.has(adminId)) {
    notificationStateByAdmin.set(adminId, {
      readIds: new Set(),
      ackIds: new Set(),
      deletedIds: new Set(),
      resetAt: null,
      updatedAt: new Date().toISOString(),
    })
  }
  return notificationStateByAdmin.get(adminId)
}

async function computeMetricsForWindow({ guards, scans, windowStart, windowEnd }) {
  const activeGuardIds = new Set(guards.map(g => Number(g.id)))
  const windowScans = scans.filter(s => {
    const scannedAt = toDate(s.scannedAt)
    return scannedAt >= windowStart && scannedAt < windowEnd && activeGuardIds.has(Number(s.guardId))
  })
  const successfulWindowScans = windowScans.filter(s => s.result !== 'failed')

  // Group scans per guard/checkpoint and keep ascending by time for first-response lookup
  const scansByAssignment = new Map()
  for (const scan of windowScans) {
    const key = `${Number(scan.guardId)}::${String(scan.checkpointId)}`
    if (!scansByAssignment.has(key)) scansByAssignment.set(key, [])
    scansByAssignment.get(key).push(scan)
  }
  scansByAssignment.forEach(items => {
    items.sort((a, b) => toDate(a.scannedAt) - toDate(b.scannedAt))
  })

  let totalAssignments = 0
  let completedAssignments = 0
  let onTimeAssignments = 0
  const responseTimesSeconds = []
  const assignmentKeys = new Set()

  for (const guard of guards) {
    for (const checkpointId of (guard.assignedCheckpoints || [])) {
      const key = `${Number(guard.id)}::${String(checkpointId)}`
      assignmentKeys.add(key)

      const resetDate = await getCheckpointResetDate(guard.id, checkpointId)
      const resetDateObj = resetDate ? toDate(resetDate) : null

      // Baseline is assignment/reset start, constrained to the metrics window
      const baseline = resetDateObj && resetDateObj > windowStart ? resetDateObj : windowStart
      if (baseline >= windowEnd) continue

      totalAssignments += 1

      const assignmentScans = scansByAssignment.get(key) || []
      const firstSuccessful = assignmentScans.find(
        s => s.result !== 'failed' && toDate(s.scannedAt) >= baseline && toDate(s.scannedAt) < windowEnd
      )

      if (firstSuccessful) {
        completedAssignments += 1
        const responseSeconds = Math.max(
          0,
          Math.round((toDate(firstSuccessful.scannedAt) - baseline) / 1000)
        )
        responseTimesSeconds.push(responseSeconds)
        if (responseSeconds <= RESPONSE_SLA_SECONDS) {
          onTimeAssignments += 1
        }
      }
    }
  }

  const completionRate = totalAssignments > 0
    ? (completedAssignments / totalAssignments) * 100
    : 0

  const onTimeRate = completedAssignments > 0
    ? (onTimeAssignments / completedAssignments) * 100
    : 0

  const attemptsOnAssigned = windowScans.filter(s =>
    assignmentKeys.has(`${Number(s.guardId)}::${String(s.checkpointId)}`)
  )
  const passedAttemptsOnAssigned = attemptsOnAssigned.filter(s => s.result !== 'failed')
  const qualityRate = attemptsOnAssigned.length > 0
    ? (passedAttemptsOnAssigned.length / attemptsOnAssigned.length) * 100
    : (totalAssignments > 0 ? 0 : 100)

  const avgResponseTimeSeconds = responseTimesSeconds.length > 0
    ? responseTimesSeconds.reduce((sum, val) => sum + val, 0) / responseTimesSeconds.length
    : 0

  const efficiencyScore = clamp(
    (0.5 * completionRate) + (0.3 * onTimeRate) + (0.2 * qualityRate),
    0,
    100
  )

  return {
    completionRate: round(completionRate, 1),
    onTimeRate: round(onTimeRate, 1),
    qualityRate: round(qualityRate, 1),
    efficiencyScore: round(efficiencyScore, 1),
    avgResponseTimeSeconds: round(avgResponseTimeSeconds, 0),
    totalAssignments,
    completedAssignments,
    successfulScansCount: successfulWindowScans.length,
    windowScansCount: windowScans.length,
  }
}

// Get dashboard stats
export async function getStats(req, res) {
  try {
    const scans = await getAllScans()
    const checkpoints = await getAllCheckpoints()
    const allGuards = await getGuardsWithCheckpoints()
    
    // Filter only active guards
    const guards = allGuards.filter(g => g.isActive !== false)
    
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000)

    const todayMetrics = await computeMetricsForWindow({
      guards,
      scans,
      windowStart: startOfToday,
      windowEnd: now,
    })

    const yesterdayMetrics = await computeMetricsForWindow({
      guards,
      scans,
      windowStart: startOfYesterday,
      windowEnd: startOfToday,
    })

    const allSuccessfulScans = scans.filter(s => s.result !== 'failed')
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const activeGuards = guards.filter(g =>
      scans.some(s => Number(s.guardId) === Number(g.id) && toDate(s.scannedAt) >= oneDayAgo)
    ).length
    const missedPatrols = Math.max(0, todayMetrics.totalAssignments - todayMetrics.completedAssignments)
    
    res.json({
      patrolsToday: todayMetrics.successfulScansCount,
      missedPatrols: missedPatrols,
      activeGuards: activeGuards,
      totalCheckpoints: checkpoints.length,
      totalGuards: guards.length,
      totalScans: allSuccessfulScans.length,
      completionRate: todayMetrics.completionRate,
      avgResponseTimeSeconds: todayMetrics.avgResponseTimeSeconds,
      efficiencyScore: todayMetrics.efficiencyScore,
      onTimeRate: todayMetrics.onTimeRate,
      qualityRate: todayMetrics.qualityRate,
      completionRateChange: round(todayMetrics.completionRate - yesterdayMetrics.completionRate, 1),
      efficiencyScoreChange: round(todayMetrics.efficiencyScore - yesterdayMetrics.efficiencyScore, 1),
      avgResponseTimeChangeSeconds: round(
        todayMetrics.avgResponseTimeSeconds - yesterdayMetrics.avgResponseTimeSeconds,
        0
      ),
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Get timeline of recent scans
export async function getTimeline(req, res) {
  try {
    const scans = await getAllScans()
    const allGuards = await getGuardsWithCheckpoints()
    const guards = allGuards.filter(g => g.isActive !== false)
    const checkpoints = await getAllCheckpoints()
    
    const recentScans = scans
      .sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt))
      .slice(0, 20)
      .map(scan => {
        const guard = guards.find(g => Number(g.id) === Number(scan.guardId))
        const checkpoint = checkpoints.find(cp => cp.id === scan.checkpointId)
        return {
          id: scan.id,
          guardId: scan.guardId,
          guardName: guard ? guard.name : 'Unknown Guard',
          checkpointId: scan.checkpointId,
          checkpointName: checkpoint ? checkpoint.name : 'Unknown Checkpoint',
          scannedAt: scan.scannedAt,
          location: scan.location || null,
          result: scan.result || 'passed',
          failureReason: scan.failureReason || null
        }
      })
    
    res.json(recentScans)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Get guard performance
export async function getGuardPerformance(req, res) {
  try {
    const scans = await getAllScans()
    const allGuards = await getGuardsWithCheckpoints()
    const guards = allGuards.filter(g => g.isActive !== false)
    const checkpoints = await getAllCheckpoints()
    
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const performance = guards.map(guard => {
      const guardScans = scans.filter(s => Number(s.guardId) === Number(guard.id))
      const guardSuccessfulScans = guardScans.filter(s => s.result !== 'failed')
      const scansToday = guardSuccessfulScans.filter(s => new Date(s.scannedAt) >= startOfToday)
      const uniqueCheckpointsToday = [...new Set(scansToday.map(s => s.checkpointId))]
      
      // Get checkpoint names for assigned checkpoints
      const assignedCheckpointNames = (guard.assignedCheckpoints || [])
        .map(cpId => checkpoints.find(cp => cp.id === cpId)?.name)
        .filter(Boolean)
      
      return {
        id: guard.id,
        name: guard.name,
        scansToday: scansToday.length,
        uniqueCheckpointsToday: uniqueCheckpointsToday.length,
        totalScans: guardSuccessfulScans.length,
        lastScan: guardScans.length > 0 
          ? guardScans.sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt))[0].scannedAt 
          : null,
        assignedCheckpoints: guard.assignedCheckpoints || [],
        assignedCheckpointNames: assignedCheckpointNames
      }
    })
    
    res.json(performance)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Get upcoming patrols (assigned checkpoints to guards)
export async function getUpcomingPatrols(req, res) {
  try {
    const allGuards = await getGuardsWithCheckpoints()
    const guards = allGuards.filter(g => g.isActive !== false)
    const checkpoints = await getAllCheckpoints()
    const scans = await getAllScans()
    
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const upcomingPatrols = guards
      .filter(g => g.assignedCheckpoints && g.assignedCheckpoints.length > 0)
      .map(guard => {
        const assigned = (guard.assignedCheckpoints || []).map(cpId => {
          const checkpoint = checkpoints.find(cp => cp.id === cpId)
          
          // Get the reset date for this checkpoint
          const resetDate = getCheckpointResetDate(guard.id, cpId)
          const resetDateObj = resetDate ? new Date(resetDate) : null
          
          // Check if guard has scanned this checkpoint after the reset date
          const scannedAfterReset = scans.some(
            s => Number(s.guardId) === Number(guard.id) && 
                String(s.checkpointId) === String(cpId) && 
                s.result !== 'failed' &&
                (!resetDateObj || new Date(s.scannedAt) >= resetDateObj)
          )
          
          return {
            id: cpId,
            name: checkpoint ? checkpoint.name : 'Unknown Checkpoint',
            status: scannedAfterReset ? 'completed' : 'pending'
          }
        })
        
        return {
          guardId: guard.id,
          guardName: guard.name,
          checkpoints: assigned,
          totalAssigned: assigned.length,
          completedToday: assigned.filter(a => a.status === 'completed').length
        }
      })
    
    res.json(upcomingPatrols)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Get checkpoint status
export async function getCheckpointStatus(req, res) {
  try {
    const scans = await getAllScans()
    const checkpoints = await getAllCheckpoints()
    
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    const status = checkpoints.map(cp => {
      const checkpointScans = scans.filter(s => s.checkpointId === cp.id)
      const successfulToday = checkpointScans.filter(
        s => s.result !== 'failed' && new Date(s.scannedAt) >= oneDayAgo
      )
      const uniqueGuardsToday = [...new Set(successfulToday.map(s => s.guardId))]
      
      return {
        id: cp.id,
        name: cp.name,
        scansToday: successfulToday.length,
        uniqueGuardsToday: uniqueGuardsToday.length,
        lastScan: checkpointScans.length > 0 
          ? checkpointScans.sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt))[0].scannedAt 
          : null,
        status: successfulToday.length > 0 ? 'active' : 'inactive'
      }
    })
    
    res.json(status)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Get actionable admin notifications
export async function getNotifications(req, res) {
  try {
    const adminId = Number(req.user?.id || 0)
    const scans = await getAllScans()
    const allGuards = await getGuardsWithCheckpoints()
    const guards = allGuards.filter(g => g.isActive !== false)
    const checkpoints = await getAllCheckpoints()

    const guardNameById = new Map(guards.map(g => [Number(g.id), g.name]))
    const checkpointById = new Map(checkpoints.map(cp => [String(cp.id), cp]))

    const now = new Date()
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const reassignStaleHours = 2
    const reassignStaleSince = new Date(now.getTime() - reassignStaleHours * 60 * 60 * 1000)

    const notifications = []

    // 1) Repeated location failures (same guard/checkpoint, >= 3 in 30 mins)
    const recentFailedScans = scans.filter(s => {
      const scannedAt = new Date(s.scannedAt)
      return scannedAt >= thirtyMinutesAgo && s.result === 'failed'
    })

    const repeatedFailures = new Map()
    for (const scan of recentFailedScans) {
      const reason = (scan.failureReason || '').toLowerCase()
      const isLocationFailure =
        reason.includes('out of range') ||
        reason.includes('location') ||
        reason.includes('gps')
      if (!isLocationFailure) continue

      const key = `${Number(scan.guardId)}::${String(scan.checkpointId)}`
      if (!repeatedFailures.has(key)) repeatedFailures.set(key, [])
      repeatedFailures.get(key).push(scan)
    }

    repeatedFailures.forEach((group, key) => {
      if (group.length < 3) return
      const [guardIdRaw, checkpointId] = key.split('::')
      const guardId = Number(guardIdRaw)
      const guardName = guardNameById.get(guardId) || `Guard #${guardId}`
      const checkpoint = checkpointById.get(String(checkpointId))
      const checkpointName = checkpoint?.name || 'Unknown Checkpoint'
      const latest = group.sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt))[0]

      notifications.push({
        id: `repeat-fail-${guardId}-${checkpointId}`,
        type: 'repeated_location_failures',
        severity: 'critical',
        title: 'Repeated Location Failures',
        detail: `${guardName} failed location validation ${group.length} times at ${checkpointName} in the last 30 minutes.`,
        time: latest.scannedAt,
        unread: true,
        action: {
          path: '/reports',
          label: 'Open Reports',
        },
      })
    })

    // 2) Reassign needed (completed checkpoint stale for too long)
    for (const guard of guards) {
      for (const checkpointId of (guard.assignedCheckpoints || [])) {
        const resetDate = await getCheckpointResetDate(guard.id, checkpointId)
        const resetDateObj = resetDate ? new Date(resetDate) : null

        const assignmentSuccessfulScans = scans
          .filter(s =>
            Number(s.guardId) === Number(guard.id) &&
            String(s.checkpointId) === String(checkpointId) &&
            s.result !== 'failed' &&
            (!resetDateObj || new Date(s.scannedAt) >= resetDateObj)
          )
          .sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt))

        const latestSuccess = assignmentSuccessfulScans[0]
        if (!latestSuccess) continue
        const latestSuccessAt = new Date(latestSuccess.scannedAt)
        if (latestSuccessAt > reassignStaleSince) continue

        const checkpoint = checkpointById.get(String(checkpointId))
        const checkpointName = checkpoint?.name || 'Unknown Checkpoint'
        notifications.push({
          id: `reassign-needed-${guard.id}-${String(checkpointId)}`,
          type: 'reassign_needed',
          severity: 'warning',
          title: 'Reassign Needed',
          detail: `${checkpointName} (assigned to ${guard.name}) was last completed ${Math.floor((now - latestSuccessAt) / (60 * 60 * 1000))}h ago and likely needs re-assignment.`,
          time: latestSuccess.scannedAt,
          unread: true,
          action: {
            path: '/upcoming-patrols',
            label: 'Open Upcoming Patrols',
            params: {
              guardId: String(guard.id),
              checkpointId: String(checkpointId),
            },
          },
        })
      }
    }

    // 3) Unauthorized/Unexpected scan attempts
    const unauthorizedAttempts = scans
      .filter(s => {
        const reason = (s.failureReason || '').toLowerCase()
        return (
          new Date(s.scannedAt) >= oneDayAgo &&
          s.result === 'failed' &&
          reason.includes('not assigned')
        )
      })
      .sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt))

    for (const scan of unauthorizedAttempts.slice(0, 10)) {
      const guardId = Number(scan.guardId)
      const checkpointId = String(scan.checkpointId)
      const guardName = guardNameById.get(guardId) || `Guard #${guardId}`
      const checkpoint = checkpointById.get(checkpointId)
      const checkpointName = checkpoint?.name || checkpointId

      notifications.push({
        id: `unauthorized-${scan.id}`,
        type: 'unauthorized_attempt',
        severity: 'critical',
        title: 'Unauthorized Scan Attempt',
        detail: `${guardName} attempted to scan unassigned checkpoint: ${checkpointName}.`,
        time: scan.scannedAt,
        unread: true,
        action: {
          path: '/reports',
          label: 'Review Incident',
        },
      })
    }

    // 4) Successful scans (informational/other)
    const successfulScans = scans
      .filter(s => new Date(s.scannedAt) >= oneDayAgo && s.result !== 'failed')
      .sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt))

    for (const scan of successfulScans.slice(0, 15)) {
      const guardId = Number(scan.guardId)
      const checkpointId = String(scan.checkpointId)
      const guardName = guardNameById.get(guardId) || `Guard #${guardId}`
      const checkpoint = checkpointById.get(checkpointId)
      const checkpointName = checkpoint?.name || checkpointId

      notifications.push({
        id: `success-${scan.id}`,
        type: 'successful_scan',
        severity: 'other',
        title: 'Successful Scan',
        detail: `${guardName} successfully scanned ${checkpointName}.`,
        time: scan.scannedAt,
        unread: true,
        action: {
          path: '/reports',
          label: 'Open Reports',
          params: {
            guardId: String(guardId),
            checkpointId: String(checkpointId),
          },
        },
      })
    }

    const state = getAdminNotificationState(adminId)
    const resetAt = state.resetAt ? new Date(state.resetAt) : null
    const sorted = notifications
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .filter(item => {
        if (state.deletedIds.has(item.id)) return false
        if (resetAt && new Date(item.time) <= resetAt) return false
        return true
      })
      .slice(0, 25)
      .map(item => ({
        ...item,
        unread: !state.readIds.has(item.id),
        acknowledged: state.ackIds.has(item.id),
        timeAgoMinutes: Math.max(0, Math.round((now - new Date(item.time)) / 60000)),
      }))

    res.json(sorted)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export async function getNotificationState(req, res) {
  try {
    const adminId = Number(req.user?.id || 0)
    const state = getAdminNotificationState(adminId)
    res.json({
      readIds: [...state.readIds],
      ackIds: [...state.ackIds],
      deletedIds: [...state.deletedIds],
      resetAt: state.resetAt,
      updatedAt: state.updatedAt,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export async function updateNotificationState(req, res) {
  try {
    const adminId = Number(req.user?.id || 0)
    const { reads = [], acks = [], deletes = [], resetAll = false } = req.body || {}
    const state = getAdminNotificationState(adminId)

    for (const id of reads) {
      if (typeof id === 'string' && id.trim()) {
        state.readIds.add(id)
      }
    }
    for (const id of acks) {
      if (typeof id === 'string' && id.trim()) {
        state.ackIds.add(id)
      }
    }
    for (const id of deletes) {
      if (typeof id === 'string' && id.trim()) {
        state.deletedIds.add(id)
        state.readIds.add(id)
        state.ackIds.add(id)
      }
    }
    if (resetAll) {
      state.resetAt = new Date().toISOString()
      state.readIds.clear()
      state.ackIds.clear()
      state.deletedIds.clear()
    }
    state.updatedAt = new Date().toISOString()

    res.json({
      message: 'Notification state updated',
      readIds: [...state.readIds],
      ackIds: [...state.ackIds],
      deletedIds: [...state.deletedIds],
      resetAt: state.resetAt,
      updatedAt: state.updatedAt,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
