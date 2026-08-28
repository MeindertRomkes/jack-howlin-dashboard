'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/auth'

const links = [
  { href: '/', label: 'Overview' },
  { href: '/comments', label: 'Comments' },
  { href: '/calendar', label: 'Calendar' },
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav className="bg-stone-950 border-b border-stone-800 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <span className="text-amber-600 font-bold tracking-widest uppercase text-sm">
          Jack Howlin&apos;
        </span>
        <div className="flex gap-6">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm tracking-wider uppercase transition-colors ${
                pathname === link.href
                  ? 'text-amber-500'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <button
        onClick={signOut}
        className="text-xs text-stone-500 hover:text-stone-300 tracking-wider uppercase"
      >
        Sign Out
      </button>
    </nav>
  )
}
