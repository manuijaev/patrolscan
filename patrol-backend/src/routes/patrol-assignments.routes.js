import express from 'express'
import {
  getPatrolAssignments,
  assignPatrolCheckpoint,
  removePatrolCheckpoint,
  reassignPatrolCheckpoint,
  updatePatrolAssignment
} from '../controllers/patrols.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = express.Router()

// Get all patrol assignments with status
router.get('/', requireAuth, requireRole('admin'), getPatrolAssignments)

// Assign a checkpoint to a guard
router.post('/assign', requireAuth, requireRole('admin'), assignPatrolCheckpoint)

// Remove a checkpoint from a guard
router.delete('/remove/:guardId/:checkpointId', requireAuth, requireRole('admin'), removePatrolCheckpoint)

// Re-assign a completed checkpoint (reset status)
router.post('/reassign', requireAuth, requireRole('admin'), reassignPatrolCheckpoint)

// Update checkpoint assignment (change guard)
router.put('/update', requireAuth, requireRole('admin'), updatePatrolAssignment)

export default router
