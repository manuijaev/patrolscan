import bcrypt from 'bcrypt'
import {
  createGuard as dbCreateGuard,
  updateGuard as dbUpdateGuard,
  deleteGuard as dbDeleteGuard,
  assignCheckpointsToGuard,
  getGuardsWithCheckpoints,
  unassignCheckpoint as dbUnassignCheckpoint,
  getCheckpointResetDate,
  getGuardById
} from '../db/models/index.js'
import { getAllScans } from '../db/models/index.js'
import { filterGuardsByUser, guardIdSet, guardBelongsToUser } from '../utils/access.js'

export async function listGuards(req, res) {
  const guards = await getGuardsWithCheckpoints()
  const accessibleGuards = filterGuardsByUser(req.user, guards)
  const guardIds = guardIdSet(accessibleGuards)
  const scans = (await getAllScans()).filter(scan => guardIds.has(Number(scan.guardId)))
  
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // Get checkpoints completed today for each guard, respecting reset dates
  const guardsWithStatus = await Promise.all(accessibleGuards.map(async g => {
    const guardScans = []
    
    for (const cpId of (g.assignedCheckpoints || [])) {
      // Get the reset date for this checkpoint
      const resetDate = await getCheckpointResetDate(g.id, cpId)
      const resetDateObj = resetDate ? new Date(resetDate) : null
      
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
      supervisorId: g.supervisorId || null,
      assignedCheckpoints: g.assignedCheckpoints || [],
      completedCheckpoints: guardScans,
    }
  }))

  res.json(guardsWithStatus)
}

export async function createGuard(req, res) {
  const { name, pin, supervisorId: requestedSupervisorId } = req.body

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ message: 'Name is required' })
  }

  if (!pin || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ message: 'PIN must be 4 digits' })
  }

  const isSupervisor = req.user?.role === 'supervisor'
  const normalizedSupervisorId = isSupervisor
    ? Number(req.user.id)
    : Number.isFinite(Number(requestedSupervisorId))
      ? Number(requestedSupervisorId)
      : null

  if (!normalizedSupervisorId) {
    return res.status(400).json({ message: 'Supervisor assignment is required' })
  }

  const hashedPin = bcrypt.hashSync(pin, 10)
  console.log('Creating guard:', name, 'PIN hash:', hashedPin)
  
  const guard = await dbCreateGuard({
    name: name.trim(),
    pin: hashedPin,
    supervisorId: normalizedSupervisorId
  })
  
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
  const { name, pin, supervisorId } = req.body

  if (!name && !pin && supervisorId === undefined) {
    return res.status(400).json({ message: 'Name, PIN or supervisor is required' })
  }

  const guard = await getGuardById(Number(id))
  if (!guard) {
    return res.status(404).json({ message: 'Guard not found' })
  }

  if (!guardBelongsToUser(req.user, guard)) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const updates = {}
  if (name) updates.name = name.trim()
  if (pin && /^\d{4}$/.test(pin)) {
    updates.pin = bcrypt.hashSync(pin, 10)
  }

  if (supervisorId !== undefined && req.user?.role !== 'supervisor') {
    updates.supervisorId = Number.isFinite(Number(supervisorId))
      ? Number(supervisorId)
      : null
  }

  const updatedGuard = await dbUpdateGuard(Number(id), updates)

  if (!updatedGuard) {
    return res.status(404).json({ message: 'Guard not found' })
  }

  return res.json({
    id: updatedGuard.id,
    name: updatedGuard.name,
    role: updatedGuard.role,
    supervisorId: updatedGuard.supervisorId,
  })
}

export async function removeGuard(req, res) {
  const { id } = req.params

  const guard = await getGuardById(Number(id))
  if (!guard) {
    return res.status(404).json({ message: 'Guard not found' })
  }

  if (!guardBelongsToUser(req.user, guard)) {
    return res.status(403).json({ message: 'Forbidden' })
  }

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

  const guard = await getGuardById(Number(id))
  if (!guard) {
    return res.status(404).json({ message: 'Guard not found' })
  }

  if (!guardBelongsToUser(req.user, guard)) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const success = await assignCheckpointsToGuard(Number(id), checkpointIds)

  if (!success) {
    return res.status(404).json({ message: 'Guard not found' })
  }

  return res.json({ message: 'Checkpoints assigned successfully' })
}

export async function unassignCheckpointController(req, res) {
  const { id, checkpointId } = req.params

  const guard = await getGuardById(Number(id))
  if (!guard) {
    return res.status(404).json({ message: 'Guard not found' })
  }

  if (!guardBelongsToUser(req.user, guard)) {
    return res.status(403).json({ message: 'Forbidden' })
  }

  const success = await dbUnassignCheckpoint(Number(id), checkpointId)

  if (!success) {
    return res.status(404).json({ message: 'Guard or checkpoint not found' })
  }

  return res.json({ message: 'Checkpoint unassigned successfully' })
}
