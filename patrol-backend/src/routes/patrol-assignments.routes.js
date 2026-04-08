import express from 'express'
import {
  getPatrolAssignments,
  assignPatrolCheckpoint,
  removePatrolCheckpoint,
  updatePatrolAssignment
} from '../controllers/patrols.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = express.Router()

// Get all patrol assignments with status
router.get('/', requireAuth, requireRole(['admin', 'supervisor']), getPatrolAssignments)

// Assign a checkpoint to a guard
router.post('/assign', requireAuth, requireRole(['admin', 'supervisor']), assignPatrolCheckpoint)

// Remove a checkpoint from a guard
router.delete('/remove/:guardId/:checkpointId', requireAuth, requireRole(['admin', 'supervisor']), removePatrolCheckpoint)

// Update checkpoint assignment (change guard)
router.put('/update', requireAuth, requireRole(['admin', 'supervisor']), updatePatrolAssignment)

export default router
