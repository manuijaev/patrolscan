import { getGuards, addGuard, updateGuard, deleteGuard, assignCheckpoints, getGuardsWithCheckpoints, unassignCheckpoint } from '../data/users.js'

export function listGuards(req, res) {
  const safeGuards = getGuardsWithCheckpoints().map(g => ({
    id: g.id,
    name: g.name,
    role: g.role,
    assignedCheckpoints: g.assignedCheckpoints || [],
  }))
  res.json(safeGuards)
}

export function createGuard(req, res) {
  const { name, pin } = req.body

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ message: 'Name is required' })
  }

  if (!pin || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ message: 'PIN must be 4 digits' })
  }

  const guard = addGuard({ name: name.trim(), pin })

  return res.status(201).json({
    id: guard.id,
    name: guard.name,
    role: guard.role,
    assignedCheckpoints: [],
  })
}

export function updateGuardController(req, res) {
  const { id } = req.params
  const { name, pin } = req.body

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ message: 'Name is required' })
  }

  if (pin && !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ message: 'PIN must be 4 digits if provided' })
  }

  const success = updateGuard(Number(id), { name: name.trim(), pin })

  if (!success) {
    return res.status(404).json({ message: 'Guard not found' })
  }

  return res.json({ message: 'Guard updated successfully' })
}

export function removeGuard(req, res) {
  const { id } = req.params
  
  const success = deleteGuard(Number(id))
  
  if (!success) {
    return res.status(404).json({ message: 'Guard not found' })
  }
  
  return res.json({ message: 'Guard deleted successfully' })
}

export function assignCheckpointsController(req, res) {
  const { id } = req.params
  const { checkpointIds } = req.body

  if (!Array.isArray(checkpointIds)) {
    return res.status(400).json({ message: 'checkpointIds must be an array' })
  }

  const success = assignCheckpoints(Number(id), checkpointIds)

  if (!success) {
    return res.status(404).json({ message: 'Guard not found' })
  }

  return res.json({ message: 'Checkpoints assigned successfully' })
}

export async function unassignCheckpointController(req, res) {
  const { id, checkpointId } = req.params

  const success = await unassignCheckpoint(Number(id), Number(checkpointId))

  if (!success) {
    return res.status(404).json({ message: 'Guard or checkpoint not found' })
  }

  return res.json({ message: 'Checkpoint unassigned successfully' })
}
