'use client'

import { useEffect, useState } from 'react'
import { api, Job, Shift, EarningsSummary } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Briefcase, Trash2, Clock, Building2, Link2, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { usePlaidLink, LinkedAccount } from '@/lib/usePlaidLink'

export default function AccountsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [rate, setRate] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [activeTab, setActiveTab] = useState<'jobs' | 'banks'>('jobs')

  const { open, ready, loading: plaidLoading, syncing, error: plaidError, linkedAccounts } =
    usePlaidLink()

  useEffect(() => {
    Promise.all([api.jobs.list(), api.shifts.earnings('monthly')])
      .then(([j, e]) => { setJobs(j); setEarnings(e) })
      .catch(console.error)
  }, [])

  async function addJob(e: React.FormEvent) {
    e.preventDefault()
    const job = await api.jobs.create({ name, hourly_rate: parseFloat(rate), color })
    setJobs([...jobs, job])
    setName(''); setRate(''); setShowForm(false)
  }

  async function deleteJob(id: string) {
    await api.jobs.delete(id)
    setJobs(jobs.filter(j => j.id !== id))
  }

  return (
    <div className="page fade-up">

      {/* Header with tab switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg2)', borderRadius: '10px', padding: '4px' }}>
          {(['jobs', 'banks'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '6px 16px', borderRadius: '8px', border: 'none',
              cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
              background: activeTab === tab ? 'var(--card-bg)' : 'transparent',
              color: activeTab === tab ? 'var(--text)' : 'var(--text3)',
              boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              transition: 'all 0.15s ease',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              {tab === 'jobs' ? <Briefcase size={13} /> : <Building2 size={13} />}
              {tab === 'jobs' ? 'Jobs' : 'Banks'}
              {tab === 'banks' && linkedAccounts.length > 0 && (
                <span style={{
                  background: 'var(--accent)', color: '#fff', borderRadius: '20px',
                  padding: '0 6px', fontSize: '10px', fontWeight: 700, lineHeight: '18px',
                }}>
                  {linkedAccounts.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'jobs' ? (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} /> Add Job
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => open()}
            disabled={!ready || plaidLoading}
            style={{ opacity: (!ready || plaidLoading) ? 0.6 : 1 }}>
            {plaidLoading
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Initializing...</>
              : <><Link2 size={14} /> Connect Bank</>}
          </button>
        )}
      </div>

      {/* Error banner */}
      {plaidError && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '12px 16px', borderRadius: '10px',
          background: 'var(--red)20', border: '1px solid var(--red)40',
          color: 'var(--red)', fontSize: '13px',
        }}>
          <AlertCircle size={15} /> {plaidError}
        </div>
      )}

      {/* ── JOBS TAB ── */}
      {activeTab === 'jobs' && (
        <>
          {showForm && (
            <form onSubmit={addJob} className="card">
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>New Job Profile</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '16px' }}>
                <div>
                  <label className="label">Job Name</label>
                  <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Employer name" required />
                </div>
                <div>
                  <label className="label">Hourly Rate ($/hr)</label>
                  <input className="input" type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} placeholder="17.20" required />
                </div>
                <div>
                  <label className="label">Color</label>
                  <input type="color" value={color} onChange={e => setColor(e.target.value)}
                    style={{ width: '100%', height: '40px', background: 'var(--bg2)', border: '1px solid var(--card-border)', borderRadius: '10px', cursor: 'pointer' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button type="submit" className="btn btn-primary">Save</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          <div className="grid-2">
            {jobs.map(job => {
              const jobEarnings = earnings?.by_job.find(j => j.job_id === job.id)
              return (
                <div key={job.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: job.color }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: job.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Briefcase size={20} color={job.color} />
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{job.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text3)' }}>${job.hourly_rate}/hr</div>
                      </div>
                    </div>
                    <button onClick={() => deleteJob(job.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '4px' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="divider" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    {[
                      { label: 'Earned', value: formatCurrency(jobEarnings?.earnings || 0), color: 'var(--green)' },
                      { label: 'Hours', value: `${jobEarnings?.hours || 0}h`, color: 'var(--text)' },
                      { label: 'Shifts', value: jobEarnings?.shifts || 0, color: 'var(--text)' },
                    ].map(({ label, value, color: c }) => (
                      <div key={label}>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: c }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text3)', marginBottom: '6px' }}>
                      <span>Monthly progress</span>
                      <span>{jobEarnings?.hours || 0} / 80h target</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.min(((jobEarnings?.hours || 0) / 80) * 100, 100)}%`, background: job.color }} />
                    </div>
                  </div>
                </div>
              )
            })}
            {jobs.length === 0 && (
              <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px' }}>
                <Briefcase size={32} style={{ color: 'var(--text3)', margin: '0 auto 12px' }} />
                <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: '4px' }}>No jobs yet</div>
                <div style={{ color: 'var(--text3)', fontSize: '13px' }}>Add your part-time jobs to track income</div>
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>Recent Shifts</div>
            <RecentShifts jobs={jobs} />
          </div>
        </>
      )}

      {/* ── BANKS TAB ── */}
      {activeTab === 'banks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {syncing && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px 16px', borderRadius: '10px',
              background: 'var(--accent)10', border: '1px solid var(--accent)30',
              fontSize: '13px', color: 'var(--accent)',
            }}>
              <Loader2 size={15} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
              Syncing your transactions — this takes a few seconds...
            </div>
          )}

          {linkedAccounts.map(account => (
            <BankAccountCard key={account.item_id} account={account} />
          ))}

          {linkedAccounts.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '64px 32px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '16px',
                background: 'var(--accent)15',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <Building2 size={28} color="var(--accent)" />
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>No banks connected</div>
              <div style={{ fontSize: '13px', color: 'var(--text3)', maxWidth: '320px', margin: '0 auto 24px' }}>
                Connect your bank to automatically sync transactions and power your AI reports.
              </div>
              <button className="btn btn-primary" onClick={() => open()} disabled={!ready || plaidLoading}>
                {plaidLoading
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Initializing...</>
                  : <><Link2 size={14} /> Connect Your Bank</>}
              </button>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '16px' }}>
                Secured by Plaid · 256-bit encryption
              </div>
            </div>
          )}

          {linkedAccounts.length > 0 && (
            <button onClick={() => open()} disabled={!ready} className="btn btn-ghost"
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px dashed var(--card-border)', fontSize: '13px', gap: '8px' }}>
              <Plus size={14} /> Connect Another Bank
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function BankAccountCard({ account }: { account: LinkedAccount }) {
  const statusConfig = {
    linked:  { icon: <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />, label: 'Linking',  color: 'var(--text3)' },
    syncing: { icon: <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />, label: 'Syncing', color: 'var(--accent)' },
    synced:  { icon: <CheckCircle2 size={13} />, label: 'Synced', color: 'var(--green)' },
    error:   { icon: <AlertCircle size={13} />,  label: 'Error',  color: 'var(--red)' },
  }[account.status]

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent)15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Building2 size={22} color="var(--accent)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{account.institution_name}</div>
        {account.synced_count !== undefined && (
          <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{account.synced_count} transactions synced</div>
        )}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '4px 10px', borderRadius: '20px',
        background: statusConfig.color + '15', color: statusConfig.color,
        fontSize: '12px', fontWeight: 600, flexShrink: 0,
      }}>
        {statusConfig.icon} {statusConfig.label}
      </div>
    </div>
  )
}

function RecentShifts({ jobs }: { jobs: Job[] }) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [showForm, setShowForm] = useState(false)
  const [jobId, setJobId] = useState('')
  const [date, setDate] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  useEffect(() => { api.shifts.list().then(setShifts).catch(console.error) }, [])

  async function logShift(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const shift = await api.shifts.create({ job_id: jobId, date, start_time: start + ':00', end_time: end + ':00' })
    setShifts([shift, ...shifts])
    setShowForm(false)
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button className="btn btn-ghost" onClick={() => setShowForm(!showForm)}><Clock size={13} /> Log Shift</button>
      </div>
      {showForm && (
        <form onSubmit={logShift} className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div><label className="label">Job</label>
              <select className="input" value={jobId} onChange={e => setJobId(e.target.value)} required>
                <option value="">Select</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
              </select>
            </div>
            <div><label className="label">Date</label><input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
            <div><label className="label">Start</label><input className="input" type="time" value={start} onChange={e => setStart(e.target.value)} required /></div>
            <div><label className="label">End</label><input className="input" type="time" value={end} onChange={e => setEnd(e.target.value)} required /></div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button type="submit" className="btn btn-primary">Log Shift</button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Job</th><th>Hours</th><th>Earnings</th><th>Source</th></tr></thead>
          <tbody>
            {shifts.length === 0
              ? <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: '32px' }}>No shifts logged yet.</td></tr>
              : shifts.map(s => {
                const job = jobs.find(j => j.id === s.job_id)
                return (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--text3)', fontSize: '12px' }}>{formatDate(s.date)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: job?.color || 'var(--accent)', flexShrink: 0 }} />
                        <span style={{ color: 'var(--text)', fontSize: '13px' }}>{job?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text)', fontWeight: 500 }}>{s.hours_worked}h</td>
                    <td style={{ color: 'var(--green)', fontWeight: 600 }}>{formatCurrency(s.earnings)}</td>
                    <td><span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', background: 'var(--bg3)', color: 'var(--text3)' }}>{s.source}</span></td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </>
  )
}
