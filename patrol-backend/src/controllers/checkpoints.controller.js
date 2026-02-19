import * as checkpoints from '../data/checkpoints.js'

// Get all checkpoints
export const getAll = async (req, res) => {
  try {
    const allCheckpoints = await checkpoints.getAll()
    res.json(allCheckpoints)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch checkpoints' })
  }
}

// Get checkpoint by ID
export const getById = async (req, res) => {
  try {
    const checkpoint = await checkpoints.getById(req.params.id)
    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found' })
    }
    res.json(checkpoint)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch checkpoint' })
  }
}

// Create new checkpoint with GPS data
export const create = async (req, res) => {
  try {
    const {
      name,
      location,
      description,
      latitude,
      longitude,
      accuracy,
      allowed_radius: allowedRadius,
    } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    // Require GPS-based creation for new checkpoints (but do not enforce a hard accuracy threshold here)
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      typeof accuracy !== 'number' ||
      typeof allowedRadius !== 'number'
    ) {
      return res.status(400).json({
        error:
          'Latitude, longitude, accuracy, and allowed_radius are required and must be numbers',
      })
    }

    const newCheckpoint = await checkpoints.create({
      name,
      location: location || '',
      description: description || '',
      latitude,
      longitude,
      allowed_radius: allowedRadius,
      gps_accuracy_at_creation: accuracy,
      created_by: req.user?.id || null,
    })

    res.status(201).json(newCheckpoint)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create checkpoint' })
  }
}

// Update checkpoint (metadata only, not GPS truth)
export const update = async (req, res) => {
  try {
    const { name, location, description } = req.body

    const updated = await checkpoints.update(req.params.id, {
      name,
      location,
      description,
    })

    if (!updated) {
      return res.status(404).json({ error: 'Checkpoint not found' })
    }

    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update checkpoint' })
  }
}

// Delete checkpoint
export const remove = async (req, res) => {
  try {
    const deleted = await checkpoints.remove(req.params.id)

    if (!deleted) {
      return res.status(404).json({ error: 'Checkpoint not found' })
    }

    res.json({ message: 'Checkpoint deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete checkpoint' })
  }
}
