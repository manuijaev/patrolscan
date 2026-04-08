import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Brand tokens (match the site theme)
const TEAL = [0, 181, 184]
const DARK = [26, 37, 53]
const WHITE = [255, 255, 255]
const LIGHT = [224, 247, 247]
const GREY = [107, 114, 128]
const PASS_BG = [225, 245, 238]
const PASS_FG = [15, 110, 86]
const FAIL_BG = [252, 235, 235]
const FAIL_FG = [163, 45, 45]

// Helper: draw the header bar on every page
function drawHeader(doc, title, subtitle) {
  const W = doc.internal.pageSize.getWidth()

  // dark top bar
  doc.setFillColor(...DARK)
  doc.rect(0, 0, W, 18, 'F')

  // teal accent line
  doc.setFillColor(...TEAL)
  doc.rect(0, 18, W, 2, 'F')

  // logo text
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('Patrol', 14, 12)
  doc.setTextColor(...TEAL)
  doc.text('Scan', 14 + doc.getTextWidth('Patrol'), 12)

  // page title
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...WHITE)
  doc.text(title, W / 2, 12, { align: 'center' })

  // subtitle (right-aligned)
  doc.setFontSize(8)
  doc.setTextColor(160, 174, 192)
  doc.text(subtitle, W - 14, 12, { align: 'right' })
}

// Helper: draw footer with page numbers
function drawFooter(doc) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const total = doc.internal.getNumberOfPages()

  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFillColor(...DARK)
    doc.rect(0, H - 12, W, 12, 'F')
    doc.setFillColor(...TEAL)
    doc.rect(0, H - 12, W, 1, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 174, 192)
    doc.text('PatrolScan - Guard Accountability & Situational Awareness', 14, H - 4)
    doc.setTextColor(...TEAL)
    doc.text(`Page ${i} of ${total}`, W - 14, H - 4, { align: 'right' })
  }
}

// Helper: KPI stat box
function drawKPI(doc, x, y, w, h, label, value, subtext, valueColor = DARK) {
  doc.setFillColor(...LIGHT)
  doc.roundedRect(x, y, w, h, 3, 3, 'F')
  doc.setDrawColor(...TEAL)
  doc.setLineWidth(0.5)
  doc.line(x, y, x, y + h) // left accent bar

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GREY)
  doc.text(label.toUpperCase(), x + 5, y + 8)

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...valueColor)
  doc.text(String(value), x + 5, y + 20)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GREY)
  doc.text(subtext, x + 5, y + 27)
}

// Main export function
// scans: array of scan objects from Reports.jsx
// meta: { title, dateRange, generatedBy, filters }
export function exportPatrolReport(scans, meta = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()

  const title = meta.title || 'Patrol Activity Report'
  const dateRange = meta.dateRange || 'All Dates'
  const generatedBy = meta.generatedBy || 'PatrolScan Admin'
  const generated = new Date().toLocaleString('en-KE', {
    dateStyle: 'long',
    timeStyle: 'short'
  })

  // Compute stats
  const total = scans.length
  const passed = scans.filter(s => s.result === 'passed').length
  const failed = total - passed
  const rate = total ? Math.round((passed / total) * 100) : 0

  // per-guard stats
  const guardMap = {}
  scans.forEach(s => {
    const g = s.guardName || 'Unknown'
    const r = s.result
    if (!guardMap[g]) guardMap[g] = { pass: 0, fail: 0 }
    r === 'passed' ? guardMap[g].pass++ : guardMap[g].fail++
  })

  // per-checkpoint stats
  const cpMap = {}
  scans.forEach(s => {
    const cp = s.checkpointName || 'Unknown'
    const r = s.result
    if (!cpMap[cp]) cpMap[cp] = { pass: 0, fail: 0 }
    r === 'passed' ? cpMap[cp].pass++ : cpMap[cp].fail++
  })

  // PAGE 1 - COVER + SUMMARY
  drawHeader(doc, title, dateRange)

  let y = 28

  // Report metadata block
  doc.setFillColor(248, 250, 250)
  doc.roundedRect(14, y, W - 28, 28, 3, 3, 'F')
  doc.setDrawColor(...TEAL)
  doc.setLineWidth(0.3)
  doc.roundedRect(14, y, W - 28, 28, 3, 3, 'S')

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text(title, 20, y + 10)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GREY)
  doc.text(`Period: ${dateRange}`, 20, y + 18)
  doc.text(`Generated: ${generated}`, 20, y + 24)
  doc.text(`By: ${generatedBy}`, W / 2, y + 18)

  if (meta.filters && meta.filters.length) {
    doc.text(`Filters: ${meta.filters.join(', ')}`, W / 2, y + 24)
  }

  y += 35

  // Section label
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEAL)
  doc.text('OVERVIEW', 14, y)
  doc.setDrawColor(...TEAL)
  doc.setLineWidth(0.4)
  doc.line(14, y + 1.5, 14 + doc.getTextWidth('OVERVIEW'), y + 1.5)
  y += 6

  // KPI boxes - 4 across
  const kpiW = (W - 32) / 4 - 2
  drawKPI(doc, 14, y, kpiW, 32, 'Total Scans', total, 'Scan events logged', DARK)
  drawKPI(doc, 14 + kpiW + 3, y, kpiW, 32, 'Passed', passed, `${rate}% success`, PASS_FG)
  drawKPI(doc, 14 + (kpiW + 3) * 2, y, kpiW, 32, 'Failed', failed, `${100 - rate}% failure`, [163, 45, 45])
  drawKPI(
    doc,
    14 + (kpiW + 3) * 3,
    y,
    kpiW,
    32,
    'Compliance',
    `${rate}%`,
    rate >= 85 ? 'On target' : 'Below 85% target',
    rate >= 85 ? PASS_FG : [186, 117, 23]
  )
  y += 38

  // Guard performance table
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEAL)
  doc.text('GUARD PERFORMANCE', 14, y)
  y += 5

  const guardRows = Object.entries(guardMap)
    .map(([name, s]) => {
      const t = s.pass + s.fail
      const pct = Math.round((s.pass / t) * 100)
      return [
        name,
        String(t),
        String(s.pass),
        String(s.fail),
        `${pct}%`,
        pct >= 85 ? 'Good' : pct >= 60 ? 'Average' : 'Poor'
      ]
    })
    .sort((a, b) => parseFloat(b[4]) - parseFloat(a[4]))

  autoTable(doc, {
    startY: y,
    head: [['Guard', 'Total Scans', 'Passed', 'Failed', 'Rate', 'Status']],
    body: guardRows,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
    headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 8.5 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: DARK },
      4: { fontStyle: 'bold' },
      5: { fontStyle: 'bold' }
    },
    didParseCell(data) {
      if (data.column.index === 5 && data.section === 'body') {
        const v = data.cell.raw
        if (v === 'Good') {
          data.cell.styles.textColor = PASS_FG
          data.cell.styles.fillColor = PASS_BG
        }
        if (v === 'Poor') {
          data.cell.styles.textColor = FAIL_FG
          data.cell.styles.fillColor = FAIL_BG
        }
        if (v === 'Average') {
          data.cell.styles.textColor = [133, 79, 11]
          data.cell.styles.fillColor = [250, 238, 218]
        }
      }
    },
    alternateRowStyles: { fillColor: [248, 252, 252] }
  })

  y = doc.lastAutoTable.finalY + 10

  // Checkpoint breakdown
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEAL)
  doc.text('CHECKPOINT BREAKDOWN', 14, y)
  y += 5

  const cpRows = Object.entries(cpMap)
    .map(([name, s]) => {
      const t = s.pass + s.fail
      const pct = Math.round((s.pass / t) * 100)
      return [name === 'Unknown' ? 'Unknown Checkpoint' : name, String(t), String(s.pass), String(s.fail), `${pct}%`]
    })
    .sort((a, b) => parseInt(b[1]) - parseInt(a[1]))

  autoTable(doc, {
    startY: y,
    head: [['Checkpoint', 'Total', 'Passed', 'Failed', 'Pass Rate']],
    body: cpRows,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 8.5 },
    columnStyles: { 0: { fontStyle: 'bold' }, 4: { fontStyle: 'bold' } },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 0) {
        if (String(data.cell.raw).includes('Unknown')) {
          data.cell.styles.textColor = [133, 79, 11]
        }
      }
    },
    alternateRowStyles: { fillColor: [248, 252, 252] }
  })

  // PAGE 2 - FULL SCAN LOG
  doc.addPage()
  drawHeader(doc, 'Full Scan Log', dateRange)
  y = 28

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEAL)
  doc.text('DETAILED SCAN LOG', 14, y)
  y += 5

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return ''
    }
  }

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return ''
    }
  }

  const toMetersText = (value) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A'
    return `${value.toFixed(2)}m`
  }

  const logRows = scans.map(s => [
    formatDate(s.scannedAt),
    formatTime(s.scannedAt),
    s.guardName || 'Unknown',
    s.checkpointName || 'Unknown',
    s.result === 'passed' ? 'Passed' : 'Failed',
    s.resultDetails?.reason || '',
    toMetersText(s.resultDetails?.gpsAccuracy)
  ])

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Time', 'Guard', 'Checkpoint', 'Result', 'Reason', 'GPS Accuracy']],
    body: logRows,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 7.5, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 16 },
      2: { cellWidth: 22 },
      3: { cellWidth: 28 },
      4: { cellWidth: 16 },
      5: { cellWidth: 'auto' },
      6: { cellWidth: 20 }
    },
    didParseCell(data) {
      if (data.column.index === 4 && data.section === 'body') {
        const v = data.cell.raw
        if (v === 'Passed') {
          data.cell.styles.textColor = PASS_FG
          data.cell.styles.fillColor = PASS_BG
          data.cell.styles.fontStyle = 'bold'
        }
        if (v === 'Failed') {
          data.cell.styles.textColor = FAIL_FG
          data.cell.styles.fillColor = FAIL_BG
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
    alternateRowStyles: { fillColor: [248, 252, 252] },
    didDrawPage(data) {
      drawHeader(doc, 'Full Scan Log', dateRange)
    }
  })

  // PAGE 3 - ISSUES + RECOMMENDATIONS
  doc.addPage()
  drawHeader(doc, 'Issues & Recommendations', dateRange)
  y = 28

  // Auto-generate issues from the data
  const issues = []

  const unknownCount = scans.filter(s => (s.checkpointName || '').toLowerCase().includes('unknown')).length
  if (unknownCount > 0) {
    issues.push({
      severity: 'High',
      title: 'Unregistered Checkpoints Detected',
      detail: `${unknownCount} of ${total} scans (${Math.round((unknownCount / total) * 100)}%) hit "Unknown Checkpoint". ` + 'Go to Checkpoints -> Register QR codes before client go-live.'
    })
  }

  if (rate < 85) {
    issues.push({
      severity: 'High',
      title: `Compliance at ${rate}% - Target is 85%+`,
      detail: `${failed} scans failed. Review GPS radius tolerance per checkpoint. ` + 'Consider widening the allowed distance where GPS accuracy is poor (+/-100m zones).'
    })
  }

  Object.entries(guardMap).forEach(([name, s]) => {
    const t = s.pass + s.fail
    const pct = Math.round((s.pass / t) * 100)
    if (pct < 50 && t > 3) {
      issues.push({
        severity: 'Medium',
        title: `Guard "${name}" has ${pct}% pass rate`,
        detail: `${s.fail} failures in ${t} attempts. Schedule a retraining session and verify ` + 'their device GPS is functioning correctly.'
      })
    }
  })

  const outOfRangeScans = scans.filter(s => (s.resultDetails?.reason || '').toLowerCase().includes('out of range'))
  if (outOfRangeScans.length > 0) {
    issues.push({
      severity: 'Medium',
      title: `${outOfRangeScans.length} "Out of Range" Failures`,
      detail: 'Guards are scanning from positions outside allowed radius. Either tighten patrol ' + 'discipline or increase checkpoint radius in the admin panel.'
    })
  }

  issues.push({
    severity: 'Low',
    title: 'GPS Accuracy Inconsistency',
    detail: 'Several scans show +/-100m accuracy alongside +/-3-6m scans. Recommend guards ' + 'wait for GPS lock before scanning, especially indoors.'
  })

  const sevColor = { High: FAIL_FG, Medium: [133, 79, 11], Low: PASS_FG }
  const sevBg = { High: FAIL_BG, Medium: [250, 238, 218], Low: PASS_BG }

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEAL)
  doc.text('IDENTIFIED ISSUES', 14, y)
  y += 6

  issues.forEach(issue => {
    const col = sevColor[issue.severity]
    const bg = sevBg[issue.severity]

    doc.setFillColor(...bg)
    doc.roundedRect(14, y, W - 28, 24, 3, 3, 'F')
    doc.setFillColor(...col)
    doc.rect(14, y, 3, 24, 'F')

    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...col)
    doc.text(`[${issue.severity}]`, 20, y + 7)

    doc.setFontSize(9)
    doc.setTextColor(...DARK)
    doc.text(issue.title, 20 + doc.getTextWidth(`[${issue.severity}] `), y + 7)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GREY)
    const lines = doc.splitTextToSize(issue.detail, W - 42)
    doc.text(lines, 20, y + 14)
    y += 28
  })

  // Recommendations box
  y += 4
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEAL)
  doc.text('RECOMMENDATIONS BEFORE CLIENT GO-LIVE', 14, y)
  y += 6

  const recs = [
    '1. Register all QR checkpoint codes in admin panel - eliminate "Unknown Checkpoint" entries.',
    '2. Set correct GPS radius per checkpoint (gates = 5-10m, open areas = 50-100m).',
    '3. Brief guards on waiting for GPS lock before scanning.',
    '4. Run a supervised test patrol across all branches before launch.',
    '5. Set compliance alerts in the dashboard to notify supervisors when rate drops below 80%.',
    '6. Archive or delete duplicate failed attempts (3 consecutive fails on same checkpoint/time).'
  ]

  doc.setFillColor(248, 252, 252)
  doc.setDrawColor(...TEAL)
  doc.setLineWidth(0.3)
  doc.roundedRect(14, y, W - 28, recs.length * 10 + 8, 3, 3, 'FD')
  y += 7

  recs.forEach(rec => {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    const lines = doc.splitTextToSize(rec, W - 38)
    doc.text(lines, 20, y)
    y += lines.length * 5.5 + 3
  })

  // Stamp all footers then save
  drawFooter(doc)

  const filename = `PatrolScan_Report_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
}
