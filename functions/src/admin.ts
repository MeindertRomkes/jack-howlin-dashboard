import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

/**
 * Returns an initialized Firestore instance.
 * Initializes firebase-admin lazily (only when first called inside a handler,
 * not at module load time) to avoid the Firebase CLI analysis timeout.
 */
export function getDb() {
  if (!getApps().length) {
    initializeApp()
  }
  return getFirestore()
}
