import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { getAdminByEmail, getGuardByName, getAllGuards } from '../db/models/index.js'

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  )
}

export async function adminLogin(req, res) {
  const { email, password } = req.body

  const admin = await getAdminByEmail(email)
  if (!admin) return res.status(401).json({ message: 'Invalid credentials' })

  const match = await bcrypt.compare(password, admin.password)
  if (!match) return res.status(401).json({ message: 'Invalid credentials' })

  const token = generateToken(admin)
  res.json({ token, role: 'admin' })
}

export async function guardLogin(req, res) {
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
}
