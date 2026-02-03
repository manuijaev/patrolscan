import express from 'express'
import {
  createScan,
  listScans,
} from '../controllers/patrols.controller.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = express.Router()

router.get('/', requireAuth, requireRole('admin'), listScans)
router.post('/scan', requireAuth, createScan)

export default router
