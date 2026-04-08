import { DataTypes } from 'sequelize'
import sequelize from '../config.js'

export async function defineIncidentModel() {
  const Incident = sequelize.define('Incident', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    guardId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    checkpointId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    images: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'incidents',
    timestamps: false
  })

  return Incident
}
