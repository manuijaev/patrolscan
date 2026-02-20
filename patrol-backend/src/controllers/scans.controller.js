// Scans controller
import { getAll as getAllScansData, create as createScanData, getByGuardId, getByCheckpointId, getByDateRange as getByDateRangeData, create, remove as removeScanData } from '../data/scans.js'

// List all scans (admin)
export async function getAll(req, res) {
  try {
    const scans = await getAllScansData()
    res.json(scans)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Get scans by guard
export async function getByGuard(req, res) {
  try {
    const { guardId } = req.user
    const scans = await getByGuardId(guardId)
    res.json(scans)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Get scans by date range
export async function getByDateRange(req, res) {
  try {
    const { startDate, endDate } = req.query
    const scans = await getByDateRangeData(startDate, endDate)
    res.json(scans)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Record a scan (guard)
export async function recordScan(req, res) {
  try {
    const { guardId } = req.user
    const { checkpointId, location, result, failureReason, scannedAt } = req.body
    
    if (!checkpointId) {
      return res.status(400).json({ message: 'checkpointId is required' })
    }
    
    // Check if guard is designated for this checkpoint (has it assigned)
    const { getGuards } = await import('../data/users.js')
    const guards = getGuards()
    const guard = guards.find(g => Number(g.id) === Number(guardId))
    
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
    
    const scan = await createScanData({
      guardId,
      checkpointId,
      location: location || null,
      result: result || 'passed',
      failureReason: failureReason || null,
      scannedAt: scannedAt || new Date().toISOString()
    })
    
    res.status(201).json({
      ...scan,
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
    await removeScanData(Number(id))
    res.json({ message: 'Scan removed' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Legacy function for patrols route
export async function listScans(req, res) {
  try {
    const scans = await getAllScansData()
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
    
    const scan = await createScanData({
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
