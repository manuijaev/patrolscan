import express from 'express'
import { getAll, getById, create, update, remove } from '../controllers/checkpoints.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = express.Router()

router.get('/', requireAuth('admin'), getAll)
router.get('/:id', requireAuth('admin'), getById)
router.post('/', requireAuth('admin'), create)
router.put('/:id', requireAuth('admin'), update)
router.delete('/:id', requireAuth('admin'), remove)

export default router
