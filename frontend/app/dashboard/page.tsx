'use client'

import { useEffect, useState } from 'react'
import { api, EarningsSummary, SpendingSummary } from '@/lib/api'
import { formatCurrency, getCategoryColor } from '@/lib/utils'
import {
  PieChart, Pie, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

export default function DashboardPage() {
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null)
  const [spending, setSpending] = useState<SpendingSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.shifts.earnings('monthly'),
      api.transactions.summary('monthly'),
    ]).then(([e, s]) => {
      setEarnings(e)
      setSpending(s)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const netPosition = (earnings?.total_earnings || 0) - (spending?.total_spent || 0)

  if (loading) return <LoadingState />

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Overview</h1>
        <p className="text-[#6b7280] text-sm mt-1">
          {new Date().toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Earned this month"
          value={formatCurrency(earnings?.total_earnings || 0)}
          sub={`${earnings?.total_hours || 0} hours worked`}
          icon={<TrendingUp size={18} className="text-[#00e5a0]" />}
          accent="green"
        />
        <StatCard
          label="Spent this month"
          value={formatCurrency(spending?.total_spent || 0)}
          sub={`${spending?.by_category.length || 0} categories`}
          icon={<TrendingDown size={18} className="text-red-400" />}
          accent="red"
        />
        <StatCard
          label="Net position"
          value={formatCurrency(netPosition)}
          sub={netPosition >= 0 ? 'Ahead this month' : 'Behind this month'}
          icon={<DollarSign size={18} className={netPosition >= 0 ? 'text-[#00e5a0]' : 'text-red-400'} />}
          accent={netPosition >= 0 ? 'green' : 'red'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings by job */}
        {earnings && earnings.by_job.length > 0 && (
          <div className="bg-[#111118] border border-[rgba(120,120,200,0.12)] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-white mb-4">Earnings by Job</h2>
            <div className="space-y-3">
              {earnings.by_job.map((job) => (
                <div key={job.job_id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#9090a8]">{job.job_name}</span>
                    <span className="text-white">{formatCurrency(job.earnings)}</span>
                  </div>
                  <div className="h-1.5 bg-[#1a1a24] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(job.earnings / (earnings.total_earnings || 1)) * 100}%`,
                        backgroundColor: job.color || '#00e5a0',
                      }}
                    />
                  </div>
                  <div className="text-xs text-[#6b7280] mt-1">
                    {job.hours}h · {job.shifts} shifts
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spending by category */}
        {spending && spending.by_category.length > 0 && (
          <div className="bg-[#111118] border border-[rgba(120,120,200,0.12)] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-white mb-4">Spending by Category</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={spending.by_category
                    .filter(c => c.total > 0)
                    .map(c => ({ ...c, fill: getCategoryColor(c.category) }))}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                />
                <Tooltip
                  formatter={(val) => typeof val === 'number' ? formatCurrency(val) : ''}
                  contentStyle={{
                    background: '#1a1a24',
                    border: '1px solid rgba(120,120,200,0.12)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {spending.by_category.slice(0, 5).map((cat) => (
                <div key={cat.category} className="flex justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getCategoryColor(cat.category) }}
                    />
                    <span className="text-[#9090a8]">
                      {cat.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-white">{formatCurrency(cat.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label, value, sub, icon, accent
}: {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  accent: 'green' | 'red'
}) {
  return (
    <div className="bg-[#111118] border border-[rgba(120,120,200,0.12)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[#6b7280]">{label}</span>
        {icon}
      </div>
      <div className={`text-2xl font-bold ${accent === 'green' ? 'text-[#00e5a0]' : 'text-red-400'}`}>
        {value}
      </div>
      <div className="text-xs text-[#6b7280] mt-1">{sub}</div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="p-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[#1a1a24] rounded w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-[#1a1a24] rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
