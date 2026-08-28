'use client'
import { signInWithGoogle } from '@/lib/auth'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-stone-100 mb-2 tracking-widest uppercase">
          Jack Howlin&apos;
        </h1>
        <p className="text-stone-400 mb-8 text-sm tracking-wider uppercase">Command Center</p>
        <button
          onClick={signInWithGoogle}
          className="bg-amber-700 hover:bg-amber-600 text-stone-100 px-8 py-3 text-sm tracking-wider uppercase transition-colors"
        >
          Sign In with Google
        </button>
      </div>
    </div>
  )
}
