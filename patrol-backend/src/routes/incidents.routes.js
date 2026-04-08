import express from 'express'
import { create, getAll, remove } from '../controllers/incidents.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = express.Router()

// Guard can report incidents
router.post('/', requireAuth(), create)

// Admin can view all incidents
router.get('/', requireAuth(['admin', 'supervisor']), getAll)
router.delete('/:id', requireAuth(['admin', 'supervisor']), remove)

export default router
