import express from 'express'
import { getStats, getTimeline, getGuardPerformance, getCheckpointStatus, getUpcomingPatrols, getNotifications, getNotificationState, updateNotificationState } from '../controllers/dashboard.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = express.Router()

// All dashboard routes require admin authentication
router.get('/stats', requireAuth, requireRole(['admin', 'supervisor']), getStats)
router.get('/timeline', requireAuth, requireRole(['admin', 'supervisor']), getTimeline)
router.get('/guard-performance', requireAuth, requireRole(['admin', 'supervisor']), getGuardPerformance)
router.get('/checkpoint-status', requireAuth, requireRole(['admin', 'supervisor']), getCheckpointStatus)
router.get('/upcoming-patrols', requireAuth, requireRole(['admin', 'supervisor']), getUpcomingPatrols)
router.get('/notifications', requireAuth, requireRole(['admin', 'supervisor']), getNotifications)
router.get('/notifications/state', requireAuth, requireRole(['admin', 'supervisor']), getNotificationState)
router.post('/notifications/state', requireAuth, requireRole(['admin', 'supervisor']), updateNotificationState)

export default router
