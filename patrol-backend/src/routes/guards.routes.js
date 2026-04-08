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

router.get('/', requireAuth, requireRole(['admin', 'supervisor']), listGuards)
router.post('/', requireAuth, requireRole(['admin', 'supervisor']), createGuard)
router.put('/:id', requireAuth, requireRole(['admin', 'supervisor']), updateGuardController)
router.delete('/:id', requireAuth, requireRole(['admin', 'supervisor']), removeGuard)
router.put('/:id/assign-checkpoints', requireAuth, requireRole(['admin', 'supervisor']), assignCheckpointsController)
router.delete('/:id/unassign-checkpoint/:checkpointId', requireAuth, requireRole(['admin', 'supervisor']), unassignCheckpointController)

export default router
