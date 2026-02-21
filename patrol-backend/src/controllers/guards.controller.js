import bcrypt from 'bcrypt'
import { 
  getAllGuards, 
  createGuard as dbCreateGuard, 
  updateGuard as dbUpdateGuard, 
  deleteGuard as dbDeleteGuard, 
  assignCheckpointsToGuard, 
  getGuardsWithCheckpoints, 
  unassignCheckpoint as dbUnassignCheckpoint,
  getCheckpointResetDate
} from '../db/models/index.js'
import { getAllScans } from '../db/models/index.js'
import { getAllCheckpoints } from '../db/models/index.js'

export async function listGuards(req, res) {
  const guards = await getGuardsWithCheckpoints()
  const scans = await getAllScans()
  const checkpoints = await getAllCheckpoints()
  
  // Filter out inactive guards
  const activeGuards = guards.filter(g => g.isActive !== false)
  
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // Get checkpoints completed today for each guard, respecting reset dates
  const guardsWithStatus = await Promise.all(activeGuards.map(async g => {
    const guardScans = []
    
    for (const cpId of (g.assignedCheckpoints || [])) {
      // Get the reset date for this checkpoint
      const resetDate = await getCheckpointResetDate(g.id, cpId)
      const resetDateObj = resetDate ? new Date(resetDate) : null
      
      // Check if this checkpoint was reset today
      const isResetToday = resetDateObj && resetDateObj.toDateString() === now.toDateString()
      
      // If reset today, don't count any scans - show as pending
      if (isResetToday) {
        continue
      }
      
      // Otherwise, check if there's a scan after the reset date (or if no reset date)
      const hasScan = scans.some(s => 
        Number(s.guardId) === Number(g.id) && 
        String(s.checkpointId) === String(cpId) &&
        s.result !== 'failed' &&
        (!resetDateObj || new Date(s.scannedAt) >= resetDateObj)
      )
      
      if (hasScan) {
        guardScans.push(cpId)
      }
    }
    
    return {
      id: g.id,
      name: g.name,
      role: g.role,
      assignedCheckpoints: g.assignedCheckpoints || [],
      completedCheckpoints: guardScans,
    }
  }))

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
  console.log('Creating guard:', name, 'PIN hash:', hashedPin)
  
  const guard = await dbCreateGuard({ name: name.trim(), pin: hashedPin })
  
  console.log('Guard created:', guard.name, 'ID:', guard.id, 'isActive:', guard.isActive)

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

  if (!name && !pin) {
    return res.status(400).json({ message: 'Name or PIN is required' })
  }

  const updates = {}
  if (name) updates.name = name.trim()
  if (pin && /^\d{4}$/.test(pin)) {
    updates.pin = bcrypt.hashSync(pin, 10)
  }

  const guard = await dbUpdateGuard(Number(id), updates)

  if (!guard) {
    return res.status(404).json({ message: 'Guard not found' })
  }

  return res.json({
    id: guard.id,
    name: guard.name,
    role: guard.role,
  })
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

  if (!checkpointIds || !Array.isArray(checkpointIds)) {
    return res.status(400).json({ message: 'checkpointIds array is required' })
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
