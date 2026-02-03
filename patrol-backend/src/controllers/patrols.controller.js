const patrolLogs = []

export function createScan(req, res) {
  const { checkpointCode, scannedAt } = req.body

  if (!checkpointCode || typeof checkpointCode !== 'string') {
    return res.status(400).json({ message: 'checkpointCode required' })
  }

  const log = {
    id: patrolLogs.length + 1,
    guardId: req.user.id,
    checkpointCode,
    scannedAt: scannedAt || new Date().toISOString(),
    serverAt: new Date().toISOString(),
  }

  patrolLogs.unshift(log)
  return res.status(201).json({ status: 'success', log })
}

export function listScans(req, res) {
  return res.json(patrolLogs)
}
