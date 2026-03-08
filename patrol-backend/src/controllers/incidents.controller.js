import * as incidents from '../data/incidents.js'
import * as db from '../db/models/index.js'

// Guard creates incident
export const create = async (req, res) => {
  try {
    const guardId = req.user.id
    const { checkpointId, comment, images } = req.body

    if (!guardId) {
      return res.status(401).json({ error: 'Guard not authenticated' })
    }

    if (!checkpointId) {
      return res.status(400).json({ error: 'Checkpoint is required' })
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Incident description is required' })
    }

    const checkpoint = await db.getCheckpointById(checkpointId)
    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found' })
    }

    const safeImages =
      Array.isArray(images) && images.length
        ? images.slice(0, 10).filter(img => typeof img === 'string' && img.length <= 2_000_000)
        : []

    const newIncident = await incidents.create({
      guardId,
      checkpointId,
      comment: comment.trim(),
      images: safeImages,
    })

    res.status(201).json(newIncident)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create incident' })
  }
}

// Admin gets all incidents
export const getAll = async (req, res) => {
  try {
    const allIncidents = await incidents.getAll()
    const guards = await db.getAllGuards()
    const allCheckpoints = await db.getAllCheckpoints()

    const enriched = allIncidents
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(incident => {
        const guard = guards.find(g => String(g.id) === String(incident.guardId))
        const checkpoint = allCheckpoints.find(cp => cp.id === incident.checkpointId)
        return {
          ...incident,
          guardName: guard ? guard.name : 'Unknown Guard',
          checkpointName: checkpoint ? checkpoint.name : 'Unknown Checkpoint',
        }
      })

    res.json(enriched)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch incidents' })
  }
}

// Admin deletes incident
export const remove = async (req, res) => {
  try {
    const deleted = await incidents.remove(req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Incident not found' })
    }
    res.json({ message: 'Incident deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete incident' })
  }
}
