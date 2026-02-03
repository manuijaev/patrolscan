import { openDB } from 'idb'

export const dbPromise = openDB('patrol-db', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('scans')) {
      db.createObjectStore('scans', {
        keyPath: 'id',
        autoIncrement: true,
      })
    }
  },
})

export async function saveOfflineScan(scan) {
  const db = await dbPromise
  await db.add('scans', scan)
}

export async function getOfflineScans() {
  const db = await dbPromise
  return db.getAll('scans')
}

export async function clearOfflineScans() {
  const db = await dbPromise
  const tx = db.transaction('scans', 'readwrite')
  await tx.store.clear()
  await tx.done
}
