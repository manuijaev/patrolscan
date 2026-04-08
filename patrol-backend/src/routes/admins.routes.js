import express from 'express'
import {
  listAdmins,
  createAdminController,
  updateAdminController,
  deleteAdminController
} from '../controllers/admin.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.get('/', requireAuth, requireRole('admin'), listAdmins)
router.post('/', requireAuth, requireRole('admin'), createAdminController)
router.put('/:id', requireAuth, requireRole('admin'), updateAdminController)
router.delete('/:id', requireAuth, requireRole('admin'), deleteAdminController)

export default router
