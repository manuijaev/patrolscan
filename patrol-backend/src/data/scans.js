import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataPath = path.join(__dirname, 'scans.json')

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

export async function getByGuardId(guardId) {
  const scans = await readData()
  return scans.filter(s => s.guardId === guardId)
}

export async function getByCheckpointId(checkpointId) {
  const scans = await readData()
  return scans.filter(s => s.checkpointId === checkpointId)
}

export async function create(scan) {
  const scans = await readData()
  const newScan = {
    id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...scan,
    scannedAt: new Date().toISOString()
  }
  scans.push(newScan)
  await writeData(scans)
  return newScan
}

export async function getByDateRange(startDate, endDate) {
  const scans = await readData()
  const start = new Date(startDate)
  const end = new Date(endDate)
  return scans.filter(s => {
    const scanDate = new Date(s.scannedAt)
    return scanDate >= start && scanDate <= end
  })
}

export async function remove(id) {
  const scans = await readData()
  const filtered = scans.filter(s => s.id !== id)
  await writeData(filtered)
  return filtered.length < scans.length
}
