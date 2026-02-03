import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { admins, addGuard, getGuards, updateGuard, deleteGuard } from '../data/users.js'

const router = express.Router()

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  )
}

// Admin Login
router.post('/admin/login', (req, res) => {
  const { email, password } = req.body

  const admin = admins.find(a => a.email === email)
  if (!admin) return res.status(401).json({ message: 'Invalid credentials' })

  const match = bcrypt.compareSync(password, admin.password)
  if (!match) return res.status(401).json({ message: 'Invalid credentials' })

  const token = generateToken(admin)
  res.json({ token, role: 'admin' })
})

// Guard Login
router.post('/guard/login', (req, res) => {
  const { username, pin } = req.body

  if (!username || !pin) {
    return res.status(400).json({ message: 'Username and PIN are required' })
  }

  const guards = getGuards()
  
  // Find guard by username (case-insensitive)
  const guard = guards.find(g => 
    g.name.toLowerCase() === username.toLowerCase().trim()
  )

  if (!guard) {
    return res.status(401).json({ message: 'Invalid username or PIN' })
  }

  const match = bcrypt.compareSync(pin, guard.pin)
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
