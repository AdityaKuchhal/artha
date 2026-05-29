'use client'

import { useEffect, useState } from 'react'
import { api, Job, Shift } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Briefcase, Trash2 } from 'lucide-react'

export default function IncomePage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [showJobForm, setShowJobForm] = useState(false)
  const [showShiftForm, setShowShiftForm] = useState(false)

  const [jobName, setJobName] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [jobColor, setJobColor] = useState('#00e5a0')
  const [selectedJob, setSelectedJob] = useState('')
  const [shiftDate, setShiftDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  useEffect(() => {
    Promise.all([api.jobs.list(), api.shifts.list()])
      .then(([j, s]) => { setJobs(j); setShifts(s) })
      .catch(console.error)
  }, [])

  async function addJob(e: React.FormEvent) {
    e.preventDefault()
    const job = await api.jobs.create({ name: jobName, hourly_rate: parseFloat(hourlyRate), color: jobColor })
    setJobs([...jobs, job])
    setJobName(''); setHourlyRate(''); setShowJobForm(false)
  }

  async function addShift(e: React.FormEvent) {
    e.preventDefault()
    const shift = await api.shifts.create({
      job_id: selectedJob,
      date: shiftDate,
      start_time: startTime + ':00',
      end_time: endTime + ':00',
    })
    setShifts([shift, ...shifts])
    setShowShiftForm(false)
  }

  async function deleteJob(id: string) {
    await api.jobs.delete(id)
    setJobs(jobs.filter(j => j.id !== id))
  }

  const totalEarnings = shifts.reduce((sum, s) => sum + s.earnings, 0)
  const totalHours = shifts.reduce((sum, s) => sum + s.hours_worked, 0)

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#e8e8f0', marginBottom: '4px' }}>Income</h1>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>
            {formatCurrency(totalEarnings)} earned · {totalHours.toFixed(1)} hours
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-secondary" onClick={() => setShowJobForm(!showJobForm)}>
            <Briefcase size={13} /> Add Job
          </button>
          <button className="btn-primary" onClick={() => setShowShiftForm(!showShiftForm)}>
            <Plus size={13} /> Log Shift
          </button>
        </div>
      </div>

      {/* Add Job Form */}
      {showJobForm && (
        <form onSubmit={addJob} className="card">
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8f0', marginBottom: '16px' }}>New Job</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>Job Name</label>
              <input value={jobName} onChange={e => setJobName(e.target.value)} className="input" placeholder="Job name" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>Hourly Rate ($)</label>
              <input type="number" step="0.01" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} className="input" placeholder="17.20" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>Color</label>
              <input type="color" value={jobColor} onChange={e => setJobColor(e.target.value)}
                style={{ width: '100%', height: '40px', background: '#1a1a24', border: '1px solid rgba(120,120,200,0.12)', borderRadius: '8px', cursor: 'pointer' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button type="submit" className="btn-primary">Save Job</button>
            <button type="button" onClick={() => setShowJobForm(false)}
              style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Log Shift Form */}
      {showShiftForm && (
        <form onSubmit={addShift} className="card">
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#e8e8f0', marginBottom: '16px' }}>Log Shift</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>Job</label>
              <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)} className="input" required>
                <option value="">Select job</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>Date</label>
              <input type="date" value={shiftDate} onChange={e => setShiftDate(e.target.value)} className="input" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>Start</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="input" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>End</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="input" required />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button type="submit" className="btn-primary">Log Shift</button>
            <button type="button" onClick={() => setShowShiftForm(false)}
              style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Jobs */}
      <div>
        <div className="section-title">Your Jobs</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {jobs.map(job => (
            <div key={job.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: job.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '13px', color: '#e8e8f0' }}>{job.name}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>${job.hourly_rate}/hr</div>
                </div>
              </div>
              <button onClick={() => deleteJob(job.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Shifts */}
      <div>
        <div className="section-title">Recent Shifts</div>
        <div className="table-container">
          {shifts.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
              No shifts logged yet.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Hours</th><th>Earnings</th><th>Source</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map(shift => (
                  <tr key={shift.id}>
                    <td>{formatDate(shift.date)}</td>
                    <td style={{ color: '#e8e8f0' }}>{shift.hours_worked}h</td>
                    <td style={{ color: '#00e5a0', fontWeight: 500 }}>{formatCurrency(shift.earnings)}</td>
                    <td>
                      <span className="badge" style={{ background: '#1a1a24', color: '#6b7280' }}>{shift.source}</span>
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
