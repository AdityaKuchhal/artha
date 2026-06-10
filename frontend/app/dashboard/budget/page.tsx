'use client'

import { useEffect, useState } from 'react'
import { api, Budget, SpendingSummary } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react'

const CATEGORIES = [
  'FOOD_AND_DRINK',
  'TRANSPORTATION',
  'RENT_AND_UTILITIES',
  'GENERAL_MERCHANDISE',
  'PERSONAL_CARE',
  'ENTERTAINMENT',
  'TRAVEL',
  'LOAN_PAYMENTS',
]

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [summary, setSummary] = useState<SpendingSummary | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState('')
  const [limit, setLimit] = useState('')

  useEffect(() => {
    Promise.all([api.budgets.list(), api.transactions.summary('monthly')])
      .then(([b, s]) => {
        setBudgets(b)
        setSummary(s)
      })
      .catch(console.error)
  }, [])

  async function addBudget(e: React.FormEvent) {
    e.preventDefault()
    const budget = await api.budgets.create({ category, monthly_limit: parseFloat(limit) })
    setBudgets([...budgets, budget])
    setCategory('')
    setLimit('')
    setShowForm(false)
  }

  async function deleteBudget(id: string) {
    await api.budgets.delete(id)
    setBudgets(budgets.filter((b) => b.id !== id))
  }

  const getSpent = (cat: string) => summary?.by_category.find((c) => c.category === cat)?.total || 0

  const totalBudgeted = budgets.reduce((s, b) => s + b.monthly_limit, 0)
  const totalSpent = budgets.reduce((s, b) => s + getSpent(b.category), 0)
  const overBudgetCount = budgets.filter((b) => getSpent(b.category) > b.monthly_limit).length

  return (
    <div className="page fade-up">
      {/* Summary */}
      <div className="grid-3">
        <div className="card">
          <div className="card-title">Total Budgeted</div>
          <div className="metric-value">{formatCurrency(totalBudgeted)}</div>
          <div className="metric-label">{budgets.length} categories</div>
        </div>
        <div className="card">
          <div className="card-title">Total Spent</div>
          <div
            className="metric-value"
            style={{ color: totalSpent > totalBudgeted ? 'var(--red)' : 'var(--text)' }}
          >
            {formatCurrency(totalSpent)}
          </div>
          <div className="metric-label">Against budget</div>
        </div>
        <div className="card">
          <div className="card-title">Over Budget</div>
          <div
            className="metric-value"
            style={{ color: overBudgetCount > 0 ? 'var(--red)' : 'var(--green)' }}
          >
            {overBudgetCount}
          </div>
          <div className="metric-label">
            {overBudgetCount === 0 ? 'All within limits' : 'Categories exceeded'}
          </div>
        </div>
      </div>

      {/* Add budget */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> Set Budget
        </button>
      </div>

      {showForm && (
        <form onSubmit={addBudget} className="card">
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text)',
              marginBottom: '16px',
            }}
          >
            New Budget Limit
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
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
                className="input"
                type="number"
                step="0.01"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="400"
                required
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button type="submit" className="btn btn-primary">
              Save Budget
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Budget cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {budgets.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
            <CheckCircle size={32} style={{ color: 'var(--text3)', margin: '0 auto 12px' }} />
            <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: '4px' }}>
              No budgets set
            </div>
            <div style={{ color: 'var(--text3)', fontSize: '13px' }}>
              Set monthly limits to track your spending
            </div>
          </div>
        ) : (
          budgets.map((budget) => {
            const spent = getSpent(budget.category)
            const pct = Math.min((spent / budget.monthly_limit) * 100, 100)
            const isOver = spent > budget.monthly_limit
            const isWarning = pct >= 80 && !isOver

            return (
              <div key={budget.id} className="card" style={{ padding: '18px 22px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isOver ? (
                      <AlertTriangle size={16} color="var(--red)" />
                    ) : isWarning ? (
                      <AlertTriangle size={16} color="#f59e0b" />
                    ) : (
                      <CheckCircle size={16} color="var(--green)" />
                    )}
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                        {budget.category.replace(/_/g, ' ')}
                      </div>
                      {isOver && (
                        <div style={{ fontSize: '11px', color: 'var(--red)', marginTop: '2px' }}>
                          Over budget by {formatCurrency(spent - budget.monthly_limit)}
                        </div>
                      )}
                      {isWarning && (
                        <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '2px' }}>
                          {pct.toFixed(0)}% used — approaching limit
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: isOver ? 'var(--red)' : 'var(--text)',
                        }}
                      >
                        {formatCurrency(spent)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
                        of {formatCurrency(budget.monthly_limit)}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteBudget(budget.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text3)',
                        padding: '4px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text3)')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${pct}%`,
                      background: isOver ? 'var(--red)' : isWarning ? '#f59e0b' : 'var(--accent)',
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: 'var(--text3)',
                    marginTop: '6px',
                  }}
                >
                  <span>{pct.toFixed(0)}% used</span>
                  <span>{formatCurrency(Math.max(budget.monthly_limit - spent, 0))} remaining</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
