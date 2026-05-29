'use client'

import { useState } from 'react'
import { api, Report } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Zap, AlertTriangle, Plus } from 'lucide-react'

const CATEGORIES = [
  'FOOD_AND_DRINK', 'TRANSPORTATION', 'RENT_AND_UTILITIES',
  'GENERAL_MERCHANDISE', 'PERSONAL_CARE', 'ENTERTAINMENT', 'TRAVEL',
]

export default function ReportPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [running, setRunning] = useState(false)
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [budgetCategory, setBudgetCategory] = useState('')
  const [budgetLimit, setBudgetLimit] = useState('')

  async function runReport() {
    setRunning(true)
    try {
      const result = await api.reports.run(30)
      setReport(result)
    } catch (e) {
      console.error(e)
    } finally {
      setRunning(false)
    }
  }

  async function addBudget(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await api.budgets.create({
      category: budgetCategory,
      monthly_limit: parseFloat(budgetLimit),
    })
    setBudgetCategory('')
    setBudgetLimit('')
    setShowBudgetForm(false)
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Report</h1>
          <p className="text-[#6b7280] text-sm mt-1">
            5-agent pipeline: extract → categorize → analyze → monitor → report
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBudgetForm(!showBudgetForm)}
            className="flex items-center gap-2 px-4 py-2 border border-[rgba(120,120,200,0.2)] rounded-lg text-sm text-[#9090a8] hover:text-white transition-colors"
          >
            <Plus size={14} />
            Set Budget
          </button>
          <button
            onClick={runReport}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 bg-[#00e5a0] text-[#0a0a0f] rounded-lg text-sm font-semibold hover:bg-[#00b87a] transition-colors disabled:opacity-50"
          >
            <Zap size={14} />
            {running ? 'Running agents...' : 'Run Report'}
          </button>
        </div>
      </div>

      {/* Budget form */}
      {showBudgetForm && (
        <form onSubmit={addBudget} className="bg-[#111118] border border-[rgba(120,120,200,0.12)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Set Monthly Budget</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#6b7280] mb-1">Category</label>
              <select
                value={budgetCategory}
                onChange={e => setBudgetCategory(e.target.value)}
                className="w-full bg-[#1a1a24] border border-[rgba(120,120,200,0.12)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#00e5a0]"
                required
              >
                <option value="">Select category</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-1">Monthly Limit ($)</label>
              <input
                type="number"
                step="0.01"
                value={budgetLimit}
                onChange={e => setBudgetLimit(e.target.value)}
                className="w-full bg-[#1a1a24] border border-[rgba(120,120,200,0.12)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#00e5a0]"
                placeholder="400"
                required
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="px-4 py-2 bg-[#00e5a0] text-[#0a0a0f] rounded-lg text-sm font-semibold">
              Save Budget
            </button>
            <button type="button" onClick={() => setShowBudgetForm(false)} className="px-4 py-2 text-sm text-[#6b7280]">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Running state */}
      {running && (
        <div className="bg-[#111118] border border-[rgba(120,120,200,0.12)] rounded-xl p-8 text-center">
          <div className="flex justify-center gap-2 mb-4">
            {['extract', 'categorize', 'analyze', 'monitor', 'report'].map((agent, i) => (
              <div key={agent} className="flex flex-col items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full bg-[#00e5a0] animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
                <span className="text-xs text-[#6b7280]">{agent}</span>
              </div>
            ))}
          </div>
          <p className="text-[#6b7280] text-sm">Running 5-agent pipeline...</p>
        </div>
      )}

      {/* Report output */}
      {report && !running && (
        <div className="space-y-6">
          {/* Budget alerts */}
          {report.budget_alerts?.length > 0 && (
            <div className="space-y-2">
              {report.budget_alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-4 rounded-xl border ${
                    alert.severity === 'critical'
                      ? 'bg-red-950/20 border-red-900/30'
                      : 'bg-yellow-950/20 border-yellow-900/30'
                  }`}
                >
                  <AlertTriangle
                    size={16}
                    className={alert.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'}
                  />
                  <div>
                    <div className={`text-sm font-medium ${alert.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>
                      {alert.category.replace(/_/g, ' ')} — {alert.percent_used}% of budget used
                    </div>
                    <div className="text-xs text-[#9090a8] mt-0.5">{alert.message}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Anomalies */}
          {report.anomalies?.length > 0 && (
            <div className="bg-[#111118] border border-[rgba(120,120,200,0.12)] rounded-xl p-6">
              <h2 className="text-sm font-semibold text-white mb-3">Anomalies Detected</h2>
              <div className="space-y-2">
                {report.anomalies.map((a, i) => (
                  <div key={i} className="flex justify-between items-center text-sm py-2 border-b border-[rgba(120,120,200,0.06)] last:border-0">
                    <div>
                      <span className="text-white">{a.merchant}</span>
                      <span className="text-xs text-[#6b7280] ml-2">z={a.z_score}</span>
                    </div>
                    <span className="text-red-400 font-medium">{formatCurrency(a.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Report */}
          <div className="bg-[#111118] border border-[rgba(0,229,160,0.15)] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={14} className="text-[#00e5a0]" />
              <h2 className="text-sm font-semibold text-[#00e5a0]">AI Analysis</h2>
            </div>
            <p className="text-[#9090a8] text-sm leading-relaxed whitespace-pre-line">
              {report.report}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#111118] border border-[rgba(120,120,200,0.12)] rounded-xl p-5">
              <div className="text-xs text-[#6b7280] mb-1">Total Spent</div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(report.total_spent)}
              </div>
            </div>
            <div className="bg-[#111118] border border-[rgba(120,120,200,0.12)] rounded-xl p-5">
              <div className="text-xs text-[#6b7280] mb-1">Daily Burn Rate</div>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(report.daily_burn_rate)}/day
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!report && !running && (
        <div className="bg-[#111118] border border-[rgba(120,120,200,0.12)] rounded-xl p-12 text-center">
          <Zap size={32} className="text-[#00e5a0] mx-auto mb-4" />
          <p className="text-white font-medium mb-2">Run your financial report</p>
          <p className="text-[#6b7280] text-sm">
            5 AI agents will analyze your income and spending patterns
          </p>
        </div>
      )}
    </div>
  )
}
