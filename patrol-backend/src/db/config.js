import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'

dotenv.config()

// Check if we have a DATABASE_URL (Render provides this)
const useDatabaseUrl = !!process.env.DATABASE_URL

// Create Sequelize instance
const sequelize = useDatabaseUrl
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    })
  : new Sequelize(
      process.env.DB_NAME || 'patrol_dashboard',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || 'postgres',
      {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
          max: 10,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      }
    )

// Test database connection
export async function testConnection() {
  try {
    await sequelize.authenticate()
    console.log('Database connection established successfully.')
    return true
  } catch (error) {
    console.error('Unable to connect to the database:', error)
    return false
  }
}

// Sync models (create tables if they don't exist)
export async function syncDatabase() {
  try {
    // Use force: true to drop and recreate tables if they exist but are out of sync
    await sequelize.sync({ alter: true })
    console.log('Database models synchronized successfully.')
    return true
  } catch (error) {
    console.error('Error synchronizing database models:', error)
    // Try with force if alter fails
    try {
      await sequelize.sync({ force: true })
      console.log('Database models synchronized with force sync.')
      return true
    } catch (forceError) {
      console.error('Force sync also failed:', forceError)
      return false
    }
  }
}

export default sequelize
