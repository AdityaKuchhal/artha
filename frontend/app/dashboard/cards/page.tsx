'use client'

import { useEffect, useState } from 'react'
import { api, Job, EarningsSummary } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Briefcase, Trash2, Clock } from 'lucide-react'

export default function CardsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [rate, setRate] = useState('')
  const [color, setColor] = useState('#3b82f6')

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
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--text3)' }}>
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} · {earnings?.total_hours || 0} hours this month
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> Add Job
        </button>
      </div>

      {/* Add job form */}
      {showForm && (
        <form onSubmit={addJob} className="card">
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '16px' }}>
            New Job Profile
          </div>
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

      {/* Jobs grid */}
      <div className="grid-2">
        {jobs.map(job => {
          const jobEarnings = earnings?.by_job.find(j => j.job_id === job.id)
          return (
            <div key={job.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              {/* Color accent bar */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                background: job.color,
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: job.color + '20',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Briefcase size={20} color={job.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{job.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)' }}>${job.hourly_rate}/hr</div>
                  </div>
                </div>
                <button
                  onClick={() => deleteJob(job.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '4px' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="divider" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Earned</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--green)' }}>
                    {formatCurrency(jobEarnings?.earnings || 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hours</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                    {jobEarnings?.hours || 0}h
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Shifts</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                    {jobEarnings?.shifts || 0}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text3)', marginBottom: '6px' }}>
                  <span>Monthly progress</span>
                  <span>{jobEarnings?.hours || 0} / 80h target</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${Math.min(((jobEarnings?.hours || 0) / 80) * 100, 100)}%`,
                    background: job.color,
                  }} />
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

      {/* Recent shifts */}
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>
          Recent Shifts
        </div>
        <RecentShifts jobs={jobs} />
      </div>
    </div>
  )
}

function RecentShifts({ jobs }: { jobs: Job[] }) {
  const [shifts, setShifts] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [jobId, setJobId] = useState('')
  const [date, setDate] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  useEffect(() => {
    api.shifts.list().then(setShifts).catch(console.error)
  }, [])

  async function logShift(e: React.FormEvent) {
    e.preventDefault()
    const shift = await api.shifts.create({ job_id: jobId, date, start_time: start + ':00', end_time: end + ':00' })
    setShifts([shift, ...shifts])
    setShowForm(false)
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button className="btn btn-ghost" onClick={() => setShowForm(!showForm)}>
          <Clock size={13} /> Log Shift
        </button>
      </div>

      {showForm && (
        <form onSubmit={logShift} className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div>
              <label className="label">Job</label>
              <select className="input" value={jobId} onChange={e => setJobId(e.target.value)} required>
                <option value="">Select</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="label">Start</label>
              <input className="input" type="time" value={start} onChange={e => setStart(e.target.value)} required />
            </div>
            <div>
              <label className="label">End</label>
              <input className="input" type="time" value={end} onChange={e => setEnd(e.target.value)} required />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button type="submit" className="btn btn-primary">Log Shift</button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Date</th><th>Job</th><th>Hours</th><th>Earnings</th><th>Source</th></tr>
          </thead>
          <tbody>
            {shifts.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: '32px' }}>No shifts logged yet.</td></tr>
            ) : shifts.map(s => {
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
                  <td>
                    <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', background: 'var(--bg3)', color: 'var(--text3)' }}>
                      {s.source}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
