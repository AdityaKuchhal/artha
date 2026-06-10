'use client'

import { useEffect, useState } from 'react'
import { api, EarningsSummary, SpendingSummary, DailyEarning } from '@/lib/api'
import { formatCurrency, getCategoryColor, formatDate } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, Briefcase, Link2 } from 'lucide-react'

export default function DashboardPage() {
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null)
  const [spending, setSpending] = useState<SpendingSummary | null>(null)
  const [weeklyEarnings, setWeeklyEarnings] = useState<EarningsSummary | null>(null)
  const [dailyData, setDailyData] = useState<DailyEarning[]>([])
  const [loading, setLoading] = useState(true)
  const [hasTransactions, setHasTransactions] = useState(false)
  const [hasShifts, setHasShifts] = useState(false)

  useEffect(() => {
    Promise.all([
      api.shifts.earnings('monthly'),
      api.transactions.summary('monthly'),
      api.shifts.earnings('weekly'),
      api.shifts.daily(7),
    ])
      .then(([e, s, w, d]) => {
        setEarnings(e)
        setSpending(s)
        setWeeklyEarnings(w)
        setDailyData(d.days)
        setHasShifts((e.shift_count || 0) > 0)
        setHasTransactions((s.by_category?.length || 0) > 0)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const netPosition = (earnings?.total_earnings || 0) - (spending?.total_spent || 0)
  const isPositive = netPosition >= 0

  // Real per-day bar chart data
  const barData = dailyData.map((d) => {
    const dayName = new Date(
      parseInt(d.date.split('-')[0]),
      parseInt(d.date.split('-')[1]) - 1,
      parseInt(d.date.split('-')[2])
    ).toLocaleDateString('en-CA', { weekday: 'short' })
    const isToday = d.date === new Date().toISOString().split('T')[0]
    return {
      day: dayName,
      amount: d.earnings,
      hours: d.hours,
      isToday,
    }
  })

  if (loading)
    return (
      <div className="page">
        <div style={{ color: 'var(--text3)', fontSize: '13px' }}>Loading...</div>
      </div>
    )

  const isEmpty = !hasShifts && !hasTransactions

  return (
    <div className="page fade-up">
      {/* Empty state for brand new users */}
      {isEmpty && (
        <div
          className="card"
          style={{ padding: '40px 32px', display: 'flex', alignItems: 'center', gap: '32px' }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: '8px',
              }}
            >
              Welcome to Artha
            </div>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--text3)',
                lineHeight: '1.6',
                marginBottom: '20px',
              }}
            >
              Get started by adding your jobs and logging shifts, or connect your bank to sync
              transactions.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a href="/dashboard/cards" style={{ textDecoration: 'none' }}>
                <button className="btn btn-primary">
                  <Briefcase size={13} /> Add a Job
                </button>
              </a>
              <a href="/dashboard/cards" style={{ textDecoration: 'none' }}>
                <button className="btn btn-ghost">
                  <Link2 size={13} /> Connect Bank
                </button>
              </a>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '13px',
              color: 'var(--text3)',
            }}
          >
            {[
              { step: '1', label: 'Add your jobs with hourly rates' },
              { step: '2', label: 'Log shifts to track income' },
              { step: '3', label: 'Connect bank to sync spending' },
              { step: '4', label: 'Run AI Report for insights' },
            ].map(({ step, label }) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: 'var(--accent-dim)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {step}
                </div>
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top stat cards */}
      <div className="grid-3">
        <StatCard
          title="Earned This Month"
          value={formatCurrency(earnings?.total_earnings || 0)}
          sub={
            hasShifts
              ? `${earnings?.total_hours || 0}h · ${earnings?.shift_count || 0} shifts`
              : 'No shifts logged yet'
          }
          badge={
            hasShifts
              ? {
                  label: '+' + formatCurrency(weeklyEarnings?.total_earnings || 0) + ' this week',
                  type: 'green',
                }
              : { label: 'Add jobs to start', type: 'blue' }
          }
          icon={<TrendingUp size={18} />}
          iconColor="var(--green)"
        />
        <StatCard
          title="Spent This Month"
          value={formatCurrency(spending?.total_spent || 0)}
          sub={
            hasTransactions
              ? `${spending?.by_category?.length || 0} categories tracked`
              : 'No transactions synced yet'
          }
          badge={
            hasTransactions
              ? { label: 'Plaid synced', type: 'blue' }
              : { label: 'Connect bank', type: 'blue' }
          }
          icon={<TrendingDown size={18} />}
          iconColor="var(--red)"
        />
        <StatCard
          title="Net Position"
          value={(isPositive ? '' : '-') + formatCurrency(Math.abs(netPosition))}
          sub={isPositive ? 'Ahead this month' : 'Behind this month'}
          badge={{
            label: isPositive ? 'Positive' : 'Negative',
            type: isPositive ? 'green' : 'red',
          }}
          icon={<Wallet size={18} />}
          iconColor={isPositive ? 'var(--green)' : 'var(--red)'}
        />
      </div>

      {/* Middle row */}
      <div className="grid-2-1">
        {/* Weekly earnings bar chart — real per-day data */}
        <div className="card">
          <div className="card-title">Last 7 Days — Earnings</div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginBottom: '20px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text3)' }}>This week total</div>
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 700,
                  color: 'var(--text)',
                  letterSpacing: '-1.5px',
                  lineHeight: 1.1,
                }}
              >
                {formatCurrency(weeklyEarnings?.total_earnings || 0)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Monthly total</div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--accent)',
                  letterSpacing: '-0.5px',
                }}
              >
                {formatCurrency(earnings?.total_earnings || 0)}
              </div>
            </div>
          </div>

          {!hasShifts ? (
            <div
              style={{
                height: 160,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text3)',
                fontSize: '13px',
              }}
            >
              Log shifts to see your earnings chart
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={barData}
                barSize={32}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
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
                  tickFormatter={(v) => (v === 0 ? '0' : `$${v}`)}
                />
                <Tooltip
                  formatter={(v, _, props) => [
                    typeof v === 'number' ? formatCurrency(v) : '',
                    `Earned · ${props.payload?.hours || 0}h`,
                  ]}
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
                      fill={
                        entry.amount > 0
                          ? entry.isToday
                            ? 'var(--accent)'
                            : 'var(--green)'
                          : 'var(--bg3)'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Spending breakdown */}
        <div className="card">
          <div className="card-title">Spending Breakdown</div>
          {!hasTransactions ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 0',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '13px', color: 'var(--text3)', textAlign: 'center' }}>
                Connect your bank to see spending by category
              </div>
              <a href="/dashboard/cards">
                <button className="btn btn-ghost" style={{ fontSize: '12px' }}>
                  <Link2 size={12} /> Connect Bank
                </button>
              </a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {(spending?.by_category || [])
                .filter((c) => c.total > 0)
                .slice(0, 6)
                .map((cat) => (
                  <div key={cat.category}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '6px',
                      }}
                    >
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
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div className="card-title" style={{ margin: 0 }}>
            Recent Transactions
          </div>
          <a
            href="/dashboard/transactions"
            style={{
              fontSize: '12px',
              color: 'var(--accent)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            View all <ArrowUpRight size={13} />
          </a>
        </div>
        <RecentTransactions hasTransactions={hasTransactions} />
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  sub,
  badge,
  icon,
  iconColor,
}: {
  title: string
  value: string
  sub: string
  badge: { label: string; type: 'green' | 'red' | 'blue' }
  icon: React.ReactNode
  iconColor: string
}) {
  return (
    <div className="card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px',
        }}
      >
        <div className="card-title" style={{ margin: 0 }}>
          {title}
        </div>
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

function RecentTransactions({ hasTransactions }: { hasTransactions: boolean }) {
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    api.transactions
      .list()
      .then((t) => setTransactions(t.slice(0, 5)))
      .catch(console.error)
  }, [])

  if (!hasTransactions || !transactions.length)
    return (
      <div style={{ padding: '24px 0', textAlign: 'center' }}>
        <div style={{ color: 'var(--text3)', fontSize: '13px', marginBottom: '12px' }}>
          No transactions yet — connect your bank to see them here
        </div>
        <a href="/dashboard/cards">
          <button className="btn btn-ghost" style={{ fontSize: '12px' }}>
            <Link2 size={12} /> Connect Bank
          </button>
        </a>
      </div>
    )

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {transactions.map((txn, i) => (
        <div
          key={txn.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderBottom: i < transactions.length - 1 ? '1px solid var(--card-border)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: getCategoryColor(txn.ai_category) + '22',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 700,
                color: getCategoryColor(txn.ai_category),
              }}
            >
              {txn.merchant_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
                {txn.merchant_name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
                {txn.ai_category?.replace(/_/g, ' ')} · {formatDate(txn.date)}
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: txn.amount < 0 ? 'var(--green)' : 'var(--text)',
            }}
          >
            {txn.amount < 0 ? '+' : ''}
            {formatCurrency(Math.abs(txn.amount))}
          </div>
        </div>
      ))}
    </div>
  )
}
