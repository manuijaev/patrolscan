import { DataTypes } from 'sequelize'
import sequelize from '../config.js'

const Scan = sequelize.define('Scan', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  guardId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  checkpointId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  scannedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  result: {
    type: DataTypes.STRING,
    defaultValue: 'passed'
  },
  failureReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  location: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'scans',
  timestamps: false
})

export default Scan
