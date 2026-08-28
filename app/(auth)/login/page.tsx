'use client'
import { useState } from 'react'
import { signInWithGoogle } from '@/lib/auth'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-stone-100 mb-2 tracking-widest uppercase">
          Jack Howlin&apos;
        </h1>
        <p className="text-stone-400 mb-8 text-sm tracking-wider uppercase">Command Center</p>
        <button
          onClick={handleLogin}
          disabled={loading}
          className="bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-stone-100 px-8 py-3 text-sm tracking-wider uppercase transition-colors"
        >
          {loading ? 'Signing in...' : 'Sign In with Google'}
        </button>
        {error && (
          <p className="mt-4 text-red-400 text-sm max-w-xs mx-auto">{error}</p>
        )}
      </div>
    </div>
  )
}
