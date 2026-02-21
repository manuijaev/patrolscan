import { Sequelize } from 'sequelize'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import { getAdminByEmail, createAdmin, getAllAdmins, getAllGuards } from './models/index.js'

dotenv.config()

async function createDatabaseIfNotExists() {
  // Connect without database to create it
  const adminSequelize = new Sequelize(
    process.env.DB_NAME || 'patrol_dashboard',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: false
    }
  )
  
  try {
    await adminSequelize.query(`CREATE DATABASE ${process.env.DB_NAME || 'patrol_dashboard'}`)
    console.log('Database created successfully.')
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('Database already exists.')
    } else {
      console.log('Database creation skipped:', error.message)
    }
  } finally {
    await adminSequelize.close()
  }
}

async function seed() {
  try {
    // First, try to create the database
    await createDatabaseIfNotExists()
    
    // Import after database is created
    const { testConnection, syncDatabase } = await import('./config.js')
    
    // Test database connection
    console.log('Testing database connection...')
    const connected = await testConnection()
    if (!connected) {
      console.error('Failed to connect to database.')
      process.exit(1)
    }
    
    // Sync database models
    console.log('Syncing database models...')
    await syncDatabase()
    
    // Check if admin exists
    const existingAdmins = await getAllAdmins()
    
    if (existingAdmins.length === 0) {
      // Create default admin
      const hashedPassword = bcrypt.hashSync('admin123', 10)
      await createAdmin({
        email: 'kenyaniemmanuel44@gmail.com',
        password: hashedPassword,
        role: 'admin'
      })
      console.log('Default admin created: kenyaniemmanuel44@gmail.com / admin123')
    } else {
      console.log('Admin(s) already exist in database.')
    }
    
    // Update existing guards to have isActive = true if not set
    try {
      const allGuards = await getAllGuards()
      for (const guard of allGuards) {
        if (guard.isActive === undefined || guard.isActive === null) {
          guard.isActive = true
          await guard.save()
          console.log(`Updated guard ${guard.name} to isActive = true`)
        }
      }
    } catch (err) {
      console.log('Guard migration skipped:', err.message)
    }
    
    console.log('Database seeding completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  }
}

seed()
