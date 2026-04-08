import bcrypt from 'bcrypt'
import {
  getAllAdmins,
  getAdminByEmail,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin
} from '../db/models/index.js'

const ALLOWED_ROLES = ['admin', 'supervisor']

function isSuperAdmin(admin) {
  return admin?.role === 'super-admin'
}

function sanitize(admin) {
  if (!admin) return null
  return {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    isActive: admin.isActive,
  }
}

export async function listAdmins(req, res) {
  try {
    const admins = await getAllAdmins()
    res.json(admins.map(sanitize))
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export async function createAdminController(req, res) {
  try {
    const { email, password, role = 'admin' } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const normalizedRole = role.trim().toLowerCase()
    if (normalizedRole === 'super-admin' && req.user?.role !== 'super-admin') {
      return res.status(403).json({ message: 'Insufficient permissions' })
    }

    if (!ALLOWED_ROLES.includes(normalizedRole) && normalizedRole !== 'super-admin') {
      return res.status(400).json({ message: 'Invalid role' })
    }

    const existing = await getAdminByEmail(email)
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' })
    }

    const hashed = bcrypt.hashSync(password, 10)
    const admin = await createAdmin({ email, password: hashed, role: normalizedRole })
    res.status(201).json(sanitize(admin))
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export async function updateAdminController(req, res) {
  try {
    const { id } = req.params
    const { email, password, role, isActive } = req.body

    const target = await getAdminById(Number(id))
    if (!target) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    if (isSuperAdmin(target) && req.user?.role !== 'super-admin') {
      return res.status(403).json({ message: 'Cannot modify super admin' })
    }

    const updates = {}
    if (email) {
      const existing = await getAdminByEmail(email)
      if (existing && existing.id !== target.id) {
        return res.status(409).json({ message: 'Email already in use' })
      }
      updates.email = email
    }

    if (typeof isActive === 'boolean') {
      if (isSuperAdmin(target) && isActive === false) {
        return res.status(403).json({ message: 'Cannot deactivate super admin' })
      }
      updates.isActive = isActive
    }

    if (role) {
      const normalizedRole = role.trim().toLowerCase()
      if (normalizedRole === 'super-admin' && req.user?.role !== 'super-admin') {
        return res.status(403).json({ message: 'Cannot assign super admin role' })
      }
      if (![...ALLOWED_ROLES, 'super-admin'].includes(normalizedRole)) {
        return res.status(400).json({ message: 'Invalid role' })
      }
      updates.role = normalizedRole
    }

    if (password) {
      updates.password = bcrypt.hashSync(password, 10)
    }

    const updated = await updateAdmin(Number(id), updates)
    res.json(sanitize(updated))
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export async function deleteAdminController(req, res) {
  try {
    const { id } = req.params
    const target = await getAdminById(Number(id))
    if (!target) {
      return res.status(404).json({ message: 'Admin not found' })
    }

    if (isSuperAdmin(target)) {
      return res.status(403).json({ message: 'Cannot delete super admin' })
    }

    await deleteAdmin(Number(id))
    res.json({ message: 'Admin deleted' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
