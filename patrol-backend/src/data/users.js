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

// In-memory guards array - initialize synchronously to prevent race conditions
let guards = []
let initialized = false

// Initialize guards on module load
async function initializeGuards() {
  if (initialized) return
  try {
    guards = await loadGuards()
    initialized = true
    console.log('Guards loaded:', guards.length)
  } catch (err) {
    console.error('Failed to load guards:', err)
    guards = []
    initialized = true
  }
}

// Call initialization immediately
initializeGuards()

export const admins = [
  {
    id: 1,
    email: 'kenyaniemmanuel44@gmail.com',
    password: '$2b$10$KHcLCoN0TYO2K2Q4.Nc5EeFVgIzt3KakDHFPBKqfupd3At22gyNma',
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

// Assign checkpoints to a guard
export async function assignCheckpoints(guardId, checkpointIds) {
  const index = guards.findIndex(g => g.id === guardId)
  if (index === -1) return false
  
  guards[index].assignedCheckpoints = checkpointIds
  await saveGuards(guards)
  return true
}

// Get guard with assigned checkpoints
export function getGuardWithCheckpoints(guardId) {
  const guard = guards.find(g => g.id === guardId)
  if (!guard) return null
  return {
    ...guard,
    assignedCheckpoints: guard.assignedCheckpoints || []
  }
}

// Get all guards with assigned checkpoints
export function getGuardsWithCheckpoints() {
  return guards.map(g => ({
    ...g,
    assignedCheckpoints: g.assignedCheckpoints || []
  }))
}

// Unassign a single checkpoint from a guard
export async function unassignCheckpoint(guardId, checkpointId) {
  const index = guards.findIndex(g => g.id === guardId)
  if (index === -1) return false
  
  if (!guards[index].assignedCheckpoints) {
    return false
  }
  
  guards[index].assignedCheckpoints = guards[index].assignedCheckpoints.filter(id => id !== checkpointId)
  await saveGuards(guards)
  return true
}
