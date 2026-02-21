// Scans controller
import { 
  getAllScans, 
  createScan as dbCreateScan, 
  getScansByGuardId, 
  getScansByCheckpointId,
  getScansByDateRange as getScansByDateRangeDb,
  deleteScan,
  getCheckpointById,
  getAllCheckpoints,
  getGuardsWithCheckpoints
} from '../db/models/index.js'
import { getGuardWithCheckpoints } from '../db/models/index.js'

function toRad(value) {
  return (value * Math.PI) / 180
}

function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadius * c
}

function enrichScansWithNames(scans, guards, checkpoints) {
  const guardNameById = new Map(guards.map(g => [String(g.id), g.name]))
  const checkpointNameById = new Map(checkpoints.map(cp => [String(cp.id), cp.name]))

  return scans.map(scan => {
    const item = scan?.toJSON ? scan.toJSON() : scan
    const guardName = guardNameById.get(String(item.guardId)) || 'Unknown Guard'
    const checkpointName = checkpointNameById.get(String(item.checkpointId)) || 'Unknown Checkpoint'
    return {
      ...item,
      guardName,
      checkpointName,
    }
  })
}

async function validateAndPersistScan({ guardId, payload }) {
  const { checkpointId, location, failureReason, scannedAt, timestamp, latitude, longitude, accuracy } = payload

  if (!checkpointId) {
    return {
      ok: false,
      status: 400,
      body: { message: 'checkpointId is required' }
    }
  }

  const guard = await getGuardWithCheckpoints(guardId)
  const isDesignated = guard && guard.assignedCheckpoints &&
    guard.assignedCheckpoints.some(cpId => String(cpId) === String(checkpointId))

  if (!isDesignated) {
    const scanLat = Number(payload.latitude)
    const scanLon = Number(payload.longitude)
    const scanAccuracy = Number(payload.accuracy)
    const hasLocationPayload =
      Number.isFinite(scanLat) &&
      Number.isFinite(scanLon) &&
      Number.isFinite(scanAccuracy)

    await dbCreateScan({
      guardId,
      checkpointId,
      location: hasLocationPayload
        ? {
            latitude: scanLat,
            longitude: scanLon,
            accuracy: scanAccuracy
          }
        : (location || null),
      result: 'failed',
      failureReason: 'Unauthorized attempt: guard not assigned to checkpoint',
      scannedAt: scannedAt || timestamp || new Date().toISOString()
    })

    return {
      ok: false,
      status: 403,
      body: {
        designated: false,
        message: 'You are not assigned to this checkpoint'
      }
    }
  }

  const checkpoint = await getCheckpointById(checkpointId)
  if (!checkpoint) {
    return {
      ok: false,
      status: 404,
      body: {
        designated: false,
        message: 'Checkpoint not found'
      }
    }
  }

  const checkpointLat = Number(checkpoint.latitude)
  const checkpointLon = Number(checkpoint.longitude)
  const allowedRadius = Number(checkpoint.allowed_radius)
  const scanLat = Number(latitude)
  const scanLon = Number(longitude)
  const scanAccuracy = Number(accuracy)

  const hasCheckpointGps =
    Number.isFinite(checkpointLat) &&
    Number.isFinite(checkpointLon) &&
    Number.isFinite(allowedRadius) &&
    allowedRadius > 0

  if (!hasCheckpointGps) {
    return {
      ok: false,
      status: 400,
      body: {
        designated: false,
        message: 'Checkpoint GPS data is incomplete. Please re-create this checkpoint with GPS coordinates.'
      }
    }
  }

  const hasScanGps =
    Number.isFinite(scanLat) &&
    Number.isFinite(scanLon) &&
    Number.isFinite(scanAccuracy) &&
    scanAccuracy >= 0

  if (!hasScanGps) {
    return {
      ok: false,
      status: 400,
      body: {
        designated: true,
        result: 'failed',
        failureReason: 'Live GPS data is required for scan validation.'
      }
    }
  }

  const distanceMeters = haversineDistanceMeters(scanLat, scanLon, checkpointLat, checkpointLon)
  // Use overlap logic: pass when GPS uncertainty still allows the true
  // position to be within the allowed radius.
  // Distance uncertainty interval is [distance-accuracy, distance+accuracy].
  // If the lower bound is within allowed radius, scan can be valid.
  const minPossibleDistance = Math.max(0, distanceMeters - scanAccuracy)
  const maxPossibleDistance = distanceMeters + scanAccuracy
  const withinRadius = minPossibleDistance <= allowedRadius
  const validationResult = withinRadius ? 'passed' : 'failed'
  const validationFailureReason = withinRadius
    ? null
    : `Out of range. Distance ${distanceMeters.toFixed(2)}m (+/- ${scanAccuracy.toFixed(2)}m accuracy), allowed ${allowedRadius.toFixed(2)}m.`

  const scan = await dbCreateScan({
    guardId,
    checkpointId,
    location: location || {
      latitude: scanLat,
      longitude: scanLon,
      accuracy: scanAccuracy,
      checkpointLatitude: checkpointLat,
      checkpointLongitude: checkpointLon,
      allowedRadius,
      computedDistanceMeters: Number(distanceMeters.toFixed(3)),
      minPossibleDistanceMeters: Number(minPossibleDistance.toFixed(3)),
      maxPossibleDistanceMeters: Number(maxPossibleDistance.toFixed(3))
    },
    result: validationResult,
    failureReason: validationFailureReason || failureReason || null,
    scannedAt: scannedAt || timestamp || new Date().toISOString()
  })

  return {
    ok: true,
    status: 201,
    body: {
      ...scan.toJSON(),
      designated: true,
      result: validationResult,
      failureReason: validationFailureReason
    }
  }
}

// List all scans (admin)
export async function getAll(req, res) {
  try {
    const scans = await getAllScans()
    const [guards, checkpoints] = await Promise.all([
      getGuardsWithCheckpoints(),
      getAllCheckpoints(),
    ])
    res.json(enrichScansWithNames(scans, guards, checkpoints))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Get scans by guard
export async function getByGuard(req, res) {
  try {
    const guardId = req.user?.id
    const scans = await getScansByGuardId(guardId)
    res.json(scans)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Get scans by date range
export async function getByDateRange(req, res) {
  try {
    const { startDate, endDate } = req.query
    const scans = await getScansByDateRangeDb(startDate, endDate)
    const [guards, checkpoints] = await Promise.all([
      getGuardsWithCheckpoints(),
      getAllCheckpoints(),
    ])
    res.json(enrichScansWithNames(scans, guards, checkpoints))
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Record a scan (guard)
export async function recordScan(req, res) {
  try {
    const guardId = req.user.id
    const outcome = await validateAndPersistScan({ guardId, payload: req.body })
    return res.status(outcome.status).json(outcome.body)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Remove a scan
export async function remove(req, res) {
  try {
    const { id } = req.params
    await deleteScan(id)
    res.json({ message: 'Scan removed' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Legacy function for patrols route
export async function listScans(req, res) {
  try {
    const scans = await getAllScans()
    res.json(scans)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Legacy function for patrols route
export async function createScan(req, res) {
  try {
    const guardId = req.user.id
    const outcome = await validateAndPersistScan({ guardId, payload: req.body })
    return res.status(outcome.status).json(outcome.body)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
