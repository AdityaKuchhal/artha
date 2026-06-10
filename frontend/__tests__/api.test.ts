/**
 * api.test.ts — Unit tests for API client.
 *
 * Tests request construction, auth header injection,
 * error handling, and response parsing.
 * Mocks fetch and Supabase session.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Supabase before importing api
vi.mock('@/lib/supabase', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'fake-jwt-token',
          },
        },
      }),
    },
  }),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/dashboard',
}))

describe('API client — request construction', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('injects Authorization header with Bearer token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
    vi.stubGlobal('fetch', mockFetch)

    const { api } = await import('@/lib/api')
    await api.jobs.list()

    expect(mockFetch).toHaveBeenCalledOnce()
    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers['Authorization']).toBe('Bearer fake-jwt-token')
  })

  it('sets Content-Type to application/json', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
    vi.stubGlobal('fetch', mockFetch)

    const { api } = await import('@/lib/api')
    await api.jobs.list()

    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers['Content-Type']).toBe('application/json')
  })

  it('throws with detail message on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
        json: async () => ({ detail: 'Job not found' }),
      })
    )

    const { api } = await import('@/lib/api')
    await expect(api.jobs.list()).rejects.toThrow('Job not found')
  })

  it('falls back to "Request failed" when no detail in error body', async () => {
    // api.ts: throw new Error(error.detail || 'Request failed')
    // statusText is only used if res.json() itself throws
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: async () => ({}),
      })
    )

    const { api } = await import('@/lib/api')
    await expect(api.jobs.list()).rejects.toThrow('Request failed')
  })

  it('sends POST body as JSON string', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'job-001',
        name: 'Tim Hortons',
        hourly_rate: 17.2,
        color: '#3b82f6',
        is_active: true,
        created_at: '',
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { api } = await import('@/lib/api')
    await api.jobs.create({ name: 'Tim Hortons', hourly_rate: 17.2 })

    const [, options] = mockFetch.mock.calls[0]
    expect(options.method).toBe('POST')
    const body = JSON.parse(options.body)
    expect(body.name).toBe('Tim Hortons')
    expect(body.hourly_rate).toBe(17.2)
  })

  it('sends DELETE with correct method', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })
    )

    const { api } = await import('@/lib/api')
    await api.jobs.delete('job-001')

    const [url, options] = (vi.mocked(fetch) as any).mock.calls[0]
    expect(options.method).toBe('DELETE')
    expect(url).toContain('/jobs/job-001')
  })
})

describe('API client — plaid endpoints', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('linkToken sends POST to /plaid/link-token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ link_token: 'link-sandbox-abc' }),
      })
    )

    const { api } = await import('@/lib/api')
    const result = await api.plaid.linkToken()

    const [url, options] = (vi.mocked(fetch) as any).mock.calls[0]
    expect(url).toContain('/plaid/link-token')
    expect(options.method).toBe('POST')
    expect(result.link_token).toBe('link-sandbox-abc')
  })

  it('exchange sends public_token and institution_name', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', institution: 'RBC Royal Bank' }),
      })
    )

    const { api } = await import('@/lib/api')
    await api.plaid.exchange('public-token-xyz', 'RBC Royal Bank')

    const [, options] = (vi.mocked(fetch) as any).mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.public_token).toBe('public-token-xyz')
    expect(body.institution_name).toBe('RBC Royal Bank')
  })

  it('sync sends days as query param', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ job_id: 'job-uuid', status: 'pending' }),
      })
    )

    const { api } = await import('@/lib/api')
    await api.plaid.sync(60)

    const [url] = (vi.mocked(fetch) as any).mock.calls[0]
    expect(url).toContain('days=60')
  })
})

describe('API client — reports endpoints', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('run sends POST with days param', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ job_id: 'abc-123', status: 'pending', message: 'queued' }),
      })
    )

    const { api } = await import('@/lib/api')
    const result = await api.reports.run(30)

    const [url, options] = (vi.mocked(fetch) as any).mock.calls[0]
    expect(url).toContain('/reports/run?days=30')
    expect(options.method).toBe('POST')
    expect(result.job_id).toBe('abc-123')
    expect(result.status).toBe('pending')
  })

  it('status polls by job_id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ job_id: 'abc-123', status: 'complete', report: 'Your spending...' }),
      })
    )

    const { api } = await import('@/lib/api')
    const result = await api.reports.status('abc-123')

    const [url] = (vi.mocked(fetch) as any).mock.calls[0]
    expect(url).toContain('/reports/status?job_id=abc-123')
    expect(result.status).toBe('complete')
  })
})

describe('API client — shifts endpoints', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('earnings sends correct period', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          period: 'monthly',
          total_earnings: 500,
          total_hours: 30,
          by_job: [],
          shift_count: 5,
        }),
      })
    )

    const { api } = await import('@/lib/api')
    await api.shifts.earnings('monthly')

    const [url] = (vi.mocked(fetch) as any).mock.calls[0]
    expect(url).toContain('period=monthly')
  })

  it('daily sends days param', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ days: [], total_earnings: 0, total_hours: 0 }),
      })
    )

    const { api } = await import('@/lib/api')
    await api.shifts.daily(7)

    const [url] = (vi.mocked(fetch) as any).mock.calls[0]
    expect(url).toContain('days=7')
  })

  it('update sends PATCH with correct shift id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'shift-001', hours_worked: 7.0, earnings: 120.4 }),
      })
    )

    const { api } = await import('@/lib/api')
    await api.shifts.update('shift-001', { end_time: '16:00:00' })

    const [url, options] = (vi.mocked(fetch) as any).mock.calls[0]
    expect(url).toContain('/shifts/shift-001')
    expect(options.method).toBe('PATCH')
  })

  it('delete sends DELETE with correct shift id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })
    )

    const { api } = await import('@/lib/api')
    await api.shifts.delete('shift-001')

    const [url, options] = (vi.mocked(fetch) as any).mock.calls[0]
    expect(url).toContain('/shifts/shift-001')
    expect(options.method).toBe('DELETE')
  })
})
