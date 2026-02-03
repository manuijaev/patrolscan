import bcrypt from 'bcrypt'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataFile = path.join(__dirname, 'guards.json')

// Load guards from file
async function loadGuards() {
  try {
    const data = await fs.readFile(dataFile, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// Save guards to file
async function saveGuards(guards) {
  await fs.writeFile(dataFile, JSON.stringify(guards, null, 2))
}

// In-memory guards array
let guards = []

// Initialize guards
loadGuards().then(loaded => {
  guards = loaded
}).catch(() => {
  guards = []
})

export const admins = [
  {
    id: 1,
    email: 'admin@patrol.com',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
  },
]

export function getGuards() {
  return guards
}

export async function addGuard({ name, pin }) {
  const nextId = guards.length
    ? Math.max(...guards.map(g => g.id)) + 1
    : 1

  const guard = {
    id: nextId,
    name: name.trim(),
    pin: bcrypt.hashSync(pin, 10),
    role: 'guard',
  }

  guards.push(guard)
  
  await saveGuards(guards)
  
  return guard
}

export async function updateGuard(id, { name, pin }) {
  const index = guards.findIndex(g => g.id === id)
  if (index === -1) return false
  
  guards[index].name = name
  if (pin) {
    guards[index].pin = bcrypt.hashSync(pin, 10)
  }
  
  await saveGuards(guards)
  
  return true
}

export async function deleteGuard(id) {
  const index = guards.findIndex(g => g.id === id)
  if (index === -1) return false
  
  guards.splice(index, 1)
  
  await saveGuards(guards)
  
  return true
}
