import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconActivity,
  IconAlertCircle,
  IconClock,
  IconTrendingUp,
  IconUsers,
  IconCalendar,
  IconRefresh,
  IconChevronRight,
  IconCheck,
  IconX,
  IconArrowUpRight,
  IconArrowDownRight,
  IconMapPin,
  IconShield,
  IconHourglass,
  IconBell,
  IconChartBar,
  IconTimeline,
  IconFlag,
  IconCalendarEvent,
  IconUserCheck,
  IconClockHour4,
  IconEye,
  IconUser
} from '@tabler/icons-react'
import api from '../api/axios'
import { getToken } from '../auth/authStore'

export default function Dashboard() {
  const navigate = useNavigate()
  const [performanceData, setPerformanceData] = useState({
    completionRate: 92,
    avgResponseTime: '4m 23s',
    efficiencyScore: 87,
    trend: 'up',
    change: '+5%'
  })
  
  const [timelineData, setTimelineData] = useState([])
  const [riskScoring, setRiskScoring] = useState([])
  const [upcomingShifts, setUpcomingShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    patrolsToday: 24,
    missedPatrols: 2,
    activeGuards: 6,
    totalCheckpoints: 18
  })

  useEffect(() => {
    loadDashboardData()
    // Refresh data every 30 seconds
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadDashboardData() {
    setLoading(true)
    try {
      const token = getToken()
      
      // Load stats
      const statsRes = await api.get('/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStats(statsRes.data)
      
      // Calculate performance data from stats
      setPerformanceData({
        completionRate: statsRes.data.completionRate || 0,
        avgResponseTime: '2m 15s',
        efficiencyScore: statsRes.data.completionRate || 0,
        trend: statsRes.data.completionRate >= 50 ? 'up' : 'down',
        change: '+5%'
      })
      
      // Load timeline data
      const timelineRes = await api.get('/dashboard/timeline', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTimelineData(timelineRes.data)
      
      // Load guard performance (use for risk scoring)
      const guardRes = await api.get('/dashboard/guard-performance', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setRiskScoring(guardRes.data)
      
      // Load checkpoint status (use for upcoming patrols section)
      const patrolRes = await api.get('/dashboard/upcoming-patrols', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUpcomingShifts(patrolRes.data)
      
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      // Fallback mock data
      loadMockData()
    } finally {
      setLoading(false)
    }
  }

  function loadMockData() {
    // Mock timeline data
    setTimelineData([
      {
        guardId: 'G001',
        guardName: 'John Smith',
        shift: 'Day Shift',
        timeline: [
          { time: '08:00', checkpoint: 'Gate A', status: 'on-time', delay: 0 },
          { time: '08:15', checkpoint: 'Main Building', status: 'on-time', delay: 0 },
          { time: '08:35', checkpoint: 'Warehouse', status: 'late', delay: 10 },
          { time: '09:00', checkpoint: 'Loading Dock', status: 'missed', delay: null },
          { time: '09:20', checkpoint: 'Gate B', status: 'on-time', delay: 0 }
        ],
        efficiency: 85
      },
      {
        guardId: 'G002',
        guardName: 'Sarah Johnson',
        shift: 'Night Shift',
        timeline: [
          { time: '20:00', checkpoint: 'Gate B', status: 'early', delay: -5 },
          { time: '20:25', checkpoint: 'Perimeter', status: 'on-time', delay: 0 },
          { time: '20:50', checkpoint: 'Storage Area', status: 'on-time', delay: 0 },
          { time: '21:15', checkpoint: 'Admin Building', status: 'on-time', delay: 0 }
        ],
        efficiency: 95
      },
      {
        guardId: 'G003',
        guardName: 'Mike Chen',
        shift: 'Evening Shift',
        timeline: [
          { time: '16:00', checkpoint: 'Gate A', status: 'late', delay: 15 },
          { time: '16:30', checkpoint: 'Loading Dock', status: 'on-time', delay: 0 },
          { time: '17:00', checkpoint: 'Warehouse', status: 'on-time', delay: 0 }
        ],
        efficiency: 75
      }
    ])

    // Mock risk scoring
    setRiskScoring([
      { 
        area: 'Loading Dock', 
        riskLevel: 'high', 
        riskScore: 85,
        factors: ['High traffic', 'Poor lighting', 'Recent incident'],
        timeWindow: '18:00-06:00'
      },
      { 
        area: 'Perimeter Fence', 
        riskLevel: 'medium', 
        riskScore: 65,
        factors: ['Isolated area', 'Weak fencing'],
        timeWindow: '20:00-04:00'
      },
      { 
        area: 'Main Building', 
        riskLevel: 'low', 
        riskScore: 25,
        factors: ['Good lighting', 'Regular patrols'],
        timeWindow: 'All hours'
      },
      { 
        area: 'Gate A', 
        riskLevel: 'medium', 
        riskScore: 55,
        factors: ['Entry/exit point', 'High visibility'],
        timeWindow: '06:00-22:00'
      }
    ])

    // Mock upcoming shifts
    setUpcomingShifts([
      { 
        guardName: 'Robert Davis',
        role: 'Senior Guard',
        shift: 'Morning Shift',
        startTime: '06:00',
        endTime: '14:00',
        date: 'Today',
        status: 'upcoming',
        checkpoints: 12
      },
      { 
        guardName: 'Lisa Wong',
        role: 'Patrol Guard',
        shift: 'Evening Shift',
        startTime: '14:00',
        endTime: '22:00',
        date: 'Today',
        status: 'current',
        checkpoints: 10
      },
      { 
        guardName: 'James Wilson',
        role: 'Night Guard',
        shift: 'Night Shift',
        startTime: '22:00',
        endTime: '06:00',
        date: 'Tonight',
        status: 'upcoming',
        checkpoints: 8
      },
      { 
        guardName: 'Maria Garcia',
        role: 'Patrol Guard',
        shift: 'Morning Shift',
        startTime: '06:00',
        endTime: '14:00',
        date: 'Tomorrow',
        status: 'scheduled',
        checkpoints: 12
      }
    ])
  }

  function getRiskColor(riskLevel) {
    switch(riskLevel) {
      case 'high': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
      case 'medium': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
      case 'low': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
    }
  }

  function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Command Center</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Live status across active sites and guards.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50"
          >
            <IconRefresh size={18} className={loading ? 'animate-spin' : ''} />
            <span className="text-sm font-medium">Refresh</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition font-semibold">
            <IconEye size={18} />
            <span className="text-sm">View Live Patrols</span>
          </button>
        </div>
      </div>

      {/* Performance Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <IconChartBar size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              performanceData.trend === 'up' 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}>
              {performanceData.trend === 'up' ? <IconArrowUpRight size={14} /> : <IconArrowDownRight size={14} />}
              {performanceData.change}
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Completion Rate</p>
          <p className="text-3xl lg:text-4xl font-bold mt-2">{performanceData.completionRate}%</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 lg:p-6">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
            <IconClockHour4 size={24} className="text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Avg Response Time</p>
          <p className="text-3xl lg:text-4xl font-bold mt-2">{performanceData.avgResponseTime}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 lg:p-6">
          <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
            <IconTrendingUp size={24} className="text-green-600 dark:text-green-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Efficiency Score</p>
          <p className="text-3xl lg:text-4xl font-bold mt-2">{performanceData.efficiencyScore}</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 lg:p-6">
          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
            <IconUsers size={24} className="text-orange-600 dark:text-orange-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Active Guards</p>
          <p className="text-3xl lg:text-4xl font-bold mt-2">{stats.activeGuards}</p>
        </div>
      </div>

      {/* Main Grid - Timeline View + Risk Scoring */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patrol Timeline View */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <IconTimeline size={24} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold">Guard Patrol Timeline</h3>
            </div>
            <button 
              onClick={() => navigate('/patrols')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
            >
              View All <IconChevronRight size={16} />
            </button>
          </div>

          <div className="space-y-6">
            {timelineData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <IconTimeline size={48} className="mx-auto mb-4 opacity-50" />
                <p>No patrol activity yet</p>
                <p className="text-sm">Scans will appear here when guards start scanning checkpoints</p>
              </div>
            ) : (
              timelineData.slice(0, 3).map((scan) => {
                const scanTime = new Date(scan.scannedAt)
                const isFailed = scan.result === 'failed'
                return (
                  <div key={scan.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <IconUserCheck size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-semibold">{scan.guardName}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <span>Guard #{scan.guardId}</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[color:var(--text-muted)]">
                              {isFailed ? 'Failed' : 'Passed'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {scanTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* Timeline Visualization */}
                    <div className="relative pl-10 ml-2 border-l-2 border-gray-200 dark:border-gray-700">
                      <div className="relative mb-4 last:mb-0">
                        {/* Timeline dot (neutral) */}
                        <div className="absolute -left-[25px] w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
                          <span className="text-xs text-gray-600 dark:text-gray-300">•</span>
                        </div>

                        {/* Timeline content */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <IconMapPin size={16} className="text-gray-400" />
                              <span className="font-medium">{scan.checkpointName}</span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {scanTime.toLocaleDateString()}
                            </span>
                          </div>
                          {isFailed && scan.failureReason && (
                            <p className="text-xs text-red-500 mt-1">
                              {scan.failureReason}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Risk Scoring + Upcoming Shifts */}
        <div className="space-y-6">
          {/* Risk Scoring */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <IconFlag size={24} className="text-red-600 dark:text-red-400" />
              <h3 className="text-lg font-semibold">Risk Scoring</h3>
            </div>

            <div className="space-y-4">
              {riskScoring.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p>No guard data available</p>
                </div>
              ) : (
                riskScoring.map((guard) => (
                  <div 
                    key={guard.id}
                    className={`p-4 rounded-xl border ${
                      guard.scansToday > 0 
                        ? 'bg-green-500/10 border-green-200 dark:border-green-800' 
                        : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <IconShield size={16} />
                        <span className="font-semibold">{guard.name}</span>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        guard.scansToday > 0 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-400 text-white'
                      }`}>
                        {guard.totalScans}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="text-xs text-gray-400">Today</span>
                        <p className="font-medium">{guard.scansToday} scans</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">Checkpoints</span>
                        <p className="font-medium">{guard.uniqueCheckpointsToday}</p>
                      </div>
                    </div>
                    
                    {guard.lastScan && (
                      <div className="text-xs text-gray-400 mt-2">
                        Last scan: {new Date(guard.lastScan).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Patrols */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <IconCalendarEvent size={24} className="text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold">Upcoming Patrols</h3>
              </div>
              <button 
                onClick={() => navigate('/patrols')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                View All
              </button>
            </div>

            <div className="space-y-4">
              {upcomingShifts.length === 0 ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  <IconMapPin size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No patrols assigned</p>
                  <p className="text-xs">Assign checkpoints to guards from the Guards page</p>
                </div>
              ) : (
                upcomingShifts.map((patrol) => (
                  <div 
                    key={patrol.guardId}
                    className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                          <IconUser size={20} className="text-blue-500 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{patrol.guardName}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {patrol.completedToday}/{patrol.totalAssigned} completed
                          </p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        patrol.completedToday === patrol.totalAssigned
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-500 text-white'
                      }`}>
                        {patrol.completedToday === patrol.totalAssigned ? 'Complete' : 'In Progress'}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {patrol.checkpoints.slice(0, 5).map((cp) => (
                        <div 
                          key={cp.id}
                          className={`flex items-center gap-2 text-sm ${
                            cp.status === 'completed' 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {cp.status === 'completed' ? (
                            <IconCheck size={14} className="text-green-500" />
                          ) : (
                            <IconMapPin size={14} className="text-blue-400" />
                          )}
                          <span>{cp.name}</span>
                        </div>
                      ))}
                      {patrol.checkpoints.length > 5 && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          +{patrol.checkpoints.length - 5} more
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Live Patrol Activity */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Scans</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">Last 24h</span>
          </div>
          <div className="space-y-3">
            {timelineData.slice(0, 5).map((scan) => {
              const timeAgo = getTimeAgo(new Date(scan.scannedAt))
              const isFailed = scan.result === 'failed'
              return (
                <div
                  key={scan.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{scan.guardName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{scan.checkpointName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{timeAgo}</span>
                    <span className="text-xs text-[color:var(--text-muted)]">
                      {isFailed ? 'Failed' : 'Passed'}
                    </span>
                  </div>
                </div>
              )
            })}
            {timelineData.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <IconActivity size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent scans</p>
              </div>
            )}
          </div>
        </div>

        {/* Today's Alerts */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
            <IconBell size={20} className="text-yellow-500" />
            Alerts
          </h3>
          <div className="space-y-3">
            {/* Show inactive checkpoints as alerts */}
            {upcomingShifts
              .filter(cp => cp.status === 'inactive')
              .slice(0, 3)
              .map((checkpoint) => (
                <div
                  key={checkpoint.id}
                  className="rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 text-sm"
                >
                  <div className="flex items-start justify-between">
                    <p className="text-gray-900 dark:text-gray-200">Checkpoint inactive: {checkpoint.name}</p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">24h</span>
                  </div>
                </div>
              ))}
            {/* Show low activity guards */}
            {riskScoring
              .filter(g => g.scansToday === 0)
              .slice(0, 3)
              .map((guard) => (
                <div
                  key={guard.id}
                  className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm"
                >
                  <div className="flex items-start justify-between">
                    <p className="text-gray-900 dark:text-gray-200">No activity: {guard.name}</p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Today</span>
                  </div>
                </div>
              ))}
            {upcomingShifts.filter(cp => cp.status === 'inactive').length === 0 && 
             riskScoring.filter(g => g.scansToday === 0).length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <IconBell size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No alerts</p>
              </div>
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          <h3 className="font-semibold mb-4">System Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">API Connection</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Connected</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Data Sync</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Synced</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Active Guards</span>
              <span className="text-sm font-medium">{stats.activeGuards}/{stats.totalGuards}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Checkpoints</span>
              <span className="text-sm font-medium">{stats.totalCheckpoints}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Total Scans</span>
              <span className="text-sm font-medium">{stats.totalScans}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}