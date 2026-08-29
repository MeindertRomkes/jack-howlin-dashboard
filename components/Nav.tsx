'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/lib/auth'
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  Sliders,
  LogOut,
  Flame,
  BarChart3,
  Clapperboard,
  Menu,
  X,
} from 'lucide-react'

const links = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/analytics', label: 'Data & Intel', icon: BarChart3 },
  { href: '/comments', label: 'Comments', icon: MessageSquare },
  { href: '/calendar', label: 'Kalender', icon: Calendar },
  { href: '/studio', label: 'AI Studio', icon: Clapperboard },
  { href: '/settings', label: 'Instellingen', icon: Sliders },
]

export default function Nav() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="bg-stone-950 border-b border-stone-800/80 sticky top-0 z-30 shadow-md">
      <div className="px-4 sm:px-8 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
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

        {/* Desktop nav links */}
        <div className="hidden lg:flex items-center gap-1">
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

        {/* Right side: logout + hamburger */}
        <div className="flex items-center gap-2">
          <button
            onClick={signOut}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-stone-400 hover:text-red-400 hover:bg-stone-900/80 transition-colors font-medium"
            aria-label="Uitloggen"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline tracking-wider uppercase">Uitloggen</span>
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(prev => !prev)}
            className="lg:hidden p-2 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
            aria-label={mobileOpen ? 'Menu sluiten' : 'Menu openen'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-stone-800/80 bg-stone-950 px-4 py-3 space-y-1">
          {links.map(link => {
            const Icon = link.icon
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-amber-600/15 text-amber-400 border border-amber-500/30'
                    : 'text-stone-300 hover:text-stone-100 hover:bg-stone-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-500' : 'text-stone-500'}`} />
                <span>{link.label}</span>
              </Link>
            )
          })}

          {/* Mobile logout */}
          <button
            onClick={() => { setMobileOpen(false); signOut() }}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold text-stone-400 hover:text-red-400 hover:bg-stone-900/60 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Uitloggen</span>
          </button>
        </div>
      )}
    </nav>
  )
}
