# PatrolScan Security Patrol Dashboard

PatrolScan is a security patrol management system for supervising guards, assigning checkpoints, validating QR patrol scans, recording incidents, and exporting patrol evidence. It has two connected experiences:

- Admin and supervisor portal for command, configuration, reporting, assignments, and incident review.
- Guard mobile scanner app for QR checkpoint scanning, emergency alerts, incident submission, and offline-aware patrol history.

The system is built for a real operational patrol workflow: create checkpoints at physical locations, assign those checkpoints to guards, let guards scan QR codes from the field, verify the scan with live GPS, and give supervisors a live view of activity, missed patrols, incidents, and reports.

## Core Motion

The central motion of PatrolScan is:

1. An admin or supervisor registers guards and checkpoints.
2. The admin captures GPS coordinates at each checkpoint and generates a QR code for that checkpoint.
3. The checkpoint is assigned to a guard.
4. The guard signs in with a username and 4-digit PIN.
5. The guard scans the checkpoint QR code using the mobile camera.
6. The app validates the scan against assignment, live GPS, distance radius, and schedule rules.
7. The backend records the scan as passed or failed with timestamp, guard, checkpoint, location, GPS accuracy, and failure reason.
8. Dashboards, reports, notifications, and exports update from the recorded patrol data.
9. If something happens in the field, the guard can submit an incident with notes and photos or trigger an emergency alert.

This gives management a traceable patrol record instead of relying on verbal check-ins.

## User Roles

### Guard

Guards use the mobile-first scanner app. Their purpose is to:

- Sign in quickly with username and PIN.
- Scan assigned checkpoint QR codes.
- Prove presence with GPS validation.
- View recent personal scan history.
- Submit incident reports with photos.
- Trigger an emergency alert when under threat.
- Continue working when temporarily offline.

### Admin

Admins use the full portal. Their purpose is to:

- View global patrol performance.
- Manage administrator and supervisor accounts.
- Create checkpoints and QR codes.
- Assign checkpoints to guards.
- Configure free or scheduled patrol mode.
- Review all patrol logs.
- Export reports as CSV or PDF.
- Review and delete incident reports.
- Monitor notifications and emergency alerts.

### Supervisor

Supervisors use a focused command center. Their purpose is to:

- View dashboard analytics.
- Manage guard access and guard PINs.
- Monitor patrols, incidents, reports, and assignments.
- Work with the same operational data while using supervisor-specific navigation.

## Frontend Routes

| Route | Purpose |
| --- | --- |
| `/guard-login` | Guard sign-in with username and 4-digit PIN. |
| `/admin-login` | Admin and supervisor sign-in with email and password. |
| `/admin-register` | Admin registration flow. |
| `/scan` | Guard QR scanner, patrol history, incident form, and emergency alert. |
| `/dashboard` | Admin dashboard with metrics, timeline, guard performance, and patrol focus. |
| `/supervisor-dashboard` | Supervisor command center using dashboard analytics. |
| `/guards` | Admin account management or supervisor guard management depending on role. |
| `/checkpoints` | Checkpoint creation, GPS capture, QR generation, editing, and deletion. |
| `/upcoming-patrols` | Patrol assignment management and completion tracking. |
| `/patrols` | Raw patrol logs with CSV and PDF export. |
| `/reports` | Combined reporting and incident review tabbed workspace. |
| `/incidents` | Incident timeline with photos, alert context, preview, download, and deletion. |
| `/settings` | Patrol mode and schedule configuration. |

## Major Features

### 1. Role-Based Authentication

Purpose: keep each user in the correct workspace.

- Admins and supervisors sign in with email and password.
- Guards sign in with username and 4-digit PIN.
- JWT tokens protect backend routes.
- Admin and supervisor routes are separated from guard-only scanner routes.
- Login pages redirect users based on role.
- Guard login auto-submits when a valid 4-digit PIN is entered.
- Admin login supports password visibility toggle and optional remembered session storage.

Presentation point: show that the system has different entry points for management and field guards.

### 2. Admin Dashboard

Purpose: give management a live operational overview.

The dashboard loads backend metrics and refreshes automatically every 5 seconds. It tracks:

- Patrols completed today.
- Missed patrols.
- Active guards.
- Total checkpoints.
- Completion rate.
- Average response time.
- Efficiency score.
- Recent scan timeline.
- Guard performance and risk-focused cards.
- Upcoming patrol assignments.

Metrics are calculated from actual scans, assignments, guard lists, checkpoints, and current-day windows. Emergency alert scan records are excluded from normal patrol statistics so alerts do not distort patrol performance.

Presentation point: use this screen as the management "command view".

### 3. Supervisor Command Center

Purpose: give supervisors operational visibility without presenting them as full system owners.

The supervisor dashboard uses the same analytics as the admin dashboard but frames it as a supervisor command center. Supervisor navigation also changes labels and access behavior so the interface is role-aware.

Presentation point: show that one system supports multiple authority levels.

### 4. Guard and Admin Management

Purpose: control who can access the system.

For supervisors, the Guards page manages guard records:

- Create guards.
- Set 4-digit PINs.
- Edit guard names.
- Reset PINs.
- Delete guard access.
- Auto-refresh guard data every 10 seconds.

For admins, the same route manages admin and supervisor accounts:

- Create administrators or supervisors.
- Edit account email.
- Change role.
- Reset password.
- Activate or deactivate accounts.
- Delete accounts.
- Protect super-admin accounts from destructive actions.

Presentation point: show that access control is built into the workflow, not handled outside the app.

### 5. Checkpoint Management and QR Generation

Purpose: create physical patrol points that guards must visit.

Admins can:

- Add a checkpoint name.
- Capture GPS coordinates at the actual checkpoint location.
- Capture GPS accuracy.
- Set allowed radius in meters.
- Add a location label and description.
- Save checkpoint records.
- Edit checkpoint name, location label, and description.
- Delete checkpoints.
- Generate a QR code for each checkpoint.
- Download QR code images for printing or placement.

The app requires GPS capture before saving a checkpoint. If GPS accuracy is weak, the UI warns the admin to recapture.

Presentation point: physically show how a real place becomes a scannable patrol checkpoint.

### 6. Patrol Assignment Management

Purpose: define which guard is responsible for which checkpoint.

The Upcoming Patrols page supports:

- Assigning an unassigned checkpoint to a guard.
- Viewing each guard's assigned checkpoints.
- Seeing completed versus total assigned checkpoints.
- Removing a checkpoint from a guard.
- Changing the guard responsible for a checkpoint.
- Highlighting a specific guard-checkpoint assignment when navigated from a notification.
- Auto-refreshing every 5 seconds.

Each assignment shows whether the checkpoint is complete or still in progress based on successful scans after the latest reset point.

Presentation point: show assignment first, then scan as the guard, then return to see completion status change.

### 7. QR Scanner and GPS Validation

Purpose: prove that a guard was at the correct checkpoint.

The guard scanner uses the device camera through `html5-qrcode`. A valid checkpoint scan must satisfy:

- QR code must be valid JSON.
- QR type must be `patrol-checkpoint`.
- QR must include a checkpoint ID.
- Guard must be assigned to that checkpoint.
- Checkpoint must have stored GPS coordinates.
- Guard device must provide live GPS coordinates.
- Scan must be within the checkpoint's allowed radius after considering GPS accuracy.

Scan result behavior:

- Successful scan shows a large success checkmark.
- Failed scan shows a large failure cross.
- Passed scans receive a 2-minute cooldown.
- Failed scans receive a 10-second retry cooldown.
- Duplicate scans are blocked during processing and cooldown.
- The scanner can be restarted manually.
- Device vibration is triggered on successful scan when supported.

The backend stores both pass and fail outcomes. Failed outcomes include reasons such as unauthorized checkpoint attempt, missing GPS data, or out-of-range distance.

Presentation point: demonstrate success and failure states because they prove that the system validates scans rather than only reading QR codes.

### 8. Free Mode and Scheduled Mode

Purpose: support both flexible and time-controlled patrol policies.

Free Mode:

- Guards can scan assigned checkpoints at any time.
- The system logs scans for review.

Scheduled Mode:

- Admin configures start time, end time, and interval.
- The backend generates patrol slots.
- The app supports overnight schedules.
- The admin can preview generated slots before activation.
- Scans outside scheduled slots are recorded with a schedule warning for review.

Presentation point: show that the system can adapt to sites that need strict patrol timing.

### 9. Patrol Logs

Purpose: provide a simple audit table of recorded scans.

The Patrol Logs page shows:

- Scan time.
- Guard name.
- Checkpoint name.
- Result status.
- Total log count.
- CSV export.
- PDF export.

Exports include patrol details such as date, time, guard, checkpoint, result, failure reason, GPS accuracy, and distance versus allowed radius.

Presentation point: explain that this is the simple evidence ledger.

### 10. Reports Workspace

Purpose: give management searchable and exportable patrol evidence.

Reports support:

- Date filters for today, last 7 days, last 30 days, custom range, and all time.
- Search by guard, checkpoint, location, or reason.
- Mobile card view and desktop table view.
- Passed and failed result labels.
- GPS accuracy display.
- Distance versus allowed radius display.
- Failure reason display.
- Select mode for bulk deletion.
- Deletion ranges for last 7 days, last month, last 6 months, and last year.
- CSV export.
- PDF export.

Presentation point: use Reports to show accountability and compliance evidence.

### 11. Incident Reporting

Purpose: capture field issues with context and proof.

From the guard scanner, guards can:

- Select a checkpoint.
- Describe an incident.
- Take a photo using the device camera.
- Choose multiple existing images.
- Attach up to 10 photos.
- Preview selected photos.
- Remove selected photos before submission.
- Submit the incident to the backend.

The frontend compresses incident images before upload and blocks total image payloads that are too large.

From the admin or supervisor portal, managers can:

- View incident timeline.
- See guard, checkpoint, timestamp, notes, and photos.
- Open a full-screen photo preview.
- Download incident photos.
- Delete incident reports.
- See emergency alert context when navigating from a notification.

Presentation point: show this as the proof and escalation feature for abnormal patrol events.

### 12. Emergency Alert

Purpose: allow a guard to request immediate help.

The guard scanner includes a prominent ALERT button. When triggered:

- The guard sends a critical emergency alert to the backend.
- The backend records it as an alert scan, separate from normal patrol logs.
- The alert includes guard identity, assigned checkpoint context, message, timestamp, and alert metadata.
- The guard app shows alert feedback.
- Alert sound can loop locally until stopped.
- Admin notifications classify the alert as critical.

Presentation point: this is the safety feature. It is separate from incident reporting because it is immediate.

### 13. Notification Bell

Purpose: surface urgent or important events to management.

Notifications support:

- Unread counts.
- Severity filters: all, unread, critical, warning, and other.
- Grouping similar notifications.
- Local cache of notification state.
- Read, acknowledge, delete, and reset style local state handling.
- Offline sync queue for notification actions.
- Critical and standard notification sounds.
- Browser notification support when available.
- Fallback tones through Web Audio if audio playback fails.
- Navigation actions to highlighted assignments or incidents.

Presentation point: notifications turn raw patrol events into supervisor actions.

### 14. Offline-Aware Guard Scanning

Purpose: keep field work usable when network conditions are poor.

The guard scanner:

- Detects online and offline status.
- Shows network state in the UI.
- Stores offline scan payloads locally through IndexedDB.
- Keeps recent scan history in local storage.
- Merges API scans and local scans in the recent history panel.
- Allows local hiding/deleting of recent scanner history without deleting backend audit records.

There is also a service worker and PWA setup with caching strategies for documents, assets, and images.

Presentation point: explain that the guard app is designed for mobile patrol conditions, not only stable office networks.

### 15. PWA Install Experience

Purpose: make PatrolScan behave like an installable app.

The app uses Vite PWA support and route-aware install prompts:

- Admin PWA branding for admin routes.
- Guard PWA branding for guard routes.
- Custom manifests in `public/admin-manifest.json` and `public/guard-manifest.json`.
- Install prompt with app icon, title, description, install button, and dismiss option.
- Auto-update service worker registration.
- Runtime caching for documents, scripts, styles, workers, and images.

Presentation point: show that guards can install the scanner on a phone home screen.

### 16. Dynamic Manifest Switching

Purpose: use the right PWA identity for the current user context.

The app includes a dynamic manifest component. It selects admin or guard manifest behavior based on route and experience. This keeps the installed app identity aligned with the role using it.

Presentation point: mention that the same codebase supports two installable experiences.

### 17. Theme System

Purpose: support professional light and dark modes.

The UI uses CSS variables for:

- Background.
- Muted background.
- Panels.
- Strong panels.
- Borders.
- Text.
- Muted text.
- Accent.
- Strong accent.
- Accent soft tint.
- Shadows.

Dark mode is class-based and persisted in local storage. The guard scanner and admin portal both use the shared theme language.

Presentation point: show light and dark mode on the scanner or dashboard.

## Styling Direction

PatrolScan uses a clean operational dashboard style:

- Manrope font for a modern security-console feel.
- Soft white and dark panels.
- Cyan/teal accent color for brand and active states.
- Rounded cards and controls.
- Thin borders and muted backgrounds for dense information.
- Tabler icons for navigation, actions, status, and context.
- Responsive grids for desktop management screens.
- Mobile-first scanner layout for guard use.
- Sticky scanner header for field access.
- Backdrop blur on top bars and sidebars.
- Clear green, red, amber, and blue status colors for pass, fail, warnings, and information.

The styling is meant to look like a practical command system rather than a marketing page.

## Motion and Interaction Design

Motion is used to show state changes and reduce uncertainty.

### Login Motion

The login pages use a 3D flip transition:

- Guard-to-admin and admin-to-guard switching uses left/right flip exits.
- Entry animations rotate cards into view with perspective.
- Login fields rise in sequence.
- Login alerts pop into view.
- Login cards have a subtle sheen animation.
- The login icon floats and pulses.
- The background grid pans slowly.

Purpose: make role switching feel deliberate and premium.

### Page Transition Motion

Admin routes use animated page transitions:

- Forward navigation enters from the side with slight rotation, blur, and scale.
- Backward navigation mirrors the motion direction.
- Exit states fade and slide.
- Accent sweep overlays route transitions.
- Reduced-motion users receive disabled route animations through `prefers-reduced-motion`.

Purpose: make dashboard navigation feel dynamic without losing structure.

### Theme Toggle Motion

The theme toggle is animated:

- Hover lift and scale.
- Spinning dashed ring.
- Pulsing core.
- Sun and moon icon cross-transition.
- Small particles orbit on hover.

Purpose: make theme switching visible and tactile.

### Scanner Motion

The scanner uses direct state feedback:

- Processing state uses a spinning loader and ping ring.
- Successful scans use a large checkmark and pulsing green circle.
- Failed scans use a large cross and pulsing red circle.
- Network status and location cards transition as state changes.
- Emergency alert button pulses/bounces when triggered.
- Restart and logout buttons include hover and active motion.

Purpose: guards should immediately understand whether a scan worked.

### Incident Photo Motion

Incident photos use:

- Hover scale on thumbnails.
- Gradient overlay on hover.
- Full-screen modal preview.
- Smooth highlighted incident scroll when opened from a notification.

Purpose: make evidence review fast and clear.

## Dynamic Behavior

PatrolScan is dynamic in several ways:

- Dashboard refreshes every 5 seconds.
- Upcoming patrol assignments refresh every 5 seconds.
- Supervisor guard list refreshes every 10 seconds.
- Notification bell caches, groups, filters, and syncs notification actions.
- Sidebar incident badge polls every 30 seconds and reacts to incident updates.
- Recent guard scan history merges backend data with local storage data.
- Scanner cooldown survives refresh through local storage.
- Scan history supports long-press selection on touch devices.
- Reports switch between mobile card layout and desktop table layout.
- Route navigation changes based on authenticated role.
- PWA prompt changes based on route context.
- Theme persists across sessions.
- Schedule preview updates before activation.
- Assignment highlights can be triggered by URL parameters.
- Incident highlight and emergency alert banners can be triggered by URL parameters.

## Backend Capabilities

The backend is an Express API backed by PostgreSQL through Sequelize models.

Core backend areas:

- Authentication routes for admins and guards.
- Guard management routes.
- Admin and supervisor management routes.
- Checkpoint management routes.
- Patrol assignment routes.
- Scan recording and validation routes.
- Dashboard analytics routes.
- Incident routes.
- Settings and schedule routes.

Important backend validation:

- JWT-protected routes.
- Guard assignment check before scan success.
- Checkpoint existence check.
- Checkpoint GPS completeness check.
- Live GPS payload requirement.
- Haversine distance calculation.
- GPS accuracy overlap logic.
- Scheduled mode slot checking.
- Failed scan persistence with failure reason.
- Alert scans separated from regular patrol reports and analytics.

## API Surface

The frontend calls these backend groups:

| API Prefix | Purpose |
| --- | --- |
| `/api/auth` | Admin and guard login. |
| `/api/guards` | Guard CRUD and guard access management. |
| `/api/admins` | Admin and supervisor account management. |
| `/api/checkpoints` | Checkpoint CRUD and GPS checkpoint data. |
| `/api/patrol-assignments` | Assign, remove, and reassign checkpoints. |
| `/api/scans` | Record scans, list scans, date-range reports, alerts, and bulk deletion. |
| `/api/dashboard` | Dashboard statistics, timeline, guard performance, and notifications. |
| `/api/incidents` | Incident creation, listing, and deletion. |
| `/api/settings` | Patrol mode, schedule configuration, and schedule preview. |

## Data Captured

PatrolScan records:

- Guard identity.
- Admin or supervisor identity.
- Checkpoint identity.
- Checkpoint GPS coordinates.
- Checkpoint allowed radius.
- Scan timestamp.
- Scan result.
- Failure reason.
- Live scan latitude and longitude.
- GPS accuracy.
- Computed distance from checkpoint.
- Min and max possible distance considering GPS accuracy.
- Assignment status.
- Patrol schedule settings.
- Incident comments.
- Incident photos.
- Emergency alert metadata.

## Technology Stack

### Frontend

- React 19.
- Vite 7.
- React Router.
- Tailwind CSS 4.
- Tabler Icons.
- Axios.
- html5-qrcode.
- qrcode.
- react-hot-toast.
- idb.
- jsPDF and jsPDF AutoTable.
- vite-plugin-pwa.

### Backend

- Node.js.
- Express.
- PostgreSQL.
- Sequelize.
- JWT.
- bcrypt.
- CORS.

## Project Structure

```text
.
|-- src
|   |-- auth                 # Login, registration, route protection, auth storage
|   |-- components           # Layout, topbar, sidebar, notifications, PWA prompt
|   |-- offline              # IndexedDB/offline scan support
|   |-- pages                # Dashboard, scanner, reports, incidents, settings, etc.
|   |-- utils                # Export helpers
|   |-- App.jsx              # Frontend routes
|   |-- index.css            # Theme, animation, motion, and global styling
|   `-- sw.js                # Service worker source
|-- public
|   |-- admin-manifest.json  # Admin PWA manifest
|   |-- guard-manifest.json  # Guard PWA manifest
|   |-- patrolscanimg.png    # Shared app icon
|   `-- sounds               # Alert and notification sounds
|-- patrol-backend
|   |-- src
|   |   |-- controllers      # Backend business logic
|   |   |-- db               # Sequelize config, models, seed
|   |   |-- middleware       # Auth middleware
|   |   |-- routes           # Express routes
|   |   |-- utils            # Access filtering and schedule helpers
|   |   |-- app.js           # Express app
|   |   `-- server.js        # DB startup and server bootstrap
|   `-- package.json
|-- vite.config.js           # Vite and PWA config
|-- package.json             # Frontend scripts and dependencies
`-- README.md
```

## Running the Project

### Frontend

```bash
npm install
npm run dev
```

Default frontend URL:

```text
http://localhost:5173
```

### Backend

```bash
cd patrol-backend
npm install
npm run dev
```

Default backend URL:

```text
http://localhost:5000
```

The backend expects PostgreSQL configuration and a `JWT_SECRET` in environment variables. On startup, it tests the database connection, syncs models, and creates a default admin if none exists.

## Presentation Flow

Use this sequence for a video presentation:

1. Open with the problem: patrol teams need proof that guards visited assigned checkpoints.
2. Show guard and admin login screens, emphasizing role-based access.
3. Open the admin dashboard and explain live metrics.
4. Create or show a checkpoint, including GPS capture and QR generation.
5. Assign that checkpoint to a guard in Upcoming Patrols.
6. Switch to guard login and enter the scanner.
7. Show online status, GPS status, and the camera scanner.
8. Scan a checkpoint QR code and show success motion.
9. Explain cooldown, timestamp, GPS validation, and assignment validation.
10. Show a failed scan scenario or explain failure reasons.
11. Return to Upcoming Patrols and show assignment completion.
12. Open Reports and show date filters, search, GPS details, and export buttons.
13. Submit an incident from the guard scanner with a photo.
14. Review the incident in the admin portal, preview the image, and download it.
15. Trigger or describe the emergency alert and show notification behavior.
16. Show Settings and explain Free Mode versus Scheduled Mode.
17. Toggle dark mode and highlight styling and motion.
18. End with PWA/offline support: the guard app can be installed and keeps scan history available during poor connectivity.

## Short Demo Script

PatrolScan is a patrol verification system for security teams. The admin creates real-world checkpoints, captures their GPS coordinates, prints QR codes, and assigns those checkpoints to guards. Guards use the mobile scanner to scan QR codes while on patrol. The system does not just read the QR code; it validates that the guard is assigned to that checkpoint and physically near the stored GPS location.

Every scan becomes an audit record with time, guard, checkpoint, result, GPS accuracy, distance, and failure reason. Supervisors can monitor live dashboard metrics, review patrol completion, investigate incidents with photos, export reports, and receive urgent notifications. The guard app is mobile-first, installable as a PWA, offline-aware, and includes an emergency alert button for immediate escalation.

The interface uses a clean command-center style with light and dark modes, animated login transitions, route transitions, scanner feedback states, notification sounds, and responsive layouts. The goal is to make patrol supervision faster, more reliable, and evidence-based.

## Key Value

PatrolScan turns security patrols into verified, reportable, and auditable activity. It connects field guards, checkpoints, GPS validation, incidents, emergency alerts, schedules, reports, and supervisor dashboards into one system.
