import * as scans from '../data/scans.js'
import * as checkpoints from '../data/checkpoints.js'
import { getGuards } from '../data/users.js'

// Get all scans
export const getAll = async (req, res) => {
  try {
    const allScans = await scans.getAll()
    const guards = getGuards()
    
    // Enrich with guard and checkpoint data
    const enrichedScans = await Promise.all(allScans.map(async (scan) => {
      const guard = guards.find(g => g.id === scan.guardId)
      const checkpoint = await checkpoints.getById(scan.checkpointId)
      return {
        ...scan,
        guardName: guard ? guard.name : 'Unknown',
        checkpointName: checkpoint ? checkpoint.name : 'Unknown'
      }
    }))
    
    res.json(enrichedScans)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scans' })
  }
}

// Get scans by guard (from token)
export const getByGuard = async (req, res) => {
  try {
    const guardId = req.user.id
    const guardScans = await scans.getByGuardId(guardId)
    const guards = getGuards()
    
    // Enrich with checkpoint data
    const enrichedScans = await Promise.all(guardScans.map(async (scan) => {
      const checkpoint = await checkpoints.getById(scan.checkpointId)
      return {
        ...scan,
        checkpointName: checkpoint ? checkpoint.name : 'Unknown'
      }
    }))
    
    res.json(enrichedScans)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch guard scans' })
  }
}

// Get scans by date range
export const getByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const filteredScans = await scans.getByDateRange(startDate, endDate)
    const guards = getGuards()
    
    // Enrich with guard and checkpoint data
    const enrichedScans = await Promise.all(filteredScans.map(async (scan) => {
      const guard = guards.find(g => g.id === scan.guardId)
      const checkpoint = await checkpoints.getById(scan.checkpointId)
      return {
        ...scan,
        guardName: guard ? guard.name : 'Unknown',
        checkpointName: checkpoint ? checkpoint.name : 'Unknown'
      }
    }))
    
    res.json(enrichedScans)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scans by date range' })
  }
}

// Record a new scan (called by guards scanning QR codes)
export const recordScan = async (req, res) => {
  try {
    const guardId = req.user.id
    const { checkpointId, checkpointName, latitude, longitude, notes, designatedUser } = req.body
    
    if (!guardId || !checkpointId) {
      return res.status(400).json({ error: 'Guard ID and Checkpoint ID are required' })
    }
    
    // Verify guard exists
    const guards = getGuards()
    const guard = guards.find(g => g.id === guardId)
    if (!guard) {
      return res.status(404).json({ error: 'Guard not found' })
    }
    
    // Verify checkpoint exists
    const checkpoint = await checkpoints.getById(checkpointId)
    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found' })
    }
    
    // Check if guard is designated for this checkpoint (validate designatedUser from QR)
    // The QR code should contain "designatedUser" field that matches the guard's name
    let isDesignated = true
    if (designatedUser) {
      // Compare case-insensitively
      isDesignated = designatedUser.toLowerCase().trim() === guard.name.toLowerCase().trim()
    }
    
    if (!isDesignated) {
      return res.status(403).json({ 
        error: 'Not designated',
        message: `This checkpoint is designated for ${designatedUser}. You are ${guard.name}`,
        designated: false
      })
    }
    
    const newScan = await scans.create({
      guardId,
      checkpointId,
      latitude: latitude || null,
      longitude: longitude || null,
      notes: notes || ''
    })
    
    res.status(201).json({
      ...newScan,
      guardName: guard.name,
      checkpointName: checkpoint.name,
      message: 'Scan recorded successfully',
      designated: true
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to record scan' })
  }
}

// Delete scan
export const remove = async (req, res) => {
  try {
    const deleted = await scans.remove(req.params.id)
    
    if (!deleted) {
      return res.status(404).json({ error: 'Scan not found' })
    }
    
    res.json({ message: 'Scan deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete scan' })
  }
}
