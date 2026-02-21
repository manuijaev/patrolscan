import bcrypt from 'bcrypt'
import { 
  getAllGuards, 
  createGuard as dbCreateGuard, 
  updateGuard as dbUpdateGuard, 
  deleteGuard as dbDeleteGuard, 
  assignCheckpointsToGuard, 
  getGuardsWithCheckpoints, 
  unassignCheckpoint as dbUnassignCheckpoint 
} from '../db/models/index.js'
import { getAllScans } from '../db/models/index.js'
import { getAllCheckpoints } from '../db/models/index.js'

export async function listGuards(req, res) {
  const guards = await getGuardsWithCheckpoints()
  const scans = await getAllScans()
  const checkpoints = await getAllCheckpoints()
  
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // Get checkpoints completed today for each guard
  const guardsWithStatus = guards.map(g => {
    const guardScans = scans.filter(s => 
      Number(s.guardId) === Number(g.id) && 
      new Date(s.scannedAt) >= startOfToday &&
      s.result !== 'failed'
    )
    const completedCheckpointIds = [...new Set(guardScans.map(s => s.checkpointId))]
    
    return {
      id: g.id,
      name: g.name,
      role: g.role,
      assignedCheckpoints: g.assignedCheckpoints || [],
      completedCheckpoints: completedCheckpointIds,
    }
  })
  
  res.json(guardsWithStatus)
}

export async function createGuard(req, res) {
  const { name, pin } = req.body

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ message: 'Name is required' })
  }

  if (!pin || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ message: 'PIN must be 4 digits' })
  }

  const hashedPin = bcrypt.hashSync(pin, 10)
  const guard = await dbCreateGuard({ name: name.trim(), pin: hashedPin })

  return res.status(201).json({
    id: guard.id,
    name: guard.name,
    role: guard.role,
    assignedCheckpoints: [],
  })
}

export async function updateGuardController(req, res) {
  const { id } = req.params
  const { name, pin } = req.body

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ message: 'Name is required' })
  }

  if (pin && !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ message: 'PIN must be 4 digits if provided' })
  }

  const updates = { name: name.trim() }
  if (pin) {
    updates.pin = bcrypt.hashSync(pin, 10)
  }

  const guard = await dbUpdateGuard(Number(id), updates)

  if (!guard) {
    return res.status(404).json({ message: 'Guard not found' })
  }

  return res.json({ message: 'Guard updated successfully' })
}

export async function removeGuard(req, res) {
  const { id } = req.params
  
  const success = await dbDeleteGuard(Number(id))
  
  if (!success) {
    return res.status(404).json({ message: 'Guard not found' })
  }
  
  return res.json({ message: 'Guard deleted successfully' })
}

export async function assignCheckpointsController(req, res) {
  const { id } = req.params
  const { checkpointIds } = req.body

  if (!Array.isArray(checkpointIds)) {
    return res.status(400).json({ message: 'checkpointIds must be an array' })
  }

  // Validate: at least one checkpoint must be selected
  if (checkpointIds.length === 0) {
    return res.status(400).json({ message: 'Please select at least one checkpoint to assign' })
  }

  const success = await assignCheckpointsToGuard(Number(id), checkpointIds)

  if (!success) {
    return res.status(404).json({ message: 'Guard not found' })
  }

  return res.json({ message: 'Checkpoints assigned successfully' })
}

export async function unassignCheckpointController(req, res) {
  const { id, checkpointId } = req.params

  const success = await dbUnassignCheckpoint(Number(id), checkpointId)

  if (!success) {
    return res.status(404).json({ message: 'Guard or checkpoint not found' })
  }

  return res.json({ message: 'Checkpoint unassigned successfully' })
}
