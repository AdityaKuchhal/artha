'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      }
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg, #070d1a)',
      fontFamily: 'var(--font, DM Sans, sans-serif)',
    }}>

      {/* ── Left — Form Panel ── */}
      <div style={{
        flex: '0 0 480px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '64px 56px',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Logo */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px', height: '44px',
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: '12px',
            color: 'var(--accent, #3b82f6)',
            fontWeight: 800,
            fontSize: '18px',
            marginBottom: '24px',
            letterSpacing: '-0.5px',
          }}>A</div>
          <h1 style={{
            fontSize: '26px', fontWeight: 700,
            color: 'var(--text, #e8e8f0)',
            margin: '0 0 6px',
            letterSpacing: '-0.5px',
          }}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p style={{ color: 'var(--text3, #6b7280)', fontSize: '14px', margin: 0 }}>
            {mode === 'signin'
              ? 'Sign in to your Artha account'
              : 'Start tracking your wealth with purpose'}
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '28px',
          background: 'var(--bg2, #0d1526)',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {(['signin', 'signup'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontFamily: 'inherit',
                fontWeight: 600,
                background: mode === m ? 'var(--accent, #3b82f6)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--text3, #6b7280)',
                transition: 'all 0.15s ease',
                boxShadow: mode === m ? '0 2px 8px rgba(59,130,246,0.3)' : 'none',
              }}
            >
              {m === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{
              display: 'block', fontSize: '12px', fontWeight: 600,
              color: 'var(--text3, #9090a8)', marginBottom: '6px',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: '100%',
                padding: '11px 14px',
                background: 'var(--bg2, #0d1526)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                color: 'var(--text, #e8e8f0)',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent, #3b82f6)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{
                fontSize: '12px', fontWeight: 600,
                color: 'var(--text3, #9090a8)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Password
              </label>
              {mode === 'signin' && (
                <span style={{ fontSize: '12px', color: 'var(--accent, #3b82f6)', cursor: 'pointer' }}>
                  Forgot password?
                </span>
              )}
            </div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••"
              required
              style={{
                width: '100%',
                padding: '11px 14px',
                background: 'var(--bg2, #0d1526)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                color: 'var(--text, #e8e8f0)',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent, #3b82f6)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '8px',
              color: 'var(--red, #f87171)',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? 'rgba(59,130,246,0.5)' : 'var(--accent, #3b82f6)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: loading ? 'none' : '0 4px 12px rgba(59,130,246,0.35)',
              marginTop: '4px',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#2563eb' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--accent, #3b82f6)' }}
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Footer */}
        <p style={{ marginTop: '32px', fontSize: '12px', color: 'var(--text3, #6b7280)', textAlign: 'center' }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <span
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }}
            style={{ color: 'var(--accent, #3b82f6)', cursor: 'pointer', fontWeight: 600 }}
          >
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </span>
        </p>
      </div>

      {/* ── Right — Visual Panel ── */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0d1526 0%, #070d1a 50%, #0a1628 100%)',
        borderLeft: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>

        {/* Ambient glow */}
        <div style={{
          position: 'absolute',
          width: '500px', height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }} />

        {/* Orbit rings */}
        {[280, 380, 480].map((size, i) => (
          <div key={size} style={{
            position: 'absolute',
            width: `${size}px`, height: `${size}px`,
            borderRadius: '50%',
            border: `1px solid rgba(59,130,246,${0.12 - i * 0.03})`,
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }} />
        ))}

        {/* Center node + orbiting cards */}
        <div style={{ position: 'relative', zIndex: 2, width: '480px', height: '480px' }}>

          {/* Center logo */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '72px', height: '72px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', fontWeight: 800, color: '#fff',
            boxShadow: '0 0 40px rgba(59,130,246,0.4), 0 8px 32px rgba(0,0,0,0.4)',
            letterSpacing: '-1px',
          }}>
            A
          </div>

          {/* Orbiting feature cards */}
          {[
            { label: 'AI Reports', sub: '5-agent pipeline', angle: -60, dist: 180 },
            { label: 'Plaid Sync', sub: 'Live bank data', angle: 0, dist: 190 },
            { label: 'Budget AI', sub: 'Smart alerts', angle: 60, dist: 180 },
            { label: 'Cash Flow', sub: 'Visual insights', angle: 120, dist: 190 },
            { label: 'Anomaly', sub: 'Fraud detection', angle: 180, dist: 180 },
            { label: 'Multi-bank', sub: 'All accounts', angle: 240, dist: 190 },
          ].map(({ label, sub, angle, dist }) => {
            const rad = (angle * Math.PI) / 180
            const x = Math.cos(rad) * dist
            const y = Math.sin(rad) * dist
            return (
              <div key={label} style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              }}>
                <div style={{
                  background: 'rgba(13,21,38,0.9)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  backdropFilter: 'blur(12px)',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#e8e8f0' }}>{label}</div>
                  <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '1px' }}>{sub}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom tagline */}
        <div style={{
          position: 'absolute',
          bottom: '40px',
          left: 0, right: 0,
          textAlign: 'center',
          padding: '0 40px',
        }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#e8e8f0', marginBottom: '6px' }}>
            Your finances, intelligently understood
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.5' }}>
            AI-powered insights across all your accounts,<br />budgets, and spending patterns
          </div>
        </div>
      </div>

    </main>
  )
}
