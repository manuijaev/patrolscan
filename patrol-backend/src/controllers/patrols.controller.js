// Patrol assignments controller
import { getGuardsWithCheckpoints, assignCheckpointsToGuard, getAllGuards, getCheckpointResetDate, resetCheckpointAssignment } from '../db/models/index.js'
import { getAllCheckpoints } from '../db/models/index.js'
import { getAllScans } from '../db/models/index.js'

// Get all patrol assignments with status
export async function getPatrolAssignments(req, res) {
  try {
    const allGuards = await getGuardsWithCheckpoints()
    const guards = allGuards.filter(g => g.isActive !== false)
    const checkpoints = await getAllCheckpoints()
    const scans = await getAllScans()
    
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const assignments = await Promise.all(guards
      .filter(g => g.assignedCheckpoints && g.assignedCheckpoints.length > 0)
      .map(async guard => {
        const assigned = await Promise.all((guard.assignedCheckpoints || []).map(async cpId => {
          const checkpoint = checkpoints.find(cp => cp.id === cpId)
          
          // Get the reset date for this checkpoint
          const resetDate = await getCheckpointResetDate(guard.id, cpId)
          const resetDateObj = resetDate ? new Date(resetDate) : null
          
          // Treat scans before reset as historical only; after reassign, a new scan is required.
          const scannedAfterReset = scans.some(
            s => Number(s.guardId) === Number(guard.id) && 
                String(s.checkpointId) === String(cpId) && 
                s.result !== 'failed' &&
                (!resetDateObj || new Date(s.scannedAt) >= resetDateObj)
          )
          
          return {
            id: cpId,
            checkpointId: cpId,
            name: checkpoint ? checkpoint.name : 'Unknown Checkpoint',
            location: checkpoint ? checkpoint.location : '',
            status: scannedAfterReset ? 'completed' : 'pending',
            completedAt: scannedAfterReset ? scans.find(s => 
              Number(s.guardId) === Number(guard.id) && 
              String(s.checkpointId) === String(cpId) && 
              s.result !== 'failed' &&
              (!resetDateObj || new Date(s.scannedAt) >= resetDateObj)
            )?.scannedAt : null
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

// Re-assign a completed checkpoint (reset its status)
export async function reassignPatrolCheckpoint(req, res) {
  try {
    const { guardId, checkpointId } = req.body
    
    console.log('Reassign request:', guardId, checkpointId)
    
    if (!guardId || !checkpointId) {
      return res.status(400).json({ message: 'guardId and checkpointId are required' })
    }
    
    const guards = await getAllGuards()
    const guard = guards.find(g => Number(g.id) === Number(guardId))
    
    if (!guard) {
      return res.status(404).json({ message: 'Guard not found' })
    }
    
    console.log('Guard found:', guard.name, 'checkpointResetDates before:', guard.checkpointResetDates)
    
    // Re-assign is only valid for checkpoints currently assigned to this guard
    const currentAssigned = guard.assignedCheckpoints || []
    
    if (!currentAssigned.some(id => String(id) === String(checkpointId))) {
      return res.status(400).json({ message: 'Checkpoint is not assigned to this guard' })
    }

    // Re-assign is only valid for currently completed checkpoints
    const scans = await getAllScans()
    const resetDate = await getCheckpointResetDate(Number(guardId), checkpointId)
    const resetDateObj = resetDate ? new Date(resetDate) : null
    const isCompleted = scans.some(
      s => Number(s.guardId) === Number(guardId) &&
        String(s.checkpointId) === String(checkpointId) &&
        s.result !== 'failed' &&
        (!resetDateObj || new Date(s.scannedAt) >= resetDateObj)
    )

    if (!isCompleted) {
      return res.status(400).json({ message: 'Only completed assigned checkpoints can be reassigned' })
    }
    
    // Reset the checkpoint assignment timestamp (without deleting scan history)
    const result = await resetCheckpointAssignment(Number(guardId), checkpointId)
    console.log('Reset result:', result)
    
    // Verify the reset happened
    const updatedGuards = await getAllGuards()
    const updatedGuard = updatedGuards.find(g => Number(g.id) === Number(guardId))
    console.log('checkpointResetDates after:', updatedGuard?.checkpointResetDates)
    
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
    
    const guards = await getAllGuards()
    const newGuard = guards.find(g => Number(g.id) === Number(newGuardId))
    
    if (!newGuard) {
      return res.status(404).json({ message: 'Guard not found' })
    }
    
    // Remove from current guard(s) and add to new guard
    for (const guard of guards) {
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
