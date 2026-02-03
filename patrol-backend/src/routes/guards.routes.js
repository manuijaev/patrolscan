import express from 'express'
import {
  listGuards,
  createGuard,
  updateGuardController,
  removeGuard,
} from '../controllers/guards.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.get('/', requireAuth, requireRole('admin'), listGuards)
router.post('/', requireAuth, requireRole('admin'), createGuard)
router.put('/:id', requireAuth, requireRole('admin'), updateGuardController)
router.delete('/:id', requireAuth, requireRole('admin'), removeGuard)

export default router
