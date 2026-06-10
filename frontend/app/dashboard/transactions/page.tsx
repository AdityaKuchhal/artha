'use client'

import { useEffect, useState } from 'react'
import { api, Transaction } from '@/lib/api'
import { formatCurrency, formatDate, getCategoryColor } from '@/lib/utils'
import { RefreshCw, Search } from 'lucide-react'

const CATEGORIES = [
  'All',
  'FOOD_AND_DRINK',
  'TRANSPORTATION',
  'RENT_AND_UTILITIES',
  'LOAN_PAYMENTS',
  'TRANSFER_OUT',
  'TRANSFER_IN',
  'GENERAL_MERCHANDISE',
  'PERSONAL_CARE',
  'TRAVEL',
]

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filtered, setFiltered] = useState<Transaction[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.transactions
      .list()
      .then((t) => {
        setTransactions(t)
        setFiltered(t)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let result = transactions
    if (search) {
      result = result.filter((t) => t.merchant_name.toLowerCase().includes(search.toLowerCase()))
    }
    if (category !== 'All') {
      result = result.filter((t) => t.ai_category === category)
    }
    setFiltered(result)
  }, [search, category, transactions])

  async function sync() {
    setSyncing(true)
    try {
      await api.plaid.sync(30)
      const t = await api.transactions.list()
      setTransactions(t)
    } catch (e) {
      console.error(e)
    } finally {
      setSyncing(false)
    }
  }

  const totalSpent = filtered.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const totalIncome = filtered
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0)

  return (
    <div className="page fade-up">
      {/* Summary row */}
      <div className="grid-3">
        {[
          { label: 'Total Transactions', value: filtered.length.toString(), color: 'var(--text)' },
          { label: 'Total Spent', value: formatCurrency(totalSpent), color: 'var(--red)' },
          { label: 'Total Income', value: formatCurrency(totalIncome), color: 'var(--green)' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: '18px 22px' }}>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text3)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: '8px',
              }}
            >
              {s.label}
            </div>
            <div
              style={{ fontSize: '26px', fontWeight: 700, color: s.color, letterSpacing: '-0.5px' }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text3)',
              }}
            />
            <input
              className="input"
              style={{ paddingLeft: '34px' }}
              placeholder="Search merchant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Category filter */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {CATEGORIES.slice(0, 6).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: category === cat ? 'var(--accent)' : 'var(--card-border)',
                  background: category === cat ? 'var(--accent-dim)' : 'transparent',
                  color: category === cat ? 'var(--accent)' : 'var(--text3)',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--font)',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat === 'All' ? 'All' : cat.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <button
            className="btn btn-ghost"
            onClick={sync}
            disabled={syncing}
            style={{ marginLeft: 'auto' }}
          >
            <RefreshCw
              size={13}
              style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }}
            />
            {syncing ? 'Syncing...' : 'Sync Bank'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Merchant</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  style={{ textAlign: 'center', color: 'var(--text3)', padding: '32px' }}
                >
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  style={{ textAlign: 'center', color: 'var(--text3)', padding: '32px' }}
                >
                  No transactions found.
                </td>
              </tr>
            ) : (
              filtered.map((txn) => (
                <tr key={txn.id}>
                  <td style={{ color: 'var(--text3)', fontSize: '12px' }}>
                    {formatDate(txn.date)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          flexShrink: 0,
                          background: getCategoryColor(txn.ai_category) + '20',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: getCategoryColor(txn.ai_category),
                        }}
                      >
                        {txn.merchant_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
                          {txn.merchant_name}
                          {txn.is_subscription && (
                            <span
                              className="badge-blue"
                              style={{ marginLeft: '8px', fontSize: '10px' }}
                            >
                              sub
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 500,
                        background: getCategoryColor(txn.ai_category) + '18',
                        color: getCategoryColor(txn.ai_category),
                      }}
                    >
                      {txn.ai_category?.replace(/_/g, ' ') || 'Unknown'}
                    </span>
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontWeight: 600,
                      color: txn.amount < 0 ? 'var(--green)' : 'var(--text)',
                    }}
                  >
                    {txn.amount < 0 ? '+' : ''}
                    {formatCurrency(Math.abs(txn.amount))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
