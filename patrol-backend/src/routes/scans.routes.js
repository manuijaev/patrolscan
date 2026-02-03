import express from 'express'
import { getAll, getByGuard, getByDateRange, recordScan, remove } from '../controllers/scans.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = express.Router()

// Guard can record scans
router.post('/record', requireAuth(), recordScan)

// Guard can get their own scans
router.get('/my-scans', requireAuth(), getByGuard)

// Admin routes
router.get('/', requireAuth('admin'), getAll)
router.get('/date-range', requireAuth('admin'), getByDateRange)
router.delete('/:id', requireAuth('admin'), remove)

export default router
