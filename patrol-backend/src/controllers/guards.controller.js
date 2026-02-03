import { getGuards, addGuard, updateGuard, deleteGuard } from '../data/users.js'

export function listGuards(req, res) {
  const safeGuards = getGuards().map(g => ({
    id: g.id,
    name: g.name,
    role: g.role,
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
