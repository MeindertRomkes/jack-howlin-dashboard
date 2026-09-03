import * as admin from 'firebase-admin'

function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0 && admin.apps[0]) {
    return admin.apps[0]
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'jack-howlin-dashboard'
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'jack-howlin-dashboard.firebasestorage.app'

  if (projectId && clientEmail && privateKey) {
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    })
  }

  return admin.initializeApp({
    projectId,
    storageBucket,
  })
}

const app = getAdminApp()

export const adminDb = admin.firestore(app)
export const adminAuth = admin.auth(app)
export const adminStorage = admin.storage(app)

export default admin


