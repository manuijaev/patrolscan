import express from 'express'
import { getAll, getById, create, update, remove } from '../controllers/checkpoints.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = express.Router()

// Any authenticated user (admin or guard) can read checkpoints
router.get('/', requireAuth(), getAll)
router.get('/:id', requireAuth(), getById)

// Only admins can manage checkpoints
router.post('/', requireAuth('admin'), create)
router.put('/:id', requireAuth('admin'), update)
router.delete('/:id', requireAuth('admin'), remove)

export default router
