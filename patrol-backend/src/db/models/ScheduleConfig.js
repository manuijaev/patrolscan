import { DataTypes } from 'sequelize'
import sequelize from '../config.js'

const ScheduleConfig = sequelize.define('ScheduleConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  adminId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'admin_id'
  },
  startTime: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'start_time'
  },
  endTime: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'end_time'
  },
  frequencyMinutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'frequency_minutes'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'schedule_configs',
  timestamps: false
})

export default ScheduleConfig
