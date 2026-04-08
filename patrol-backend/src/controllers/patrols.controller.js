// Patrol assignments controller
import { getGuardsWithCheckpoints, assignCheckpointsToGuard, getAllGuards } from '../db/models/index.js'
import { getAllCheckpoints } from '../db/models/index.js'
import { getAllScans } from '../db/models/index.js'
import { filterGuardsByUser, guardIdSet, filterScansByGuardIds, guardBelongsToUser } from '../utils/access.js'

// Get all patrol assignments with status
export async function getPatrolAssignments(req, res) {
  try {
    const allGuards = await getGuardsWithCheckpoints()
    const guards = filterGuardsByUser(req.user, allGuards)
    const guardIds = guardIdSet(guards)
    const checkpoints = await getAllCheckpoints()
    const scans = filterScansByGuardIds(await getAllScans(), guardIds)
    
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const assignments = await Promise.all(guards
      .filter(g => g.assignedCheckpoints && g.assignedCheckpoints.length > 0)
      .map(async guard => {
        const assigned = await Promise.all((guard.assignedCheckpoints || []).map(async cpId => {
          const checkpoint = checkpoints.find(cp => cp.id === cpId)
          
          // Find the most recent successful scan for this checkpoint
          const lastScan = scans.find(
            s => Number(s.guardId) === Number(guard.id) && 
                 String(s.checkpointId) === String(cpId) && 
                 s.result !== 'failed'
          )
          
          return {
            id: cpId,
            checkpointId: cpId,
            name: checkpoint ? checkpoint.name : 'Unknown Checkpoint',
            location: checkpoint ? checkpoint.location : '',
            status: lastScan ? 'completed' : 'pending',
            completedAt: lastScan ? lastScan.scannedAt : null
          }
        }))
        
        return {
          guardId: guard.id,
          guardName: guard.name,
          checkpoints: assigned,
          totalAssigned: assigned.length,
          completedToday: assigned.filter(a => a.status === 'completed').length
        }
      }))
    
    res.json(assignments)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Assign a checkpoint to a guard
export async function assignPatrolCheckpoint(req, res) {
  try {
    const { guardId, checkpointId } = req.body
    
    if (!guardId || !checkpointId) {
      return res.status(400).json({ message: 'guardId and checkpointId are required' })
    }
    
    const guards = await getAllGuards()
    const guard = guards.find(g => Number(g.id) === Number(guardId))

    if (!guard) {
      return res.status(404).json({ message: 'Guard not found' })
    }

    if (!guardBelongsToUser(req.user, guard)) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    if (!guardBelongsToUser(req.user, guard)) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    if (!guardBelongsToUser(req.user, guard)) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    
    const checkpoints = await getAllCheckpoints()
    const checkpoint = checkpoints.find(cp => cp.id === checkpointId)
    
    if (!checkpoint) {
      return res.status(404).json({ message: 'Checkpoint not found' })
    }
    
    // Get current assignments
    const currentAssigned = guard.assignedCheckpoints || []
    
    // Check if already assigned
    if (currentAssigned.some(id => String(id) === String(checkpointId))) {
      return res.status(400).json({ message: 'Checkpoint already assigned to this guard' })
    }
    
    // Add the new checkpoint
    const newAssigned = [...currentAssigned, checkpointId]
    await assignCheckpointsToGuard(Number(guardId), newAssigned)
    
    res.json({ 
      message: 'Checkpoint assigned successfully',
      guardId: Number(guardId),
      checkpointId: checkpointId
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Remove a checkpoint assignment from a guard
export async function removePatrolCheckpoint(req, res) {
  try {
    const { guardId, checkpointId } = req.params
    
    const guards = await getAllGuards()
    const guard = guards.find(g => Number(g.id) === Number(guardId))
    
    if (!guard) {
      return res.status(404).json({ message: 'Guard not found' })
    }
    
    const currentAssigned = guard.assignedCheckpoints || []
    const newAssigned = currentAssigned.filter(id => String(id) !== String(checkpointId))
    
    await assignCheckpointsToGuard(Number(guardId), newAssigned)
    
    res.json({ message: 'Checkpoint removed successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Update checkpoint assignment - change guard for a checkpoint
export async function updatePatrolAssignment(req, res) {
  try {
    const { checkpointId, newGuardId } = req.body
    
    if (!checkpointId || !newGuardId) {
      return res.status(400).json({ message: 'checkpointId and newGuardId are required' })
    }
    
    const allGuards = await getAllGuards()
    const accessibleGuards = filterGuardsByUser(req.user, allGuards)
    const newGuard = accessibleGuards.find(g => Number(g.id) === Number(newGuardId))

    if (!newGuard) {
      return res.status(404).json({ message: 'Guard not found' })
    }
    
    // Remove from current guard(s) and add to new guard
    for (const guard of accessibleGuards) {
      const currentAssigned = guard.assignedCheckpoints || []
      const hasCheckpoint = currentAssigned.some(id => String(id) === String(checkpointId))
      
      if (hasCheckpoint && Number(guard.id) !== Number(newGuardId)) {
        // Remove from current guard
        const newAssigned = currentAssigned.filter(id => String(id) !== String(checkpointId))
        await assignCheckpointsToGuard(guard.id, newAssigned)
      }
    }
    
    // Add to new guard if not already assigned
    const newGuardCurrentAssigned = newGuard.assignedCheckpoints || []
    if (!newGuardCurrentAssigned.some(id => String(id) === String(checkpointId))) {
      await assignCheckpointsToGuard(Number(newGuardId), [...newGuardCurrentAssigned, checkpointId])
    }
    
    res.json({ 
      message: 'Checkpoint assignment updated successfully',
      checkpointId: checkpointId,
      newGuardId: Number(newGuardId)
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
