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

// Create new checkpoint
export const create = async (req, res) => {
  try {
    const { name, location, description } = req.body
    
    if (!name || !location) {
      return res.status(400).json({ error: 'Name and location are required' })
    }

    const newCheckpoint = await checkpoints.create({
      name,
      location,
      description: description || ''
    })
    
    res.status(201).json(newCheckpoint)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create checkpoint' })
  }
}

// Update checkpoint
export const update = async (req, res) => {
  try {
    const { name, location, description } = req.body
    const updated = await checkpoints.update(req.params.id, { name, location, description })
    
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
