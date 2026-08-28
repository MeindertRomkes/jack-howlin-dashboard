import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from './firebase'

const provider = new GoogleAuthProvider()

export async function signInWithGoogle(): Promise<void> {
  const result = await signInWithPopup(auth, provider)
  const idToken = await result.user.getIdToken()

  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })

  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Failed to create session')
  }

  // Redirect to dashboard after successful login
  window.location.href = '/dashboard'
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
  await fetch('/api/auth/session', { method: 'DELETE' })
  window.location.href = '/login'
}
