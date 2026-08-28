import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDummyKeyForStaticBuildOnly12345',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'jack-howlin-dashboard.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'jack-howlin-dashboard',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'jack-howlin-dashboard.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:1234567890:web:abcdef123456',
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
