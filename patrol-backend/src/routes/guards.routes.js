import express from 'express'
import {
  listGuards,
  createGuard,
  updateGuardController,
  removeGuard,
  assignCheckpointsController,
  unassignCheckpointController,
} from '../controllers/guards.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.get('/', requireAuth, requireRole('admin'), listGuards)
router.post('/', requireAuth, requireRole('admin'), createGuard)
router.put('/:id', requireAuth, requireRole('admin'), updateGuardController)
router.delete('/:id', requireAuth, requireRole('admin'), removeGuard)
router.put('/:id/assign-checkpoints', requireAuth, requireRole('admin'), assignCheckpointsController)
router.delete('/:id/unassign-checkpoint/:checkpointId', requireAuth, requireRole('admin'), unassignCheckpointController)

export default router
