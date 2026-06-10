'use client'

import { useEffect, useState } from 'react'
import { api, DailyEarning } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  Cell,
} from 'recharts'
import { Link2 } from 'lucide-react'

export default function CashFlowPage() {
  const [monthly, setMonthly] = useState<any>(null)
  const [weekly, setWeekly] = useState<any>(null)
  const [dailyData, setDailyData] = useState<DailyEarning[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.shifts.earnings('monthly'),
      api.transactions.summary('monthly'),
      api.shifts.earnings('weekly'),
      api.transactions.summary('weekly'),
      api.shifts.daily(28),
    ])
      .then(([em, sm, ew, sw, daily]) => {
        setMonthly({ earned: em.total_earnings, spent: sm.total_spent })
        setWeekly({ earned: ew.total_earnings, spent: sw.total_spent })
        setDailyData(daily.days)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const net = (monthly?.earned || 0) - (monthly?.spent || 0)
  const isPositive = net >= 0
  const hasShifts = (monthly?.earned || 0) > 0
  const hasTransactions = (monthly?.spent || 0) > 0

  // Build weekly buckets from daily data for area chart
  const weeklyBuckets = (() => {
    if (!dailyData.length) return []
    const buckets: { week: string; earned: number; spent: number }[] = []
    const weeksInMonth = 4
    const daysPerWeek = Math.ceil(dailyData.length / weeksInMonth)

    for (let w = 0; w < weeksInMonth; w++) {
      const chunk = dailyData.slice(w * daysPerWeek, (w + 1) * daysPerWeek)
      const weekEarned = chunk.reduce((s, d) => s + d.earnings, 0)
      // Distribute monthly spending evenly across weeks (no per-day spending data)
      const weekSpent = (monthly?.spent || 0) / weeksInMonth
      buckets.push({
        week: `Week ${w + 1}`,
        earned: Math.round(weekEarned * 100) / 100,
        spent: Math.round(weekSpent * 100) / 100,
      })
    }
    return buckets
  })()

  // Daily bar chart — last 14 days
  const barData = dailyData.slice(-14).map((d) => {
    const [y, m, day] = d.date.split('-').map(Number)
    const label = new Date(y, m - 1, day).toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
    })
    return { label, earnings: d.earnings, hours: d.hours }
  })

  if (loading)
    return (
      <div className="page">
        <div style={{ color: 'var(--text3)', fontSize: '13px' }}>Loading...</div>
      </div>
    )

  return (
    <div className="page fade-up">
      {/* Summary cards */}
      <div className="grid-3">
        <div className="card">
          <div className="card-title">Total Income</div>
          <div className="metric-value" style={{ color: 'var(--green)' }}>
            {formatCurrency(monthly?.earned || 0)}
          </div>
          <div className="metric-label">
            {hasShifts ? 'This month from shifts' : 'No shifts logged yet'}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Total Expenses</div>
          <div className="metric-value" style={{ color: 'var(--red)' }}>
            {formatCurrency(monthly?.spent || 0)}
          </div>
          <div className="metric-label">
            {hasTransactions ? 'This month from Plaid' : 'No transactions synced yet'}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Net Cash Flow</div>
          <div
            className="metric-value"
            style={{ color: isPositive ? 'var(--green)' : 'var(--red)' }}
          >
            {isPositive ? '+' : '-'}
            {formatCurrency(Math.abs(net))}
          </div>
          <div className="metric-label">{isPositive ? 'Positive flow' : 'Negative flow'}</div>
        </div>
      </div>

      {/* Income vs Expenses area chart */}
      <div className="card">
        <div className="card-title">Income vs Expenses — Monthly View</div>
        {!hasShifts && !hasTransactions ? (
          <div
            style={{
              height: 280,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--text3)' }}>
              Log shifts and connect your bank to see cash flow
            </div>
            <a href="/dashboard/cards">
              <button className="btn btn-ghost" style={{ fontSize: '12px' }}>
                <Link2 size={12} /> Get Started
              </button>
            </a>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={weeklyBuckets} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="earnedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="spentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: 'var(--text3)', fontFamily: 'DM Sans' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text3)', fontFamily: 'DM Sans' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                formatter={(v, name) => [
                  typeof v === 'number' ? formatCurrency(v) : '',
                  name === 'earned' ? 'Income' : 'Expenses',
                ]}
                contentStyle={{
                  background: 'var(--bg2)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontFamily: 'DM Sans',
                  color: 'var(--text)',
                }}
              />
              <Legend
                formatter={(v) => (v === 'earned' ? 'Income' : 'Expenses')}
                wrapperStyle={{ fontSize: '12px', fontFamily: 'DM Sans', color: 'var(--text2)' }}
              />
              <Area
                type="monotone"
                dataKey="earned"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#earnedGrad)"
              />
              <Area
                type="monotone"
                dataKey="spent"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#spentGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Daily earnings bar — last 14 days */}
      <div className="card">
        <div className="card-title">Daily Earnings — Last 14 Days</div>
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
            Log shifts to see your daily earnings
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={barData}
              barSize={24}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'var(--text3)', fontFamily: 'DM Sans' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--text3)', fontFamily: 'DM Sans' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v === 0 ? '' : `$${v}`)}
              />
              <Tooltip
                formatter={(v, _, props) => [
                  typeof v === 'number' ? formatCurrency(v) : '',
                  `${props.payload?.hours || 0}h worked`,
                ]}
                contentStyle={{
                  background: 'var(--bg2)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontFamily: 'DM Sans',
                  color: 'var(--text)',
                }}
              />
              <Bar dataKey="earnings" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.earnings > 0 ? 'var(--green)' : 'var(--bg3)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Weekly snapshot */}
      <div className="grid-2">
        <div className="card">
          <div className="card-title">This Week — Income</div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--green)',
              letterSpacing: '-0.5px',
            }}
          >
            {formatCurrency(weekly?.earned || 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>
            From logged shifts
          </div>
        </div>
        <div className="card">
          <div className="card-title">This Week — Expenses</div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--red)',
              letterSpacing: '-0.5px',
            }}
          >
            {formatCurrency(weekly?.spent || 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>
            From bank transactions
          </div>
        </div>
      </div>
    </div>
  )
}
