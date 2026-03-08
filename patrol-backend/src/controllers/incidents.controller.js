import * as incidents from '../data/incidents.js'
import * as checkpoints from '../data/checkpoints.js'
import { getGuards } from '../data/users.js'

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

    const checkpoint = await checkpoints.getById(checkpointId)
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
    const guards = getGuards()
    const allCheckpoints = await checkpoints.getAll()

    const enriched = allIncidents
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(incident => {
        const guard = guards.find(g => g.id === incident.guardId)
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

