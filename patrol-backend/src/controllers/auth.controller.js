import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { admins, getGuards } from '../data/users.js'

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  )
}

export async function adminLogin(req, res) {
  const { email, password } = req.body

  const admin = admins.find(a => a.email === email)
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

  const guards = getGuards()
  
  // Find guard by username (case-insensitive)
  const guard = guards.find(g => 
    g.name.toLowerCase() === username.toLowerCase().trim()
  )

  if (!guard) {
    return res.status(401).json({ message: 'Invalid username or PIN' })
  }

  const match = await bcrypt.compare(pin, guard.pin)
  if (!match) {
    return res.status(401).json({ message: 'Invalid username or PIN' })
  }

  const token = generateToken(guard)
  res.json({ token, role: 'guard', guardName: guard.name })
}
