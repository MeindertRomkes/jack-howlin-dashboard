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
    let errorMsg = 'Failed to create session'
    try {
      const data = await res.json()
      errorMsg = data.error || errorMsg
    } catch {
      const text = await res.text().catch(() => '')
      errorMsg = `Server error (${res.status}): ${text.slice(0, 150)}`
    }
    throw new Error(errorMsg)
  }

  // Redirect to dashboard (root) after successful login
  window.location.href = '/'
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
  await fetch('/api/auth/session', { method: 'DELETE' })
  window.location.href = '/login'
}
