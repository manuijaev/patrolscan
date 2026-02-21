import sequelize from '../config.js'
import Admin from './Admin.js'
import Guard from './Guard.js'
import Checkpoint from './Checkpoint.js'
import Scan from './Scan.js'

// Export models
export { Admin, Guard, Checkpoint, Scan }

// ==================== GUARD OPERATIONS ====================

// Get all guards
export async function getAllGuards() {
  return await Guard.findAll({
    order: [['id', 'ASC']]
  })
}

// Get guard by ID
export async function getGuardById(id) {
  return await Guard.findByPk(id)
}

// Get guard by name
export async function getGuardByName(name) {
  return await Guard.findOne({ where: { name } })
}

// Create a new guard
export async function createGuard({ name, pin }) {
  const existingGuards = await Guard.findAll()
  const maxId = existingGuards.length > 0 
    ? Math.max(...existingGuards.map(g => g.id)) 
    : 0
  
  const guard = await Guard.create({
    id: maxId + 1,
    name: name.trim(),
    pin,
    role: 'guard',
    isActive: true,
    assignedCheckpoints: [],
    checkpointResetDates: {}
  })
  return guard
}

// Update guard
export async function updateGuard(id, { name, pin }) {
  const guard = await Guard.findByPk(id)
  if (!guard) return null
  
  if (name) guard.name = name
  if (pin) guard.pin = pin
  
  await guard.save()
  return guard
}

// Delete guard (soft delete - set isActive to false)
export async function deleteGuard(id) {
  const guard = await Guard.findByPk(id)
  if (!guard) return false
  
  guard.isActive = false
  await guard.save()
  return true
}

// Assign checkpoints to guard
export async function assignCheckpointsToGuard(guardId, checkpointIds) {
  const guard = await Guard.findByPk(guardId)
  if (!guard) return false
  
  const resetDates = guard.checkpointResetDates || {}
  
  // Set reset date for each checkpoint
  checkpointIds.forEach(cpId => {
    if (!resetDates[cpId]) {
      resetDates[cpId] = new Date().toISOString()
    }
  })
  
  guard.assignedCheckpoints = checkpointIds
  guard.checkpointResetDates = resetDates
  
  await guard.save()
  return true
}

// Reset checkpoint assignment
export async function resetCheckpointAssignment(guardId, checkpointId) {
  const guard = await Guard.findByPk(guardId)
  if (!guard) return false
  
  const resetDates = guard.checkpointResetDates || {}
  resetDates[checkpointId] = new Date().toISOString()
  guard.checkpointResetDates = resetDates
  
  await guard.save()
  return true
}

// Get checkpoint reset date
export async function getCheckpointResetDate(guardId, checkpointId) {
  const guard = await Guard.findByPk(guardId)
  if (!guard || !guard.checkpointResetDates) return null
  return guard.checkpointResetDates[checkpointId] || null
}

// Get all guards with assigned checkpoints
export async function getGuardsWithCheckpoints() {
  return await Guard.findAll()
}

// Get guard with checkpoints
export async function getGuardWithCheckpoints(guardId) {
  return await Guard.findByPk(guardId)
}

// Unassign checkpoint from guard
export async function unassignCheckpoint(guardId, checkpointId) {
  const guard = await Guard.findByPk(guardId)
  if (!guard) return false
  
  const assigned = guard.assignedCheckpoints || []
  guard.assignedCheckpoints = assigned.filter(id => String(id) !== String(checkpointId))
  
  await guard.save()
  return true
}

// ==================== CHECKPOINT OPERATIONS ====================

// Get all checkpoints
export async function getAllCheckpoints() {
  return await Checkpoint.findAll({
    order: [['createdAt', 'DESC']]
  })
}

// Get checkpoint by ID
export async function getCheckpointById(id) {
  return await Checkpoint.findByPk(id)
}

// Create checkpoint
export async function createCheckpoint(checkpoint) {
  const id = `cp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  return await Checkpoint.create({
    id,
    ...checkpoint,
    createdAt: new Date(),
    updatedAt: new Date()
  })
}

// Update checkpoint
export async function updateCheckpoint(id, updates) {
  const checkpoint = await Checkpoint.findByPk(id)
  if (!checkpoint) return null
  
  Object.assign(checkpoint, updates, { updatedAt: new Date() })
  await checkpoint.save()
  return checkpoint
}

// Delete checkpoint
export async function deleteCheckpoint(id) {
  const checkpoint = await Checkpoint.findByPk(id)
  if (!checkpoint) return false
  
  await checkpoint.destroy()
  return true
}

// ==================== SCAN OPERATIONS ====================

// Get all scans
export async function getAllScans() {
  return await Scan.findAll({
    order: [['scannedAt', 'DESC']]
  })
}

// Get scans by guard ID
export async function getScansByGuardId(guardId) {
  const scans = await Scan.findAll({
    where: { guardId },
    order: [['scannedAt', 'DESC']]
  })
  
  // Get all checkpoints to map IDs to names
  const checkpoints = await Checkpoint.findAll()
  const checkpointMap = {}
  checkpoints.forEach(cp => {
    checkpointMap[cp.id] = cp.name
  })
  
  // Add checkpoint name to each scan
  return scans.map(scan => ({
    ...scan.toJSON(),
    checkpointName: checkpointMap[scan.checkpointId] || scan.checkpointId,
    timestamp: scan.scannedAt
  }))
}

// Get scans by checkpoint ID
export async function getScansByCheckpointId(checkpointId) {
  return await Scan.findAll({
    where: { checkpointId },
    order: [['scannedAt', 'DESC']]
  })
}

// Get scans by date range
export async function getScansByDateRange(startDate, endDate) {
  return await Scan.findAll({
    where: {
      scannedAt: {
        [sequelize.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      }
    },
    order: [['scannedAt', 'DESC']]
  })
}

// Create scan
export async function createScan(scan) {
  const id = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  return await Scan.create({
    id,
    ...scan,
    scannedAt: scan.scannedAt || new Date()
  })
}

// Delete scan
export async function deleteScan(id) {
  const scan = await Scan.findByPk(id)
  if (!scan) return false
  
  await scan.destroy()
  return true
}

// ==================== ADMIN OPERATIONS ====================

// Get admin by email
export async function getAdminByEmail(email) {
  return await Admin.findOne({ where: { email } })
}

// Create admin
export async function createAdmin({ email, password, role = 'admin' }) {
  return await Admin.create({ email, password, role })
}

// Get all admins
export async function getAllAdmins() {
  return await Admin.findAll()
}
