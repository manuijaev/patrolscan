import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataPath = path.join(__dirname, 'checkpoints.json')

// Initialize file if it doesn't exist
async function initFile() {
  try {
    await fs.access(dataPath)
  } catch {
    await fs.writeFile(dataPath, JSON.stringify([], null, 2))
  }
}

initFile()

async function readData() {
  try {
    const data = await fs.readFile(dataPath, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    return []
  }
}

async function writeData(data) {
  await fs.writeFile(dataPath, JSON.stringify(data, null, 2))
}

export async function getAll() {
  return readData()
}

export async function getById(id) {
  const checkpoints = await readData()
  return checkpoints.find(cp => cp.id === id)
}

export async function create(checkpoint) {
  const checkpoints = await readData()
  const newCheckpoint = {
    id: `cp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...checkpoint,
    createdAt: new Date().toISOString()
  }
  checkpoints.push(newCheckpoint)
  await writeData(checkpoints)
  return newCheckpoint
}

export async function update(id, updates) {
  const checkpoints = await readData()
  const index = checkpoints.findIndex(cp => cp.id === id)
  if (index === -1) return null
  
  checkpoints[index] = {
    ...checkpoints[index],
    ...updates,
    updatedAt: new Date().toISOString()
  }
  await writeData(checkpoints)
  return checkpoints[index]
}

export async function remove(id) {
  const checkpoints = await readData()
  const filtered = checkpoints.filter(cp => cp.id !== id)
  await writeData(filtered)
  return filtered.length < checkpoints.length
}
