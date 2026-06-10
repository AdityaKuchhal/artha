'use client'

import { useState, useEffect, useRef } from 'react'
import { api, JobStatus } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Zap, AlertTriangle, Plus, CheckCircle2, Clock } from 'lucide-react'

const CATEGORIES = [
  'FOOD_AND_DRINK',
  'TRANSPORTATION',
  'RENT_AND_UTILITIES',
  'GENERAL_MERCHANDISE',
  'PERSONAL_CARE',
  'ENTERTAINMENT',
  'TRAVEL',
]

const AGENTS = ['extract', 'categorize', 'analyze', 'monitor', 'report']

type RunPhase = 'idle' | 'pending' | 'running' | 'complete' | 'error'

export default function ReportPage() {
  const [report, setReport] = useState<JobStatus | null>(null)
  const [jobStatus, setJobStatus] = useState<RunPhase>('idle')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [budgetCategory, setBudgetCategory] = useState('')
  const [budgetLimit, setBudgetLimit] = useState('')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  function startElapsedTimer() {
    setElapsedSeconds(0)
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1)
    }, 1000)
  }

  function stopTimers() {
    if (pollRef.current) clearInterval(pollRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  async function runReport() {
    try {
      setJobStatus('pending')
      setReport(null)
      setErrorMessage(null)
      startElapsedTimer()

      const { job_id } = await api.reports.run(30)
      setJobStatus('running')

      pollRef.current = setInterval(async () => {
        try {
          const result = await api.reports.status(job_id)

          if (result.status === 'complete') {
            stopTimers()
            setJobStatus('complete')
            setReport(result)
          } else if (result.status === 'error') {
            stopTimers()
            setJobStatus('error')
            setErrorMessage(result.error || 'Report generation failed')
          }
        } catch (e) {
          console.error('Poll error:', e)
        }
      }, 3000)
    } catch (e) {
      stopTimers()
      setJobStatus('error')
      setErrorMessage(e instanceof Error ? e.message : 'Failed to start report')
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

  const isRunning = jobStatus === 'pending' || jobStatus === 'running'

  return (
    <div className="page fade-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--text3)' }}>
            5-agent pipeline · extract → categorize → analyze → monitor → report
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost" onClick={() => setShowBudgetForm(!showBudgetForm)}>
            <Plus size={14} /> Set Budget
          </button>
          <button
            className="btn btn-primary"
            onClick={runReport}
            disabled={isRunning}
            style={{ opacity: isRunning ? 0.7 : 1 }}
          >
            <Zap size={14} />
            {isRunning ? `Running... ${elapsedSeconds}s` : 'Run Report'}
          </button>
        </div>
      </div>

      {/* Budget form */}
      {showBudgetForm && (
        <form onSubmit={addBudget} className="card">
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text)',
              marginBottom: '16px',
            }}
          >
            Set Monthly Budget
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={budgetCategory}
                onChange={(e) => setBudgetCategory(e.target.value)}
                required
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Monthly Limit ($)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                placeholder="400"
                required
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button type="submit" className="btn btn-primary">
              Save Budget
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowBudgetForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Running state */}
      {isRunning && (
        <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '24px',
            }}
          >
            {AGENTS.map((agent, i) => (
              <div key={agent} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      animation: 'pulse 1.5s ease-in-out infinite',
                      animationDelay: `${i * 0.3}s`,
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{agent}</span>
                </div>
                {i < AGENTS.length - 1 && (
                  <div
                    style={{
                      width: '24px',
                      height: '1px',
                      background: 'var(--card-border)',
                      marginBottom: '14px',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <div
            style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 600, marginBottom: '4px' }}
          >
            Running 5-agent pipeline
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Clock size={12} />
            {elapsedSeconds}s elapsed · typically 60–90s
          </div>
        </div>
      )}

      {/* Error state */}
      {jobStatus === 'error' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: 'var(--red)',
            fontSize: '13px',
          }}
        >
          <AlertTriangle size={15} />
          {errorMessage || 'Report failed. Try again.'}
        </div>
      )}

      {/* Report output */}
      {report && jobStatus === 'complete' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Success indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
              color: 'var(--green)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={14} />
            Report complete · {elapsedSeconds}s · {report.transactions_processed ?? 0} transactions
            analyzed
          </div>

          {/* Budget alerts */}
          {(report.budget_alerts?.length ?? 0) > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {report.budget_alerts!.map((alert, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    background:
                      alert.severity === 'critical'
                        ? 'rgba(239,68,68,0.08)'
                        : 'rgba(245,158,11,0.08)',
                    border: `1px solid ${alert.severity === 'critical' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
                  }}
                >
                  <AlertTriangle
                    size={15}
                    style={{
                      color: alert.severity === 'critical' ? 'var(--red)' : '#f59e0b',
                      flexShrink: 0,
                      marginTop: '1px',
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: alert.severity === 'critical' ? 'var(--red)' : '#f59e0b',
                      }}
                    >
                      {alert.category.replace(/_/g, ' ')} — {alert.percent_used}% of budget used
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                      {alert.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Anomalies */}
          {(report.anomalies?.length ?? 0) > 0 && (
            <div className="card">
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  marginBottom: '12px',
                }}
              >
                Anomalies Detected
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Merchant</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.anomalies!.map((a, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--text)', fontWeight: 500 }}>{a.merchant}</td>
                        <td style={{ color: 'var(--red)', fontWeight: 600 }}>
                          {formatCurrency(a.amount)}
                        </td>
                        <td style={{ color: 'var(--text3)', fontSize: '12px' }}>{a.date}</td>
                        <td style={{ color: 'var(--text3)', fontSize: '12px' }}>{a.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI analysis */}
          <div className="card" style={{ borderColor: 'rgba(59,130,246,0.2)' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}
            >
              <Zap size={14} color="var(--accent)" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>
                AI Analysis
              </span>
            </div>
            <p
              style={{
                color: 'var(--text3)',
                fontSize: '13px',
                lineHeight: '1.7',
                whiteSpace: 'pre-line',
              }}
            >
              {report.report}
            </p>
          </div>

          {/* Stats */}
          <div className="grid-2">
            <div className="card">
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '8px',
                }}
              >
                Total Spent
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)' }}>
                {formatCurrency(report.total_spent ?? 0)}
              </div>
            </div>
            <div className="card">
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--text3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '8px',
                }}
              >
                Daily Burn Rate
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)' }}>
                {formatCurrency(report.daily_burn_rate ?? 0)}
                <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text3)' }}>
                  /day
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {jobStatus === 'idle' && (
        <div className="card" style={{ textAlign: 'center', padding: '64px 32px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'var(--accent-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <Zap size={28} color="var(--accent)" />
          </div>
          <div
            style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}
          >
            Run your financial report
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text3)' }}>
            5 AI agents will analyze your transactions, detect anomalies, and generate insights
          </div>
        </div>
      )}
    </div>
  )
}
