// Patrol assignments controller
import { getGuardsWithCheckpoints, assignCheckpoints, getGuards } from '../data/users.js'
import { getAll as getAllCheckpoints } from '../data/checkpoints.js'
import { getAll as getAllScans } from '../data/scans.js'

// Get all patrol assignments with status
export async function getPatrolAssignments(req, res) {
  try {
    const guards = getGuardsWithCheckpoints()
    const checkpoints = await getAllCheckpoints()
    const scans = await getAllScans()
    
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const assignments = guards
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
            checkpointId: cpId,
            name: checkpoint ? checkpoint.name : 'Unknown Checkpoint',
            location: checkpoint ? checkpoint.location : '',
            status: scannedToday ? 'completed' : 'pending',
            completedAt: scannedToday ? scans.find(s => 
              Number(s.guardId) === Number(guard.id) && 
              s.checkpointId === cpId && 
              s.result !== 'failed' &&
              new Date(s.scannedAt) >= startOfToday
            )?.scannedAt : null
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
      // Don't filter out completed patrols - show them so admins can re-assign if needed
      // .filter(patrol => patrol.completedToday < patrol.totalAssigned)
    
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
    
    const guards = getGuards()
    const guard = guards.find(g => g.id === Number(guardId))
    
    if (!guard) {
      return res.status(404).json({ message: 'Guard not found' })
    }
    
    const checkpoints = await getAllCheckpoints()
    const checkpoint = checkpoints.find(cp => cp.id === checkpointId)
    
    if (!checkpoint) {
      return res.status(404).json({ message: 'Checkpoint not found' })
    }
    
    // Get current assignments
    const currentAssigned = guard.assignedCheckpoints || []
    
    // Check if already assigned
    if (currentAssigned.includes(checkpointId)) {
      return res.status(400).json({ message: 'Checkpoint already assigned to this guard' })
    }
    
    // Add the new checkpoint
    const newAssigned = [...currentAssigned, checkpointId]
    assignCheckpoints(Number(guardId), newAssigned)
    
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
    
    const guards = getGuards()
    const guard = guards.find(g => g.id === Number(guardId))
    
    if (!guard) {
      return res.status(404).json({ message: 'Guard not found' })
    }
    
    const currentAssigned = guard.assignedCheckpoints || []
    const newAssigned = currentAssigned.filter(id => id !== checkpointId)
    
    assignCheckpoints(Number(guardId), newAssigned)
    
    res.json({ message: 'Checkpoint removed successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Re-assign a completed checkpoint (reset its status)
export async function reassignPatrolCheckpoint(req, res) {
  try {
    const { guardId, checkpointId } = req.body
    
    if (!guardId || !checkpointId) {
      return res.status(400).json({ message: 'guardId and checkpointId are required' })
    }
    
    const guards = getGuards()
    const guard = guards.find(g => g.id === Number(guardId))
    
    if (!guard) {
      return res.status(404).json({ message: 'Guard not found' })
    }
    
    // Re-assignment means ensuring the checkpoint is still assigned
    // The guard will need to scan it again
    const currentAssigned = guard.assignedCheckpoints || []
    
    if (!currentAssigned.includes(checkpointId)) {
      // If not assigned, add it
      assignCheckpoints(Number(guardId), [...currentAssigned, checkpointId])
    }
    
    res.json({ 
      message: 'Checkpoint re-assigned successfully. Guard needs to scan it again.',
      guardId: Number(guardId),
      checkpointId: checkpointId
    })
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
    
    const guards = getGuards()
    const newGuard = guards.find(g => g.id === Number(newGuardId))
    
    if (!newGuard) {
      return res.status(404).json({ message: 'Guard not found' })
    }
    
    // Remove from current guard(s) and add to new guard
    guards.forEach(guard => {
      const currentAssigned = guard.assignedCheckpoints || []
      const hasCheckpoint = currentAssigned.includes(checkpointId)
      
      if (hasCheckpoint && guard.id !== Number(newGuardId)) {
        // Remove from current guard
        const newAssigned = currentAssigned.filter(id => id !== checkpointId)
        assignCheckpoints(guard.id, newAssigned)
      }
    })
    
    // Add to new guard if not already assigned
    const newGuardCurrentAssigned = newGuard.assignedCheckpoints || []
    if (!newGuardCurrentAssigned.includes(checkpointId)) {
      assignCheckpoints(Number(newGuardId), [...newGuardCurrentAssigned, checkpointId])
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
