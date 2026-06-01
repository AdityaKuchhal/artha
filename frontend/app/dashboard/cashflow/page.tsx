'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'

export default function CashFlowPage() {
  const [monthly, setMonthly] = useState<any>(null)
  const [weekly, setWeekly] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.shifts.earnings('monthly'),
      api.transactions.summary('monthly'),
      api.shifts.earnings('weekly'),
      api.transactions.summary('weekly'),
    ]).then(([em, sm, ew, sw]) => {
      setMonthly({ earned: em.total_earnings, spent: sm.total_spent })
      setWeekly({ earned: ew.total_earnings, spent: sw.total_spent })
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const chartData = [
    { week: 'Week 1', earned: (monthly?.earned || 0) * 0.2, spent: (monthly?.spent || 0) * 0.25 },
    { week: 'Week 2', earned: (monthly?.earned || 0) * 0.25, spent: (monthly?.spent || 0) * 0.3 },
    { week: 'Week 3', earned: (monthly?.earned || 0) * 0.3, spent: (monthly?.spent || 0) * 0.2 },
    { week: 'Week 4', earned: (monthly?.earned || 0) * 0.25, spent: (monthly?.spent || 0) * 0.25 },
  ]

  const net = (monthly?.earned || 0) - (monthly?.spent || 0)
  const isPositive = net >= 0

  return (
    <div className="page fade-up">
      {/* Summary cards */}
      <div className="grid-3">
        <div className="card">
          <div className="card-title">Total Income</div>
          <div className="metric-value" style={{ color: 'var(--green)' }}>
            {formatCurrency(monthly?.earned || 0)}
          </div>
          <div className="metric-label">This month from shifts</div>
        </div>
        <div className="card">
          <div className="card-title">Total Expenses</div>
          <div className="metric-value" style={{ color: 'var(--red)' }}>
            {formatCurrency(monthly?.spent || 0)}
          </div>
          <div className="metric-label">This month from Plaid</div>
        </div>
        <div className="card">
          <div className="card-title">Net Cash Flow</div>
          <div className="metric-value" style={{ color: isPositive ? 'var(--green)' : 'var(--red)' }}>
            {isPositive ? '+' : '-'}{formatCurrency(Math.abs(net))}
          </div>
          <div className="metric-label">{isPositive ? 'Positive flow' : 'Negative flow'}</div>
        </div>
      </div>

      {/* Area chart */}
      <div className="card">
        <div className="card-title">Income vs Expenses — Monthly View</div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text3)', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text3)', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(v, name) => [
                typeof v === 'number' ? formatCurrency(v) : '',
                name === 'earned' ? 'Income' : 'Expenses',
              ]}
              contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--card-border)', borderRadius: '10px', fontSize: '12px', fontFamily: 'DM Sans', color: 'var(--text)' }}
            />
            <Legend formatter={v => v === 'earned' ? 'Income' : 'Expenses'} wrapperStyle={{ fontSize: '12px', fontFamily: 'DM Sans' }} />
            <Area type="monotone" dataKey="earned" stroke="#10b981" strokeWidth={2} fill="url(#earnedGrad)" />
            <Area type="monotone" dataKey="spent" stroke="#ef4444" strokeWidth={2} fill="url(#spentGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* This week snapshot */}
      <div className="grid-2">
        <div className="card">
          <div className="card-title">This Week — Income</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--green)', letterSpacing: '-0.5px' }}>
            {formatCurrency(weekly?.earned || 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>From logged shifts</div>
        </div>
        <div className="card">
          <div className="card-title">This Week — Expenses</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--red)', letterSpacing: '-0.5px' }}>
            {formatCurrency(weekly?.spent || 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>From bank transactions</div>
        </div>
      </div>
    </div>
  )
}
