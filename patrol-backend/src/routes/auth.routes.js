import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { getAdminByEmail } from '../db/models/index.js'
import { getAllAdmins, createAdmin, getAllGuards } from '../db/models/index.js'

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

  console.log('Admin login attempt:', email)
  
  const admin = await getAdminByEmail(email)
  console.log('Admin found:', admin ? admin.email : 'not found')
  
  if (!admin) return res.status(401).json({ message: 'Invalid credentials' })
  if (admin.isActive === false) {
    return res.status(403).json({ message: 'Your account is disabled' })
  }

  const match = await bcrypt.compare(password, admin.password)
  console.log('Password match:', match)
  
  if (!match) return res.status(401).json({ message: 'Invalid credentials' })

  const token = generateToken(admin)
  res.json({ token, role: admin.role || 'admin' })
})

// Admin Registration
router.post('/admin/register', async (req, res) => {
  const { email, password, registrationKey } = req.body

  const normalizedEmail = email?.trim().toLowerCase()
  const trimmedPassword = password?.trim()

  if (!normalizedEmail || !trimmedPassword) {
    return res.status(400).json({ message: 'Email and password are required' })
  }

  if (trimmedPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long' })
  }

  const existingAdmin = await getAdminByEmail(normalizedEmail)
  if (existingAdmin) {
    return res.status(409).json({ message: 'Email already in use' })
  }

  const existingAdmins = await getAllAdmins()
  const adminRegistrationKey = process.env.ADMIN_REGISTRATION_KEY?.trim()

  // Allow open registration only for the first admin.
  // After that, require a configured registration key.
  if (existingAdmins.length > 0) {
    if (!adminRegistrationKey) {
      return res.status(403).json({ message: 'Admin registration is closed. Contact an existing admin.' })
    }

    if (!registrationKey || registrationKey !== adminRegistrationKey) {
      return res.status(403).json({ message: 'Invalid admin registration key' })
    }
  }

  const hashedPassword = await bcrypt.hash(trimmedPassword, 10)
  const role = existingAdmins.length === 0 ? 'super-admin' : 'admin'
  const newAdmin = await createAdmin({
    email: normalizedEmail,
    password: hashedPassword,
    role
  })

  const token = generateToken(newAdmin)
  return res.status(201).json({
    token,
    role: newAdmin.role || role,
    message: 'Admin registered successfully'
  })
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

export default router
