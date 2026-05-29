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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0a0a0f' }}>
      <div className="grid-bg" />

      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(120,120,200,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px', height: '32px',
              border: '1px solid #00e5a0',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#00e5a0', fontWeight: 700, fontSize: '14px',
            }}>A</div>
            <div>
              <div style={{ color: '#e8e8f0', fontWeight: 600, fontSize: '14px' }}>Artha</div>
              <div style={{ color: '#6b7280', fontSize: '11px' }}>Wealth with purpose</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href} className={`nav-link ${active ? 'active' : ''}`}>
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div style={{ padding: '16px', borderTop: '1px solid rgba(120,120,200,0.12)' }}>
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userEmail}
          </div>
          <button onClick={signOut} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '12px', color: '#6b7280', background: 'none',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="main-content" style={{ position: 'relative', zIndex: 1, flex: 1 }}>
        {children}
      </main>
    </div>
  )
}
