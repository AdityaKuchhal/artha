'use client'

import { useEffect, useState } from 'react'
import { api, EarningsSummary, SpendingSummary } from '@/lib/api'
import { formatCurrency, getCategoryColor } from '@/lib/utils'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

export default function DashboardPage() {
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null)
  const [spending, setSpending] = useState<SpendingSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.shifts.earnings('monthly'),
      api.transactions.summary('monthly'),
    ]).then(([e, s]) => { setEarnings(e); setSpending(s) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const netPosition = (earnings?.total_earnings || 0) - (spending?.total_spent || 0)

  if (loading) return (
    <div style={{ padding: '32px' }}>
      <div style={{ color: '#6b7280', fontSize: '13px' }}>Loading...</div>
    </div>
  )

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#e8e8f0', marginBottom: '4px' }}>Overview</h1>
        <p style={{ fontSize: '13px', color: '#6b7280' }}>
          {new Date().toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <StatCard
          label="Earned this month"
          value={formatCurrency(earnings?.total_earnings || 0)}
          sub={`${earnings?.total_hours || 0} hours worked`}
          valueColor="#00e5a0"
          icon={<TrendingUp size={16} color="#00e5a0" />}
        />
        <StatCard
          label="Spent this month"
          value={formatCurrency(spending?.total_spent || 0)}
          sub={`${spending?.by_category.length || 0} categories`}
          valueColor="#f87171"
          icon={<TrendingDown size={16} color="#f87171" />}
        />
        <StatCard
          label="Net position"
          value={formatCurrency(netPosition)}
          sub={netPosition >= 0 ? 'Ahead this month' : 'Behind this month'}
          valueColor={netPosition >= 0 ? '#00e5a0' : '#f87171'}
          icon={<DollarSign size={16} color={netPosition >= 0 ? '#00e5a0' : '#f87171'} />}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Earnings by job */}
        {earnings && earnings.by_job.length > 0 && (
          <div className="card">
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8f0', marginBottom: '16px' }}>
              Earnings by Job
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {earnings.by_job.map((job) => (
                <div key={job.job_id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ color: '#9090a8' }}>{job.job_name}</span>
                    <span style={{ color: '#e8e8f0' }}>{formatCurrency(job.earnings)}</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(job.earnings / (earnings.total_earnings || 1)) * 100}%`,
                        backgroundColor: job.color || '#00e5a0',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                    {job.hours}h · {job.shifts} shifts
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spending by category */}
        {spending && spending.by_category.length > 0 && (
          <div className="card">
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8f0', marginBottom: '16px' }}>
              Spending by Category
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={spending.by_category.filter(c => c.total > 0)}
                  dataKey="total"
                  nameKey="category"
                  cx="50%" cy="50%"
                  outerRadius={75} innerRadius={35}
                >
                  {spending.by_category.filter(c => c.total > 0).map((entry) => (
                    <Cell key={entry.category} fill={getCategoryColor(entry.category)} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => typeof val === 'number' ? formatCurrency(val) : ''}
                  contentStyle={{
                    background: '#1a1a24',
                    border: '1px solid rgba(120,120,200,0.12)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'JetBrains Mono',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
              {spending.by_category.slice(0, 5).map((cat) => (
                <div key={cat.category} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getCategoryColor(cat.category), flexShrink: 0 }} />
                    <span style={{ color: '#9090a8' }}>{cat.category.replace(/_/g, ' ')}</span>
                  </div>
                  <span style={{ color: '#e8e8f0' }}>{formatCurrency(cat.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, valueColor, icon }: {
  label: string; value: string; sub: string; valueColor: string; icon: React.ReactNode
}) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>{label}</span>
        {icon}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: valueColor, marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#6b7280' }}>{sub}</div>
    </div>
  )
}
