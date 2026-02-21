import { DataTypes } from 'sequelize'
import sequelize from '../config.js'

const Guard = sequelize.define('Guard', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  pin: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'guard'
  },
  assignedCheckpoints: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  checkpointResetDates: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'guards',
  timestamps: false
})

export default Guard
