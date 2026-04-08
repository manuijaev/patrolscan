import express from 'express'
import {
  updatePatrolMode,
  getPatrolMode,
  saveScheduleConfig,
  getScheduleConfig,
  previewSchedule
} from '../controllers/settings.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = express.Router()

// Get current patrol mode
router.get('/patrol-mode', requireAuth, requireRole(['admin']), getPatrolMode)

// Update patrol mode
router.put('/patrol-mode', requireAuth, requireRole(['admin']), updatePatrolMode)

// Get schedule config
router.get('/schedule-config', requireAuth, requireRole(['admin']), getScheduleConfig)

// Save schedule config
router.post('/schedule-config', requireAuth, requireRole(['admin']), saveScheduleConfig)

// Preview schedule (generate slots without saving)
router.post('/schedule-preview', requireAuth, requireRole(['admin']), previewSchedule)

export default router
