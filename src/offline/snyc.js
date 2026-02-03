import api from '../api/axios'
import { getOfflineScans, clearOfflineScans } from './db'
import { getToken } from '../auth/authStore'

export async function syncOfflineScans() {
  const scans = await getOfflineScans()
  if (!scans.length) return

  const token = getToken()

  for (const scan of scans) {
    try {
      await api.post(
        '/patrols/scan',
        scan,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
    } catch (err) {
      console.error('Sync failed for scan', scan)
      return
    }
  }

  await clearOfflineScans()
}
