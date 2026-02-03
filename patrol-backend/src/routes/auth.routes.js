import express from 'express'
import { adminLogin, guardLogin } from '../controllers/auth.controller.js'

const router = express.Router()

router.post('/admin/login', adminLogin)
router.post('/guard/login', guardLogin)

export default router
