import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const [, token] = authHeader.split(' ')

  if (!token) {
    return res.status(401).json({ message: 'Missing token' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload
    return next()
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    return next()
  }
}
