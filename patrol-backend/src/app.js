import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.routes.js'
import guardsRoutes from './routes/guards.routes.js'
import patrolsRoutes from './routes/patrols.routes.js'
import checkpointsRoutes from './routes/checkpoints.routes.js'
import scansRoutes from './routes/scans.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import patrolAssignmentsRoutes from './routes/patrol-assignments.routes.js'
import incidentsRoutes from './routes/incidents.routes.js'
import adminsRoutes from './routes/admins.routes.js'
import settingsRoutes from './routes/settings.routes.js'

const app = express()

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://patrolscan.vercel.app',
  'https://patrolscan-admin.vercel.app',
]

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))

app.use(express.json({ limit: '15mb' }))
app.use(express.urlencoded({ extended: true, limit: '15mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/guards', guardsRoutes)
app.use('/api/patrols', patrolsRoutes)
app.use('/api/checkpoints', checkpointsRoutes)
app.use('/api/scans', scansRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/patrol-assignments', patrolAssignmentsRoutes)
app.use('/api/incidents', incidentsRoutes)
app.use('/api/admins', adminsRoutes)
app.use('/api/settings', settingsRoutes)

export default app
