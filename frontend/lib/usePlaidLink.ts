/**
 * usePlaidLink.ts — Custom hook for Plaid Link integration.
 * Flow: fetch link_token → open Plaid UI → exchange public_token → sync
 */

import { useState, useEffect, useCallback } from 'react'
import { usePlaidLink as usePlaidLinkSDK } from 'react-plaid-link'
import { api } from '@/lib/api'

export interface LinkedAccount {
  item_id: string
  institution_name: string
  status: 'linked' | 'syncing' | 'synced' | 'error'
  synced_count?: number
}

interface UsePlaidLinkReturn {
  open: () => void
  ready: boolean
  loading: boolean
  syncing: boolean
  error: string | null
  linkedAccounts: LinkedAccount[]
}

export function usePlaidLink(onSuccess?: (account: LinkedAccount) => void): UsePlaidLinkReturn {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])

  const fetchLinkToken = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.plaid.linkToken()
      setLinkToken(data.link_token)
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize bank connection')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLinkToken()
  }, [fetchLinkToken])

  const handleSuccess = useCallback(
    async (public_token: string, metadata: any) => {
      const institutionName = metadata?.institution?.name || 'Unknown Bank'

      const optimisticAccount: LinkedAccount = {
        item_id: `pending-${Date.now()}`,
        institution_name: institutionName,
        status: 'linked',
      }
      setLinkedAccounts((prev) => [...prev, optimisticAccount])

      try {
        await api.plaid.exchange(public_token, institutionName)

        setLinkedAccounts((prev) =>
          prev.map((a) =>
            a.item_id === optimisticAccount.item_id ? { ...a, status: 'syncing' } : a
          )
        )

        setSyncing(true)
        const syncResult = (await api.plaid.sync(30)) as { synced?: number }

        setLinkedAccounts((prev) =>
          prev.map((a) =>
            a.item_id === optimisticAccount.item_id
              ? { ...a, status: 'synced', synced_count: syncResult?.synced || 0 }
              : a
          )
        )

        onSuccess?.({
          ...optimisticAccount,
          status: 'synced',
          synced_count: syncResult?.synced || 0,
        })
        fetchLinkToken() // re-arm for next connection
      } catch (err: any) {
        setLinkedAccounts((prev) =>
          prev.map((a) => (a.item_id === optimisticAccount.item_id ? { ...a, status: 'error' } : a))
        )
        setError(err?.message || 'Failed to sync transactions')
      } finally {
        setSyncing(false)
      }
    },
    [fetchLinkToken, onSuccess]
  )

  const { open, ready } = usePlaidLinkSDK({
    token: linkToken || '',
    onSuccess: handleSuccess,
    onExit: (err: unknown) => {
      if (err) setError('Bank connection was cancelled or failed')
    },
  })

  return { open: () => open(), ready: ready && !loading, loading, syncing, error, linkedAccounts }
}
