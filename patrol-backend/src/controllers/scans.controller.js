// Scans controller
import { 
  getAllScans, 
  createScan as dbCreateScan, 
  getScansByGuardId, 
  getScansByCheckpointId, 
  getScansByDateRange as getScansByDateRangeDb,
  deleteScan 
} from '../db/models/index.js'
import { getGuardWithCheckpoints } from '../db/models/index.js'

// List all scans (admin)
export async function getAll(req, res) {
  try {
    const scans = await getAllScans()
    res.json(scans)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Get scans by guard
export async function getByGuard(req, res) {
  try {
    const { guardId } = req.user
    const scans = await getScansByGuardId(guardId)
    res.json(scans)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Get scans by date range
export async function getByDateRange(req, res) {
  try {
    const { startDate, endDate } = req.query
    const scans = await getScansByDateRangeDb(startDate, endDate)
    res.json(scans)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Record a scan (guard)
export async function recordScan(req, res) {
  try {
    // JWT stores 'id', not 'guardId'
    const guardId = req.user.id
    const { checkpointId, location, result, failureReason, scannedAt } = req.body
    
    if (!checkpointId) {
      return res.status(400).json({ message: 'checkpointId is required' })
    }
    
    // Check if guard is designated for this checkpoint (has it assigned)
    const guard = await getGuardWithCheckpoints(guardId)
    
    // Use loose comparison to handle both string and number formats
    const isDesignated = guard && guard.assignedCheckpoints && 
      guard.assignedCheckpoints.some(cpId => String(cpId) === String(checkpointId))
    
    // If not designated, return error
    if (!isDesignated) {
      return res.status(403).json({ 
        designated: false,
        message: 'You are not assigned to this checkpoint'
      })
    }
    
    const scan = await dbCreateScan({
      guardId,
      checkpointId,
      location: location || null,
      result: result || 'passed',
      failureReason: failureReason || null,
      scannedAt: scannedAt || new Date().toISOString()
    })
    
    res.status(201).json({
      ...scan.toJSON(),
      designated: true,
      result: 'passed'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Remove a scan
export async function remove(req, res) {
  try {
    const { id } = req.params
    await deleteScan(id)
    res.json({ message: 'Scan removed' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Legacy function for patrols route
export async function listScans(req, res) {
  try {
    const scans = await getAllScans()
    res.json(scans)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Legacy function for patrols route
export async function createScan(req, res) {
  try {
    const { guardId, checkpointId, location, result, failureReason, scannedAt } = req.body
    
    if (!guardId || !checkpointId) {
      return res.status(400).json({ message: 'guardId and checkpointId are required' })
    }
    
    const scan = await dbCreateScan({
      guardId,
      checkpointId,
      location: location || null,
      result: result || 'passed',
      failureReason: failureReason || null,
      scannedAt: scannedAt || new Date().toISOString()
    })
    
    res.status(201).json(scan)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
