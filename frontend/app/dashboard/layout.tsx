'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard,
  Briefcase,
  CreditCard,
  FileText,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/income', label: 'Income', icon: Briefcase },
  { href: '/dashboard/spend', label: 'Spending', icon: CreditCard },
  { href: '/dashboard/report', label: 'Report', icon: FileText },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [userEmail, setUserEmail] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/')
      } else {
        setUserEmail(data.session.user.email || '')
      }
    })
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen flex bg-[#0a0a0f]">
      {/* Fixed grid background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,229,160,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,160,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Sidebar */}
      <aside className="relative z-10 w-56 min-h-screen flex flex-col border-r border-[rgba(120,120,200,0.12)] bg-[rgba(17,17,24,0.9)] backdrop-blur-xl">
        {/* Logo */}
        <div className="p-6 border-b border-[rgba(120,120,200,0.12)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-[#00e5a0] rounded-lg flex items-center justify-center text-[#00e5a0] font-bold text-sm">
              A
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Artha</div>
              <div className="text-[#6b7280] text-xs">Wealth with purpose</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                  active
                    ? 'bg-[rgba(0,229,160,0.1)] text-[#00e5a0] border border-[rgba(0,229,160,0.2)]'
                    : 'text-[#6b7280] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User + signout */}
        <div className="p-4 border-t border-[rgba(120,120,200,0.12)]">
          <div className="text-xs text-[#6b7280] mb-3 truncate">{userEmail}</div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-xs text-[#6b7280] hover:text-red-400 transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="relative z-10 flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
