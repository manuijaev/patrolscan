// Schedule utility - generates time slots for scheduled patrol mode

export function generateSlots({ startTime, endTime, frequencyMinutes }) {
  const slots = []
  
  // Parse time strings (format: "HH:MM")
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  
  // Create dates for comparison
  let current = new Date()
  current.setHours(startHour, startMin, 0, 0)
  
  const end = new Date()
  end.setHours(endHour, endMin, 0, 0)
  
  // Handle overnight schedules: if end time is earlier than start time, it's the next day
  const isOvernight = endHour < startHour || (endHour === startHour && endMin < startMin)
  if (isOvernight) {
    end.setDate(end.getDate() + 1)
  }
  
  // Also handle case where end is midnight (00:00) - treat as next day
  if (endHour === 0 && endMin === 0) {
    end.setDate(end.getDate() + 1)
  }
  
  while (current < end) {
    const currentTime = new Date(current)
    const nextTime = new Date(current.getTime() + frequencyMinutes * 60000)
    
    // Don't add slot if it extends past end time
    if (nextTime > end) {
      break
    }
    
    slots.push({
      start: currentTime.toISOString(),
      end: nextTime.toISOString(),
      startTime: currentTime.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }),
      endTime: nextTime.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
    })
    
    current = nextTime
  }
  
  return slots
}

// Validate schedule config
export function validateScheduleConfig({ startTime, endTime, frequencyMinutes }) {
  const errors = []
  
  // Validate time format
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  
  if (!startTime || !timeRegex.test(startTime)) {
    errors.push('startTime must be in HH:MM format')
  }
  
  if (!endTime || !timeRegex.test(endTime)) {
    errors.push('endTime must be in HH:MM format')
  }
  
  // Parse times to check if overnight
  if (startTime && endTime) {
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    
    // Check if overnight schedule (end time is earlier than start time)
    const isOvernight = endHour < startHour || (endHour === startHour && endMin < startMin)
    const isMidnight = endHour === 0 && endMin === 0
    
    if (!isOvernight && !isMidnight) {
      // Same-day schedule: validate duration
      const startMinutes = startHour * 60 + startMin
      const endMinutes = endHour * 60 + endMin
      const duration = endMinutes - startMinutes
      
      if (duration <= 0) {
        errors.push('End time must be after start time for same-day schedules')
      }
      if (duration > 720) {
        errors.push('Schedule cannot exceed 12 hours')
      }
    }
  }
  
  // Validate frequency
  if (!frequencyMinutes || typeof frequencyMinutes !== 'number') {
    errors.push('frequencyMinutes is required and must be a number')
  }
  
  if (frequencyMinutes < 15) {
    errors.push('frequencyMinutes must be at least 15 minutes')
  }
  
  if (frequencyMinutes > 480) {
    errors.push('frequencyMinutes must not exceed 480 minutes (8 hours)')
  }
  
  return errors
}

// Check if current time falls within a slot
export function isTimeInSlot(currentTime, slot) {
  const now = new Date(currentTime)
  const slotStart = new Date(slot.start)
  const slotEnd = new Date(slot.end)
  
  return now >= slotStart && now < slotEnd
}

// Get slot status based on scan
export function getSlotStatus(slot, scan) {
  if (scan && scan.result !== 'failed') {
    return 'completed'
  }
  
  // Check if slot is in the past
  const now = new Date()
  const slotEnd = new Date(slot.end)
  
  if (slotEnd < now) {
    return 'missed'
  }
  
  // Check if slot is current
  if (isTimeInSlot(now, slot)) {
    return 'in_progress'
  }
  
  return 'upcoming'
}
