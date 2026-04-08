// Settings controller - handles patrol mode and schedule configuration
import { getAdminById, updateAdmin } from '../db/models/index.js'
import { getAllScans } from '../db/models/index.js'
import { generateSlots, validateScheduleConfig } from '../utils/schedule.js'
import ScheduleConfig from '../db/models/ScheduleConfig.js'
import sequelize from '../db/config.js'

// Update patrol mode
export const updatePatrolMode = async (req, res) => {
  try {
    const { patrolMode } = req.body
    const adminId = req.user.id
    
    if (!patrolMode || !['FREE', 'SCHEDULED'].includes(patrolMode)) {
      return res.status(400).json({ error: 'patrolMode must be FREE or SCHEDULED' })
    }
    
    const admin = await getAdminById(adminId)
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' })
    }
    
    await admin.update({ patrolMode })
    
    res.json({
      message: 'Patrol mode updated successfully',
      patrolMode
    })
  } catch (error) {
    console.error('Error updating patrol mode:', error)
    res.status(500).json({ error: 'Failed to update patrol mode' })
  }
}

// Get current patrol mode
export const getPatrolMode = async (req, res) => {
  try {
    const adminId = req.user.id
    const admin = await getAdminById(adminId)
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' })
    }
    
    res.json({
      patrolMode: admin.patrolMode || 'FREE'
    })
  } catch (error) {
    console.error('Error getting patrol mode:', error)
    res.status(500).json({ error: 'Failed to get patrol mode' })
  }
}

// Save schedule config
export const saveScheduleConfig = async (req, res) => {
  try {
    const { startTime, endTime, frequencyMinutes } = req.body
    const adminId = req.user.id
    
    // Validate input
    const errors = validateScheduleConfig({ startTime, endTime, frequencyMinutes })
    if (errors.length > 0) {
      return res.status(400).json({ errors })
    }
    
    // Check for existing config
    const existingConfig = await ScheduleConfig.findOne({
      where: { adminId }
    })
    
    if (existingConfig) {
      // Update existing
      await existingConfig.update({
        startTime,
        endTime,
        frequencyMinutes
      })
      
      res.json({
        message: 'Schedule config updated successfully',
        config: {
          id: existingConfig.id,
          startTime: existingConfig.startTime,
          endTime: existingConfig.endTime,
          frequencyMinutes: existingConfig.frequencyMinutes
        }
      })
    } else {
      // Create new
      const newConfig = await ScheduleConfig.create({
        adminId,
        startTime,
        endTime,
        frequencyMinutes
      })
      
      res.json({
        message: 'Schedule config created successfully',
        config: {
          id: newConfig.id,
          startTime: newConfig.startTime,
          endTime: newConfig.endTime,
          frequencyMinutes: newConfig.frequencyMinutes
        }
      })
    }
  } catch (error) {
    console.error('Error saving schedule config:', error)
    res.status(500).json({ error: 'Failed to save schedule config' })
  }
}

// Get schedule config
export const getScheduleConfig = async (req, res) => {
  try {
    const adminId = req.user.id
    
    const config = await ScheduleConfig.findOne({
      where: { adminId }
    })
    
    if (!config) {
      return res.json({
        config: null,
        message: 'No schedule config found'
      })
    }
    
    res.json({
      config: {
        id: config.id,
        startTime: config.startTime,
        endTime: config.endTime,
        frequencyMinutes: config.frequencyMinutes,
        createdAt: config.createdAt
      }
    })
  } catch (error) {
    console.error('Error getting schedule config:', error)
    res.status(500).json({ error: 'Failed to get schedule config' })
  }
}

// Preview schedule - generate slots without saving
export const previewSchedule = async (req, res) => {
  try {
    const { startTime, endTime, frequencyMinutes } = req.body
    
    // Validate input
    const errors = validateScheduleConfig({ startTime, endTime, frequencyMinutes })
    if (errors.length > 0) {
      return res.status(400).json({ errors })
    }
    
    const slots = generateSlots({ startTime, endTime, frequencyMinutes })
    
    // Limit slots to prevent abuse
    if (slots.length > 100) {
      return res.status(400).json({ 
        error: `Too many slots (${slots.length}). Please increase the frequency.`
      })
    }
    
    res.json({
      totalSlots: slots.length,
      slots
    })
  } catch (error) {
    console.error('Error previewing schedule:', error)
    res.status(500).json({ error: 'Failed to preview schedule' })
  }
}
