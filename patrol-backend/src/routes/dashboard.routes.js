import express from 'express'
import { getStats, getTimeline, getGuardPerformance, getCheckpointStatus, getUpcomingPatrols } from '../controllers/dashboard.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = express.Router()

// All dashboard routes require admin authentication
router.get('/stats', requireAuth, requireRole('admin'), getStats)
router.get('/timeline', requireAuth, requireRole('admin'), getTimeline)
router.get('/guard-performance', requireAuth, requireRole('admin'), getGuardPerformance)
router.get('/checkpoint-status', requireAuth, requireRole('admin'), getCheckpointStatus)
router.get('/upcoming-patrols', requireAuth, requireRole('admin'), getUpcomingPatrols)

export default router
