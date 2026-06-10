'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ThemeProvider, useTheme } from '@/lib/theme'
import {
  LayoutDashboard,
  Building2,
  ArrowLeftRight,
  TrendingUp,
  PieChart,
  Zap,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Menu,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/cards', label: 'Accounts', icon: Building2 },
  { href: '/dashboard/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/dashboard/cashflow', label: 'Cash Flow', icon: TrendingUp },
  { href: '/dashboard/budget', label: 'Budget', icon: PieChart },
  { href: '/dashboard/report', label: 'AI Report', icon: Zap },
]

function DashboardInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const supabase = createClient()

  const currentPage = NAV.find((n) => n.href === pathname)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/')
        return
      }
      const meta = data.session.user.user_metadata
      const name = meta?.full_name || data.session.user.email || ''
      setUserEmail(name)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const isCollapsed = isMobile ? !mobileOpen : collapsed
  const firstName = userEmail.split(' ')[0]
  const initials = firstName ? firstName[0].toUpperCase() : 'A'

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="app-layout">
      <div className="glow-bg" />

      {/* Sidebar */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">A</div>
          {!isCollapsed && <span className="sidebar-logo-text">Artha</span>}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`nav-item ${active ? 'active' : ''}`}
                title={isCollapsed ? label : undefined}
              >
                <span className="nav-item-icon">
                  <Icon size={18} />
                </span>
                {!isCollapsed && label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {!isCollapsed ? (
            <div className="user-row">
              <div className="user-avatar">{initials}</div>
              <div className="user-info">
                <div className="user-name">{firstName || 'My Account'}</div>
                <div className="user-email">{userEmail}</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="user-avatar">{initials}</div>
            </div>
          )}
          <button
            onClick={signOut}
            className="nav-item"
            style={{ marginTop: '4px', color: 'var(--text3)', width: '100%' }}
            title={isCollapsed ? 'Sign out' : undefined}
          >
            <span className="nav-item-icon">
              <LogOut size={16} />
            </span>
            {!isCollapsed && 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Header */}
      <header className={`header ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="header-left">
          {/* Collapse toggle */}
          <button
            className="collapse-btn"
            onClick={() => (isMobile ? setMobileOpen(!mobileOpen) : setCollapsed(!collapsed))}
            title="Toggle sidebar"
          >
            {isMobile ? (
              <Menu size={16} />
            ) : isCollapsed ? (
              <ChevronRight size={16} />
            ) : (
              <ChevronLeft size={16} />
            )}
          </button>

          <div>
            <div className="header-title">{currentPage?.label || 'Artha'}</div>
            <div className="header-sub">
              {new Date().toLocaleDateString('en-CA', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>

        <div className="header-right">
          {/* Theme toggle */}
          <button className="theme-btn" onClick={toggle} title="Toggle theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* User avatar */}
          <div className="user-avatar" style={{ cursor: 'default' }}>
            {initials}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className={`main ${isCollapsed ? 'sidebar-collapsed' : ''}`}>{children}</main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DashboardInner>{children}</DashboardInner>
    </ThemeProvider>
  )
}
