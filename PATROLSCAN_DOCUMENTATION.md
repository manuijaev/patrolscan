# PatrolScan System Documentation

## Overview
PatrolScan is a guard patrol accountability and situational awareness system. It tracks guard patrols, manages checkpoint assignments, and provides real-time monitoring through scan logs, dashboards, and reports.

---

## 1. Patrols & Checkpoint Management

### What is a Patrol?
A **patrol** is a sequence of checkpoint scans assigned to a guard. Each patrol consists of:
- **Guard**: The security personnel performing the patrol
- **Checkpoints**: Specific locations (gates, entrances, zones) that must be scanned
- **Status**: Whether each checkpoint is `pending` or `completed`

### Checkpoint Scanning Process
When a guard scans a QR code at a checkpoint:
1. The app records the GPS location
2. It validates the guard is within the allowed radius of the checkpoint
3. If within range: Result = `passed`
4. If out of range: Result = `failed`

---

## 2. Assign vs Reassign

### Assign (Adding a Checkpoint to a Guard)
| Feature | Description |
|---------|-------------|
| **Purpose** | Add a new checkpoint to a guard's patrol route |
| **When to use** | When creating a new patrol assignment or adding more checkpoints to an existing guard |
| **Status after** | The checkpoint appears as `pending` for that guard |
| **Required** | Both `guardId` and `checkpointId` must be provided |

**API Endpoint**: `POST /patrol-assignments/assign`

```json
{
  "guardId": 1,
  "checkpointId": 5
}
```

**Backend Logic** (`patrols.controller.js` - `assignPatrolCheckpoint`):
1. Validates that both guard and checkpoint exist
2. Checks the guard has permission (belongs to the admin/supervisor)
3. Verifies the checkpoint isn't already assigned
4. Adds the checkpoint to the guard's `assignedCheckpoints` array in the database
5. Returns success message

---

### Reassign (Resetting a Completed Checkpoint)
| Feature | Description |
|---------|-------------|
| **Purpose** | Reset a completed checkpoint so the guard must scan it again |
| **When to use** | When a guard needs to repeat a checkpoint patrol (e.g., after an incident, for verification) |
| **What happens** | The checkpoint status resets from `completed` to `pending` |
| **Scan history** | Previous scan records are preserved (not deleted) |
| **Required** | Both `guardId` and `checkpointId` must be provided, and checkpoint must already be completed |

**API Endpoint**: `POST /patrol-assignments/reassign`

```json
{
  "guardId": 1,
  "checkpointId": 5
}
```

**Backend Logic** (`patrols.controller.js` - `reassignPatrolCheckpoint`):
1. Validates the guard and checkpoint exist
2. Verifies the checkpoint is currently assigned to this guard
3. Verifies the checkpoint is already `completed` (has a successful scan)
4. **Does NOT delete scan history** - only updates the `checkpointResetDates` timestamp
5. The system treats scans BEFORE the reset date as historical; scans AFTER count as new
6. The checkpoint status changes from `completed` to `pending`

**Key Concept - Reset Dates**:
Each guard has a `checkpointResetDates` object in the database:
```javascript
{
  guardId: 1,
  checkpointResetDates: {
    "5": "2024-04-08T10:00:00Z"  // checkpoint 5 was reset at this time
  }
}
```
When calculating if a checkpoint is complete, the system checks if there's a scan AFTER the reset date.

---

## 3. Change Guard (Transfer Checkpoint Ownership)

| Feature | Description |
|---------|-------------|
| **Purpose** | Move a checkpoint from one guard to another |
| **When to use** | When reassigning patrol responsibilities (shift changes, guard replacements) |
| **Effect** | The old guard no longer has this checkpoint; the new guard receives it |
| **Status for new guard** | The checkpoint appears as `pending` (not completed) |

**API Endpoint**: `PUT /patrol-assignments/update`

```json
{
  "checkpointId": 5,
  "newGuardId": 2
}
```

**Backend Logic** (`patrols.controller.js` - `updatePatrolAssignment`):
1. Validates the new guard exists and is accessible
2. Finds ALL guards currently assigned this checkpoint
3. Removes the checkpoint from their `assignedCheckpoints` array
4. Adds the checkpoint to the new guard's array
5. Returns success with both guard IDs

---

## 4. Upcoming Patrols Page

The **Upcoming Patrols** page (`src/pages/UpcomingPatrols.jsx`) provides a UI for managing all patrol assignments.

### Features
- **View all patrol assignments**: See which checkpoints are assigned to which guards
- **Status tracking**: Real-time display of `pending` vs `completed` status
- **Auto-refresh**: Updates every 5 seconds to show live status changes
- **Assign new**: Add checkpoints to guards
- **Reassign**: Reset completed checkpoints
- **Change guard**: Transfer checkpoint ownership

### UI Components
| Component | Purpose |
|-----------|---------|
| `Assign Patrol` button | Opens modal to add new checkpoint to guard |
| `Reassign` button | Resets a completed checkpoint to pending |
| `Change Guard` button | Opens modal to transfer checkpoint to different guard |
| `Delete` button | Removes checkpoint from guard's assignment |

---

## 5. Scan Validation Logic

When a guard scans a checkpoint, the system performs these validations:

```
1. Is the guard within the GPS radius allowed for this checkpoint?
   - Yes: Result = "passed"
   - No:  Result = "failed" (reason: "Out of range")

2. Has this checkpoint been reset since the last scan?
   - Uses checkpointResetDates[checkpointId] to determine
   - Scans BEFORE the reset date are treated as historical
   - Scans AFTER the reset date count toward completion
```

### GPS Accuracy
- The system records `GPS Accuracy` (in meters) for each scan
- Guards should wait for GPS lock before scanning (ideally <10m accuracy)
- Low accuracy scans (+/-100m) may result in false failures

---

## 6. Data Persistence

### Current Storage
| Data Type | Storage Method |
|-----------|----------------|
| Guards | PostgreSQL database |
| Checkpoints | PostgreSQL database |
| Scans | PostgreSQL database |
| Incidents | PostgreSQL database |
| Patrol Assignments | PostgreSQL (in Guard model) |

### Key Database Models
- **Guard**: Contains `assignedCheckpoints` array and `checkpointResetDates` object
- **Checkpoint**: Contains location (lat/lng), allowed radius, name
- **Scan**: Contains guardId, checkpointId, result, scannedAt, location, gpsAccuracy

---

## 7. API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/patrol-assignments` | Get all patrol assignments with status |
| POST | `/patrol-assignments/assign` | Assign checkpoint to guard |
| POST | `/patrol-assignments/reassign` | Reset completed checkpoint |
| PUT | `/patrol-assignments/update` | Change guard for checkpoint |
| DELETE | `/patrol-assignments/:guardId/:checkpointId` | Remove checkpoint from guard |
| POST | `/scans` | Record a guard's QR scan |
| GET | `/scans` | Get scan history |
| GET | `/incidents` | Get incident reports |
| POST | `/incidents` | Create incident report |

---

## 8. User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access to all features, can manage all guards |
| **Supervisor** | Can manage guards assigned to them |
| **Guard** | Can scan checkpoints, create incidents |

---

## 9. Key Terms Glossary

| Term | Definition |
|------|------------|
| **Checkpoint** | A physical location (gate, entrance, zone) identified by QR code |
| **Assigned Checkpoint** | A checkpoint added to a guard's patrol route |
| **Reset Date** | Timestamp when a checkpoint was reassigned; resets completion status |
| **Pending** | Checkpoint assigned but not yet scanned |
| **Completed** | Checkpoint successfully scanned by guard |
| **GPS Radius** | Maximum distance (meters) allowed for valid scan |
| **Scan Result** | Either "passed" (within range) or "failed" (out of range) |
| **Incident** | Report created by guard with photo evidence of issues |
