'use client'

import { useEffect, useState } from 'react'
import { api, Transaction, SpendingSummary } from '@/lib/api'
import { formatCurrency, formatDate, getCategoryColor } from '@/lib/utils'
import { RefreshCw } from 'lucide-react'

export default function SpendPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<SpendingSummary | null>(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    Promise.all([api.transactions.list(), api.transactions.summary('monthly')])
      .then(([t, s]) => {
        setTransactions(t)
        setSummary(s)
      })
      .catch(console.error)
  }, [])

  async function syncTransactions() {
    setSyncing(true)
    try {
      await api.plaid.sync(30)
      const [t, s] = await Promise.all([
        api.transactions.list(),
        api.transactions.summary('monthly'),
      ])
      setTransactions(t)
      setSummary(s)
    } catch (e) {
      console.error(e)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#e8e8f0', marginBottom: '4px' }}>
            Spending
          </h1>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>
            {summary ? formatCurrency(summary.total_spent) + ' this month' : '—'}
          </p>
        </div>
        <button className="btn-primary" onClick={syncTransactions} disabled={syncing}>
          <RefreshCw
            size={13}
            style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}
          />
          {syncing ? 'Syncing...' : 'Sync Bank'}
        </button>
      </div>

      {/* Category breakdown */}
      {summary && summary.by_category.length > 0 && (
        <div className="card">
          <div
            style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8f0', marginBottom: '16px' }}
          >
            This Month
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {summary.by_category
              .filter((c) => c.total > 0)
              .map((cat) => (
                <div key={cat.category}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      marginBottom: '6px',
                    }}
                  >
                    <span style={{ color: '#9090a8' }}>{cat.category.replace(/_/g, ' ')}</span>
                    <span style={{ color: '#e8e8f0' }}>{formatCurrency(cat.total)}</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(cat.total / (summary.total_spent || 1)) * 100}%`,
                        backgroundColor: getCategoryColor(cat.category),
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div>
        <div className="section-title">Transactions</div>
        <div className="table-container">
          {transactions.length === 0 ? (
            <div
              style={{ padding: '48px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}
            >
              No transactions. Click Sync Bank to fetch from Plaid.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Merchant</th>
                  <th>Category</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td>{formatDate(txn.date)}</td>
                    <td style={{ color: '#e8e8f0' }}>
                      {txn.merchant_name}
                      {txn.is_subscription && (
                        <span
                          className="badge"
                          style={{
                            marginLeft: '8px',
                            background: 'rgba(168,85,247,0.15)',
                            color: '#a855f7',
                          }}
                        >
                          sub
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: getCategoryColor(txn.ai_category) + '20',
                          color: getCategoryColor(txn.ai_category),
                        }}
                      >
                        {txn.ai_category?.replace(/_/g, ' ') || 'Unknown'}
                      </span>
                    </td>
                    <td style={{ color: txn.amount < 0 ? '#00e5a0' : '#e8e8f0', fontWeight: 500 }}>
                      {txn.amount < 0 ? '+' : ''}
                      {formatCurrency(Math.abs(txn.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
