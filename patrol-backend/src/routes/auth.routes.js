import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { getAdminByEmail } from '../db/models/index.js'
import { getAllGuards, getGuardByName } from '../db/models/index.js'

const router = express.Router()

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  )
}

// Admin Login
router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body

  const admin = await getAdminByEmail(email)
  if (!admin) return res.status(401).json({ message: 'Invalid credentials' })

  const match = await bcrypt.compare(password, admin.password)
  if (!match) return res.status(401).json({ message: 'Invalid credentials' })

  const token = generateToken(admin)
  res.json({ token, role: 'admin' })
})

// Guard Login
router.post('/guard/login', async (req, res) => {
  const { username, pin } = req.body

  if (!username || !pin) {
    return res.status(400).json({ message: 'Username and PIN are required' })
  }

  // Search for guard case-insensitively
  const allGuards = await getAllGuards()
  const guard = allGuards.find(g => 
    g.name.toLowerCase() === username.toLowerCase().trim()
  )

  // Debug: log guard found
  console.log('Login attempt - username:', username)
  console.log('Available guards:', allGuards.map(g => ({ name: g.name, isActive: g.isActive })))
  console.log('Guard found:', guard ? guard.name : 'not found', 'isActive:', guard?.isActive)

  if (!guard) {
    return res.status(401).json({ message: 'Invalid username or PIN' })
  }

  // Check if guard account is active (treat undefined as true for backwards compatibility)
  if (guard.isActive === false) {
    return res.status(401).json({ message: 'Your account has been removed. Please contact your administrator.' })
  }

  const match = await bcrypt.compare(pin, guard.pin)
  console.log('PIN match:', match)
  
  if (!match) {
    return res.status(401).json({ message: 'Invalid username or PIN' })
  }

  const token = generateToken(guard)
  res.json({ token, role: 'guard', guardName: guard.name })
})

// Create Admin (secret key required)
router.post('/admin/create', async (req, res) => {
  const { email, password, secretKey } = req.body
  
  // Secret key for admin creation (set in environment)
  if (secretKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ message: 'Invalid secret key' })
  }
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' })
  }
  
  // Note: This would need to be persisted - for now just return success
  res.json({ message: 'Admin creation endpoint - configure persistence' })
})

export default router
