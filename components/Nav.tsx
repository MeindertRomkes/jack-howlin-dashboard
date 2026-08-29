'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/auth'
import { LayoutDashboard, MessageSquare, Calendar, Sliders, LogOut, Flame } from 'lucide-react'

const links = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/comments', label: 'Comments', icon: MessageSquare },
  { href: '/calendar', label: 'Kalender & Posts', icon: Calendar },
  { href: '/settings', label: 'AI Persona & Studio', icon: Sliders },
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav className="bg-stone-950 border-b border-stone-800/80 px-4 sm:px-8 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
      <div className="flex items-center gap-6 sm:gap-10">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-stone-950 transition-all">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <span className="text-amber-500 font-extrabold tracking-widest uppercase text-sm block leading-none">
              Jack Howlin&apos;
            </span>
            <span className="text-[10px] text-stone-500 tracking-wider uppercase font-semibold">
              Command Studio
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {links.map(link => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all ${
                  isActive
                    ? 'bg-amber-600/15 text-amber-400 border border-amber-500/30 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-500' : 'text-stone-500'}`} />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <button
        onClick={signOut}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-stone-400 hover:text-red-400 hover:bg-stone-900/80 transition-colors font-medium"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="hidden sm:inline tracking-wider uppercase">Uitloggen</span>
      </button>
    </nav>
  )
}
