'use client'

import { useEffect, useState } from 'react'
import { api, EarningsSummary, SpendingSummary } from '@/lib/api'
import { formatCurrency, getCategoryColor } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight } from 'lucide-react'

export default function DashboardPage() {
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null)
  const [spending, setSpending] = useState<SpendingSummary | null>(null)
  const [weeklyEarnings, setWeeklyEarnings] = useState<EarningsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.shifts.earnings('monthly'),
      api.transactions.summary('monthly'),
      api.shifts.earnings('weekly'),
    ]).then(([e, s, w]) => {
      setEarnings(e)
      setSpending(s)
      setWeeklyEarnings(w)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const netPosition = (earnings?.total_earnings || 0) - (spending?.total_spent || 0)
  const isPositive = netPosition >= 0

  // Build weekly bar chart data from shifts
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const today = new Date().getDay()
  const todayIndex = today === 0 ? 6 : today - 1

  const barData = days.map((day, i) => ({
    day,
    amount: i === todayIndex ? (weeklyEarnings?.total_earnings || 0) : 0,
    isToday: i === todayIndex,
  }))

  if (loading) return (
    <div className="page">
      <div style={{ color: 'var(--text3)', fontSize: '13px' }}>Loading...</div>
    </div>
  )

  return (
    <div className="page fade-up">
      {/* Top stat cards */}
      <div className="grid-3">
        <StatCard
          title="Earned This Month"
          value={formatCurrency(earnings?.total_earnings || 0)}
          sub={`${earnings?.total_hours || 0} hours · ${earnings?.shift_count || 0} shifts`}
          badge={{ label: '+' + formatCurrency(weeklyEarnings?.total_earnings || 0) + ' this week', type: 'green' }}
          icon={<TrendingUp size={18} />}
          iconColor="var(--green)"
        />
        <StatCard
          title="Spent This Month"
          value={formatCurrency(spending?.total_spent || 0)}
          sub={`${spending?.by_category.length || 0} categories tracked`}
          badge={{ label: 'Plaid synced', type: 'blue' }}
          icon={<TrendingDown size={18} />}
          iconColor="var(--red)"
        />
        <StatCard
          title="Net Position"
          value={(isPositive ? '' : '-') + formatCurrency(Math.abs(netPosition))}
          sub={isPositive ? 'Ahead this month' : 'Behind this month'}
          badge={{ label: isPositive ? 'Positive' : 'Negative', type: isPositive ? 'green' : 'red' }}
          icon={<Wallet size={18} />}
          iconColor={isPositive ? 'var(--green)' : 'var(--red)'}
        />
      </div>

      {/* Middle row */}
      <div className="grid-2-1">
        {/* Weekly earnings bar chart */}
        <div className="card">
          <div className="card-title">Weekly Earnings Overview</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Earned so far today</div>
              <div style={{ fontSize: '36px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-1.5px', lineHeight: 1.1 }}>
                {formatCurrency(weeklyEarnings?.total_earnings || 0)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Projected monthly</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.5px' }}>
                {formatCurrency((weeklyEarnings?.total_earnings || 0) * 4)}
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} barSize={32} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: 'var(--text3)', fontFamily: 'DM Sans' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text3)', fontFamily: 'DM Sans' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => v === 0 ? '0' : `${v/1000}K`}
              />
              <Tooltip
                formatter={(v) => [typeof v === 'number' ? formatCurrency(v) : '', 'Earned']}
                contentStyle={{
                  background: 'var(--bg2)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontFamily: 'DM Sans',
                  color: 'var(--text)',
                }}
                cursor={{ fill: 'rgba(59,130,246,0.05)' }}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.isToday ? 'var(--accent)' : 'var(--bg3)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Spending breakdown */}
        <div className="card">
          <div className="card-title">Spending Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(spending?.by_category || []).filter(c => c.total > 0).slice(0, 6).map(cat => (
              <div key={cat.category}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text2)' }}>
                    {cat.category.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                    {formatCurrency(cat.total)}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min((cat.total / (spending?.total_spent || 1)) * 100, 100)}%`,
                      background: getCategoryColor(cat.category),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row — recent transactions */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="card-title" style={{ margin: 0 }}>Recent Transactions</div>
          <a href="/dashboard/transactions" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            View all <ArrowUpRight size={13} />
          </a>
        </div>
        <RecentTransactions />
      </div>
    </div>
  )
}

function StatCard({ title, value, sub, badge, icon, iconColor }: {
  title: string
  value: string
  sub: string
  badge: { label: string; type: 'green' | 'red' | 'blue' }
  icon: React.ReactNode
  iconColor: string
}) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div className="card-title" style={{ margin: 0 }}>{title}</div>
        <div style={{ color: iconColor, opacity: 0.8 }}>{icon}</div>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{sub}</div>
      <div style={{ marginTop: '12px' }}>
        <span className={`badge-${badge.type}`}>{badge.label}</span>
      </div>
    </div>
  )
}

function RecentTransactions() {
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    api.transactions.list().then(t => setTransactions(t.slice(0, 5))).catch(console.error)
  }, [])

  if (!transactions.length) return (
    <div style={{ color: 'var(--text3)', fontSize: '13px', padding: '16px 0' }}>No transactions yet.</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {transactions.map((txn, i) => (
        <div key={txn.id} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 0',
          borderBottom: i < transactions.length - 1 ? '1px solid var(--card-border)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: getCategoryColor(txn.ai_category) + '20',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px',
            }}>
              {txn.merchant_name?.[0] || '?'}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{txn.merchant_name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
                {txn.ai_category?.replace(/_/g, ' ')} · {txn.date}
              </div>
            </div>
          </div>
          <div style={{
            fontSize: '14px', fontWeight: 600,
            color: txn.amount < 0 ? 'var(--green)' : 'var(--text)',
          }}>
            {txn.amount < 0 ? '+' : ''}{formatCurrency(Math.abs(txn.amount))}
          </div>
        </div>
      ))}
    </div>
  )
}
