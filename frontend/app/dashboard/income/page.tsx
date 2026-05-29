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
  const [loading, setLoading] = useState(true)

  // Job form state
  const [jobName, setJobName] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [jobColor, setJobColor] = useState('#00e5a0')

  // Shift form state
  const [selectedJob, setSelectedJob] = useState('')
  const [shiftDate, setShiftDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  useEffect(() => {
    Promise.all([api.jobs.list(), api.shifts.list()])
      .then(([j, s]) => { setJobs(j); setShifts(s) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function addJob(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const job = await api.jobs.create({
      name: jobName,
      hourly_rate: parseFloat(hourlyRate),
      color: jobColor,
    })
    setJobs([...jobs, job])
    setJobName(''); setHourlyRate(''); setShowJobForm(false)
  }

  async function addShift(e: React.FormEvent<HTMLFormElement>) {
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
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Income</h1>
          <p className="text-[#6b7280] text-sm mt-1">
            {formatCurrency(totalEarnings)} earned · {totalHours.toFixed(1)} hours
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJobForm(!showJobForm)}
            className="flex items-center gap-2 px-4 py-2 border border-[rgba(120,120,200,0.2)] rounded-lg text-sm text-[#9090a8] hover:text-white transition-colors"
          >
            <Briefcase size={14} />
            Add Job
          </button>
          <button
            onClick={() => setShowShiftForm(!showShiftForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#00e5a0] text-[#0a0a0f] rounded-lg text-sm font-semibold hover:bg-[#00b87a] transition-colors"
          >
            <Plus size={14} />
            Log Shift
          </button>
        </div>
      </div>

      {/* Add Job Form */}
      {showJobForm && (
        <form onSubmit={addJob} className="bg-[#111118] border border-[rgba(120,120,200,0.12)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">New Job</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-[#6b7280] mb-1">Job Name</label>
              <input
                value={jobName}
                onChange={e => setJobName(e.target.value)}
                className="w-full bg-[#1a1a24] border border-[rgba(120,120,200,0.12)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#00e5a0]"
                placeholder="Tim Hortons"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-1">Hourly Rate ($)</label>
              <input
                type="number"
                step="0.01"
                value={hourlyRate}
                onChange={e => setHourlyRate(e.target.value)}
                className="w-full bg-[#1a1a24] border border-[rgba(120,120,200,0.12)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#00e5a0]"
                placeholder="17.20"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-1">Color</label>
              <input
                type="color"
                value={jobColor}
                onChange={e => setJobColor(e.target.value)}
                className="w-full h-10 bg-[#1a1a24] border border-[rgba(120,120,200,0.12)] rounded-lg cursor-pointer"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="px-4 py-2 bg-[#00e5a0] text-[#0a0a0f] rounded-lg text-sm font-semibold">
              Save Job
            </button>
            <button type="button" onClick={() => setShowJobForm(false)} className="px-4 py-2 text-sm text-[#6b7280]">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Log Shift Form */}
      {showShiftForm && (
        <form onSubmit={addShift} className="bg-[#111118] border border-[rgba(120,120,200,0.12)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Log Shift</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-[#6b7280] mb-1">Job</label>
              <select
                value={selectedJob}
                onChange={e => setSelectedJob(e.target.value)}
                className="w-full bg-[#1a1a24] border border-[rgba(120,120,200,0.12)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#00e5a0]"
                required
              >
                <option value="">Select job</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{j.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-1">Date</label>
              <input
                type="date"
                value={shiftDate}
                onChange={e => setShiftDate(e.target.value)}
                className="w-full bg-[#1a1a24] border border-[rgba(120,120,200,0.12)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#00e5a0]"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-[#1a1a24] border border-[rgba(120,120,200,0.12)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#00e5a0]"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full bg-[#1a1a24] border border-[rgba(120,120,200,0.12)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#00e5a0]"
                required
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" className="px-4 py-2 bg-[#00e5a0] text-[#0a0a0f] rounded-lg text-sm font-semibold">
              Log Shift
            </button>
            <button type="button" onClick={() => setShowShiftForm(false)} className="px-4 py-2 text-sm text-[#6b7280]">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Jobs list */}
      <div>
        <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
          Your Jobs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {jobs.map(job => (
            <div
              key={job.id}
              className="bg-[#111118] border border-[rgba(120,120,200,0.12)] rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: job.color }}
                />
                <div>
                  <div className="text-sm text-white">{job.name}</div>
                  <div className="text-xs text-[#6b7280]">${job.hourly_rate}/hr</div>
                </div>
              </div>
              <button
                onClick={() => deleteJob(job.id)}
                className="text-[#6b7280] hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Shifts list */}
      <div>
        <h2 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
          Recent Shifts
        </h2>
        <div className="bg-[#111118] border border-[rgba(120,120,200,0.12)] rounded-xl overflow-hidden">
          {shifts.length === 0 ? (
            <div className="p-8 text-center text-[#6b7280] text-sm">
              No shifts logged yet. Add your first shift above.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(120,120,200,0.12)]">
                  {['Date', 'Hours', 'Earnings', 'Source'].map(h => (
                    <th key={h} className="text-left text-xs text-[#6b7280] font-medium px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shifts.map(shift => (
                  <tr
                    key={shift.id}
                    className="border-b border-[rgba(120,120,200,0.06)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                  >
                    <td className="px-4 py-3 text-[#9090a8]">{formatDate(shift.date)}</td>
                    <td className="px-4 py-3 text-white">{shift.hours_worked}h</td>
                    <td className="px-4 py-3 text-[#00e5a0] font-medium">
                      {formatCurrency(shift.earnings)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#1a1a24] text-[#6b7280]">
                        {shift.source}
                      </span>
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
