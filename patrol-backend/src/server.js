import app from './app.js'
import dotenv from 'dotenv'
import { testConnection, syncDatabase } from './db/config.js'

dotenv.config()

const PORT = process.env.PORT || 5000

// Initialize database and start server
async function startServer() {
  try {
    // Test database connection
    const connected = await testConnection()
    if (!connected) {
      console.error('Failed to connect to database. Please check your PostgreSQL configuration.')
      process.exit(1)
    }
    
    // Sync database models (create tables if they don't exist)
    await syncDatabase()
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`)
      console.log('Database: PostgreSQL')
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
