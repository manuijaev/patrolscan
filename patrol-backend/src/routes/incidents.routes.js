import express from 'express'
import { create, getAll } from '../controllers/incidents.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = express.Router()

// Guard can report incidents
router.post('/', requireAuth(), create)

// Admin can view all incidents
router.get('/', requireAuth('admin'), getAll)

export default router

