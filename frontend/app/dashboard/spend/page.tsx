'use client'

import { useEffect, useState } from 'react'
import { api, Transaction, SpendingSummary } from '@/lib/api'
import { formatCurrency, formatDate, getCategoryColor } from '@/lib/utils'
import { RefreshCw } from 'lucide-react'

export default function SpendPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<SpendingSummary | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.transactions.list(),
      api.transactions.summary('monthly'),
    ]).then(([t, s]) => {
      setTransactions(t)
      setSummary(s)
    }).catch(console.error)
      .finally(() => setLoading(false))
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
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Spending</h1>
          <p className="text-[#6b7280] text-sm mt-1">
            {summary ? formatCurrency(summary.total_spent) + ' this month' : 'Loading...'}
          </p>
        </div>
        <button
          onClick={syncTransactions}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-[#00e5a0] text-[#0a0a0f] rounded-lg text-sm font-semibold hover:bg-[#00b87a] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync Bank'}
        </button>
      </div>

      {/* Category breakdown */}
      {summary && summary.by_category.length > 0 && (
        <div className="bg-[#111118] border border-[rgba(120,120,200,0.12)] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">This Month</h2>
          <div className="space-y-3">
            {summary.by_category.filter(c => c.total > 0).map(cat => (
              <div key={cat.category}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#9090a8]">
                    {cat.category.replace(/_/g, ' ')}
                  </span>
                  <span className="text-white">{formatCurrency(cat.total)}</span>
                </div>
                <div className="h-1.5 bg-[#1a1a24] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
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

      {/* Transactions table */}
      <div>
        <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
          Transactions
        </h2>
        <div className="bg-[#111118] border border-[rgba(120,120,200,0.12)] rounded-xl overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-[#6b7280] text-sm">
              No transactions yet. Click Sync Bank to fetch from Plaid.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(120,120,200,0.12)]">
                  {['Date', 'Merchant', 'Category', 'Amount'].map(h => (
                    <th key={h} className="text-left text-xs text-[#6b7280] font-medium px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map(txn => (
                  <tr
                    key={txn.id}
                    className="border-b border-[rgba(120,120,200,0.06)] hover:bg-[rgba(255,255,255,0.02)]"
                  >
                    <td className="px-4 py-3 text-[#9090a8]">{formatDate(txn.date)}</td>
                    <td className="px-4 py-3 text-white">
                      {txn.merchant_name}
                      {txn.is_subscription && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-400">
                          sub
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: getCategoryColor(txn.ai_category) + '20',
                          color: getCategoryColor(txn.ai_category),
                        }}
                      >
                        {txn.ai_category?.replace(/_/g, ' ') || 'Unknown'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-medium ${txn.amount < 0 ? 'text-[#00e5a0]' : 'text-white'}`}>
                      {txn.amount < 0 ? '+' : ''}{formatCurrency(Math.abs(txn.amount))}
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
