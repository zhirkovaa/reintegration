import React, { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trash2, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { db, toDateKey } from '../db.js'

function addDays(dateKey, n) {
  const d = new Date(dateKey + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toDateKey(d)
}

function getWeekMonday(dateKey) {
  const d = new Date(dateKey + 'T00:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return toDateKey(d)
}

function formatHours(h) {
  if (!h && h !== 0) return '—'
  const hrs  = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
}

// ── Daily view ────────────────────────────────────────────────────────────────

function DayView({ date, onDateChange }) {
  const [newTask, setNewTask] = useState('')

  const log = useLiveQuery(() =>
    db.workLogs.where('date').equals(date).first(), [date]
  )
  const tasks = useLiveQuery(() =>
    db.workTasks.where('date').equals(date).orderBy('createdAt').toArray(), [date]
  )

  const plannedH = log?.plannedHours ?? ''
  const actualH  = log?.actualHours  ?? ''

  const pct = (plannedH && actualH)
    ? Math.min(100, Math.round((Number(actualH) / Number(plannedH)) * 100))
    : null

  const doneTasks  = (tasks || []).filter(t => t.done).length
  const totalTasks = (tasks || []).length

  const upsertLog = async (patch) => {
    const existing = await db.workLogs.where('date').equals(date).first()
    if (existing) {
      await db.workLogs.update(existing.id, patch)
    } else {
      await db.workLogs.add({ date, plannedHours: null, actualHours: null, ...patch })
    }
  }

  const addTask = async () => {
    if (!newTask.trim()) return
    await db.workTasks.add({
      date,
      title: newTask.trim(),
      done: false,
      createdAt: new Date().toISOString(),
    })
    setNewTask('')
  }

  const toggleTask = async (task) => {
    await db.workTasks.update(task.id, { done: !task.done })
  }

  const deleteTask = async (id) => {
    await db.workTasks.delete(id)
  }

  const isToday = date === toDateKey()

  return (
    <div className="space-y-4">
      {/* Date nav */}
      <div className="flex items-center gap-2">
        <button onClick={() => onDateChange(addDays(date, -1))} className="btn-ghost p-1.5">
          <ChevronLeft size={16} />
        </button>
        <input
          type="date"
          className="input w-auto text-sm flex-1"
          value={date}
          onChange={e => onDateChange(e.target.value)}
          max={toDateKey()}
        />
        <button
          onClick={() => onDateChange(addDays(date, 1))}
          disabled={date >= toDateKey()}
          className="btn-ghost p-1.5 disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
        {!isToday && (
          <button onClick={() => onDateChange(toDateKey())} className="btn-secondary text-xs">
            Today
          </button>
        )}
      </div>

      {/* Hours */}
      <div className="card">
        <h2 className="font-semibold text-stone-700 mb-3 text-sm">Work hours</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">Planned (h)</label>
            <input
              type="number"
              min="0"
              max="16"
              step="0.5"
              className="input"
              value={plannedH}
              onChange={e => upsertLog({ plannedHours: e.target.value ? Number(e.target.value) : null })}
              placeholder="4"
            />
          </div>
          <div>
            <label className="label">Actual (h)</label>
            <input
              type="number"
              min="0"
              max="16"
              step="0.5"
              className="input"
              value={actualH}
              onChange={e => upsertLog({ actualHours: e.target.value ? Number(e.target.value) : null })}
              placeholder="3"
            />
          </div>
        </div>

        {pct !== null && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-stone-500">
                {formatHours(Number(actualH))} of {formatHours(Number(plannedH))}
              </span>
              <span className={`text-xs font-medium ${
                pct >= 100 ? 'text-sage-600' : pct >= 70 ? 'text-warm-600' : 'text-red-400'
              }`}>
                {pct}%
              </span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  pct >= 100 ? 'bg-sage-500' : pct >= 70 ? 'bg-warm-400' : 'bg-red-300'
                }`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-stone-700 text-sm">Tasks</h2>
          {totalTasks > 0 && (
            <span className={`badge ${
              doneTasks === totalTasks ? 'bg-sage-100 text-sage-700' : 'bg-stone-100 text-stone-500'
            }`}>
              {doneTasks}/{totalTasks}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {totalTasks > 0 && (
          <div className="w-full bg-stone-100 rounded-full h-1.5 mb-3 overflow-hidden">
            <div
              className="h-1.5 bg-sage-400 rounded-full transition-all duration-500"
              style={{ width: `${totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0}%` }}
            />
          </div>
        )}

        {/* Task list */}
        <ul className="space-y-1.5 mb-3">
          {(tasks || []).map(task => (
            <li key={task.id} className="flex items-center gap-2">
              <button
                onClick={() => toggleTask(task)}
                className={`check-circle flex-shrink-0 ${task.done ? 'check-circle-done' : 'check-circle-todo'}`}
              >
                {task.done && <CheckCircle2 size={13} />}
              </button>
              <span className={`flex-1 text-sm ${task.done ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                {task.title}
              </span>
              <button
                onClick={() => deleteTask(task.id)}
                className="btn-ghost p-1 text-red-300 hover:text-red-500"
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>

        {/* Add task */}
        <div className="flex gap-2">
          <input
            className="input text-sm flex-1"
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            placeholder="Add a task…"
            onKeyDown={e => e.key === 'Enter' && addTask()}
          />
          <button onClick={addTask} disabled={!newTask.trim()} className="btn-primary px-3">
            <Plus size={15} />
          </button>
        </div>

        {doneTasks === totalTasks && totalTasks > 0 && (
          <p className="text-sage-600 text-xs mt-2 text-center font-medium">🎉 All tasks done!</p>
        )}
      </div>
    </div>
  )
}

// ── Weekly summary ────────────────────────────────────────────────────────────

function WeekSummary({ currentDate }) {
  const monday = getWeekMonday(currentDate)

  const weekDays = useMemo(() => Array.from({ length: 5 }, (_, i) => {
    return addDays(monday, i)
  }), [monday])

  const weekLogs = useLiveQuery(() =>
    db.workLogs.where('date').anyOf(weekDays).toArray(), [monday]
  )

  const weekTasks = useLiveQuery(() =>
    db.workTasks.where('date').anyOf(weekDays).toArray(), [monday]
  )

  const dayLabels = weekDays.map(d => {
    const dt = new Date(d + 'T00:00:00')
    return dt.toLocaleDateString('en-US', { weekday: 'short' })
  })

  const today = toDateKey()

  const logMap  = new Map((weekLogs  || []).map(l => [l.date, l]))
  const taskMap = new Map()
  ;(weekTasks || []).forEach(t => {
    if (!taskMap.has(t.date)) taskMap.set(t.date, { total: 0, done: 0 })
    const s = taskMap.get(t.date)
    s.total++
    if (t.done) s.done++
  })

  const totalPlanned = weekDays.reduce((s, d) => s + (logMap.get(d)?.plannedHours || 0), 0)
  const totalActual  = weekDays.reduce((s, d) => s + (logMap.get(d)?.actualHours  || 0), 0)

  return (
    <div className="card">
      <h2 className="font-semibold text-stone-700 text-sm mb-3">This week</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-center">
          <thead>
            <tr>
              <th className="text-left text-stone-400 font-medium pb-2 pr-3 w-20"></th>
              {weekDays.map((d, i) => (
                <th
                  key={d}
                  className={`pb-2 font-medium ${
                    d === today ? 'text-sage-600' : d > today ? 'text-stone-300' : 'text-stone-500'
                  }`}
                >
                  {dayLabels[i]}
                  {d === today && <span className="block text-[9px] text-sage-500">today</span>}
                </th>
              ))}
              <th className="pb-2 text-stone-400 font-medium pl-2">Σ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            <tr>
              <td className="text-left text-stone-400 py-2 pr-3">Planned h</td>
              {weekDays.map(d => {
                const v = logMap.get(d)?.plannedHours
                return (
                  <td key={d} className={`py-2 ${d > today ? 'text-stone-300' : 'text-stone-600'}`}>
                    {v != null ? v : '—'}
                  </td>
                )
              })}
              <td className="py-2 text-stone-500 font-medium pl-2">{totalPlanned || '—'}</td>
            </tr>
            <tr>
              <td className="text-left text-stone-400 py-2 pr-3">Actual h</td>
              {weekDays.map(d => {
                const log = logMap.get(d)
                const v   = log?.actualHours
                const p   = log?.plannedHours
                const over = v != null && p != null && v >= p
                return (
                  <td
                    key={d}
                    className={`py-2 font-medium ${
                      d > today ? 'text-stone-300'
                      : v == null ? 'text-stone-300'
                      : over ? 'text-sage-600'
                      : 'text-warm-600'
                    }`}
                  >
                    {v != null ? v : '—'}
                  </td>
                )
              })}
              <td className="py-2 text-stone-600 font-medium pl-2">{totalActual || '—'}</td>
            </tr>
            <tr>
              <td className="text-left text-stone-400 py-2 pr-3">Tasks</td>
              {weekDays.map(d => {
                const s = taskMap.get(d)
                if (!s || s.total === 0) return (
                  <td key={d} className="py-2 text-stone-300">—</td>
                )
                return (
                  <td key={d} className={`py-2 ${s.done === s.total ? 'text-sage-600' : 'text-stone-500'}`}>
                    {s.done}/{s.total}
                  </td>
                )
              })}
              <td className="py-2 text-stone-400 pl-2">
                {weekDays.reduce((s, d) => s + (taskMap.get(d)?.done || 0), 0)}/
                {weekDays.reduce((s, d) => s + (taskMap.get(d)?.total || 0), 0) || '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-3 text-xs text-stone-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-sage-500 inline-block" /> On or over plan
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-warm-400 inline-block" /> Under plan
        </span>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function WorkTracker() {
  const [date, setDate] = useState(toDateKey())

  return (
    <div className="fade-in space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-stone-700">Work</h1>
        <p className="text-sm text-stone-400 mt-0.5">Planned vs actual hours and tasks</p>
      </div>

      <DayView date={date} onDateChange={setDate} />
      <WeekSummary currentDate={date} />
    </div>
  )
}
