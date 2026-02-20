import { getAll as getAllScans } from '../data/scans.js'
import { getAll as getAllCheckpoints } from '../data/checkpoints.js'
import { getGuardsWithCheckpoints } from '../data/users.js'

// Get dashboard stats
export async function getStats(req, res) {
  try {
    const scans = await getAllScans()
    const checkpoints = await getAllCheckpoints()
    const guards = getGuardsWithCheckpoints()
    
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // Only count successful scans (result !== 'failed') for stats
    const successfulScans = scans.filter(s => s.result !== 'failed')

    // Scans today (successful only)
    const scansToday = successfulScans.filter(s => new Date(s.scannedAt) >= startOfToday).length
    
    // Calculate completion rate (scans / (guards * checkpoints))
    const totalPossibleScans = guards.length * checkpoints.length
    const completionRate = totalPossibleScans > 0 
      ? Math.round((successfulScans.length / totalPossibleScans) * 100) 
      : 0
    
    // Active guards (guards with scans in the last 24 hours)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const activeGuards = guards.filter(g => 
      successfulScans.some(s => Number(s.guardId) === Number(g.id) && new Date(s.scannedAt) >= oneDayAgo)
    ).length
    
    // Missed checkpoints (checkpoints with no scans in last 24 hours)
    const missedCheckpoints = checkpoints.filter(cp => 
      !successfulScans.some(s => s.checkpointId === cp.id && new Date(s.scannedAt) >= oneDayAgo)
    ).length
    
    res.json({
      patrolsToday: scansToday,
      missedPatrols: missedCheckpoints,
      activeGuards: activeGuards,
      totalCheckpoints: checkpoints.length,
      totalGuards: guards.length,
      totalScans: successfulScans.length,
      completionRate: completionRate
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Get timeline of recent scans
export async function getTimeline(req, res) {
  try {
    const scans = await getAllScans()
    const guards = getGuardsWithCheckpoints()
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
    const guards = getGuardsWithCheckpoints()
    const checkpoints = await getAllCheckpoints()
    
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const performance = guards.map(guard => {
      const guardScans = scans.filter(s => Number(s.guardId) === Number(guard.id))
      const guardSuccessfulScans = guardScans.filter(s => s.result !== 'failed')
      const scansToday = guardSuccessfulScans.filter(s => new Date(s.scannedAt) >= startOfToday)
      const uniqueCheckpointsToday = [...new Set(scansToday.map(s => s.checkpointId))]
      
      // Get checkpoint names for assigned checkpoints
      const assignedCheckpointNames = guard.assignedCheckpoints
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
        assignedCheckpoints: guard.assignedCheckpoints,
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
    const guards = getGuardsWithCheckpoints()
    const checkpoints = await getAllCheckpoints()
    const scans = await getAllScans()
    
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const upcomingPatrols = guards
      .filter(g => g.assignedCheckpoints && g.assignedCheckpoints.length > 0)
      .map(guard => {
        const assigned = guard.assignedCheckpoints.map(cpId => {
          const checkpoint = checkpoints.find(cp => cp.id === cpId)
          
          // Check if guard has scanned this checkpoint today
          const scannedToday = scans.some(
            s => Number(s.guardId) === Number(guard.id) && 
                s.checkpointId === cpId && 
                s.result !== 'failed' &&
                new Date(s.scannedAt) >= startOfToday
          )
          
          return {
            id: cpId,
            name: checkpoint ? checkpoint.name : 'Unknown Checkpoint',
            status: scannedToday ? 'completed' : 'pending'
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
