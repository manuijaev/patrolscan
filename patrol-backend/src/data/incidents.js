import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataPath = path.join(__dirname, 'incidents.json')

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
  } catch {
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
  const incidents = await readData()
  return incidents.find(inc => inc.id === id)
}

export async function create(incident) {
  const incidents = await readData()
  const newIncident = {
    id: `incident-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...incident,
    createdAt: new Date().toISOString(),
  }
  incidents.push(newIncident)
  await writeData(incidents)
  return newIncident
}

export async function remove(id) {
  const incidents = await readData()
  const nextIncidents = incidents.filter(inc => inc.id !== id)
  if (nextIncidents.length === incidents.length) return false
  await writeData(nextIncidents)
  return true
}
