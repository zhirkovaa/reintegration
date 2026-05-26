import React, { useState, useMemo, useRef, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Plus, X, Pencil, Trash2, ArrowDown, CheckCircle2,
  ChevronDown, ChevronUp, Upload, FileSpreadsheet, RefreshCw,
} from 'lucide-react'
import { db, toDateKey } from '../db.js'

// ── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'lab',         label: 'Lab / Test',       emoji: '🔬', color: 'bg-blue-50 text-blue-700' },
  { value: 'appointment', label: 'Appointment',       emoji: '🏥', color: 'bg-lavender-100 text-lavender-700' },
  { value: 'medication',  label: 'Medication',        emoji: '💊', color: 'bg-warm-100 text-warm-700' },
  { value: 'selfcare',    label: 'Self-care',         emoji: '🌿', color: 'bg-sage-100 text-sage-700' },
  { value: 'admin',       label: 'Admin / Paperwork', emoji: '📋', color: 'bg-stone-100 text-stone-600' },
  { value: 'other',       label: 'Other',             emoji: '📌', color: 'bg-stone-100 text-stone-500' },
]

const catInfo = (v) => CATEGORIES.find(c => c.value === v) || CATEGORIES[5]

// ── Chain builder ─────────────────────────────────────────────────────────────

function buildChains(tasks) {
  if (!tasks || tasks.length === 0) return []

  const taskMap  = new Map(tasks.map(t => [t.id, t]))
  // id → children that depend on it
  const children = new Map()

  tasks.forEach(t => {
    if (t.dependsOnId && taskMap.has(t.dependsOnId)) {
      if (!children.has(t.dependsOnId)) children.set(t.dependsOnId, [])
      children.get(t.dependsOnId).push(t)
    }
  })

  // Roots: no valid parent
  const roots = tasks.filter(t => !t.dependsOnId || !taskMap.has(t.dependsOnId))

  const visited = new Set()

  const collect = (task) => {
    if (visited.has(task.id)) return []
    visited.add(task.id)
    const result = [task]
    const kids = (children.get(task.id) || []).sort((a, b) => a.id - b.id)
    kids.forEach(k => result.push(...collect(k)))
    return result
  }

  const chains = roots.map(r => collect(r)).filter(c => c.length > 0)

  // Orphans (parent was deleted)
  tasks.forEach(t => { if (!visited.has(t.id)) chains.push([t]) })

  return chains
}

function taskStatus(task, taskMap) {
  if (task.done) return 'done'
  if (task.dependsOnId) {
    const parent = taskMap.get(task.dependsOnId)
    if (parent && !parent.done) return 'blocked'
  }
  return 'active'
}

// ── TaskForm ──────────────────────────────────────────────────────────────────

const EMPTY_TASK = { title: '', notes: '', category: 'appointment', dueDate: '', dependsOnId: null }

function TaskForm({ initial = EMPTY_TASK, allTasks = [], editingId = null, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_TASK, ...initial })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // A task can't depend on itself or its own descendants (prevent cycles)
  const eligible = allTasks.filter(t => t.id !== editingId)

  return (
    <form
      onSubmit={e => { e.preventDefault(); if (form.title.trim()) onSave(form) }}
      className="space-y-3"
    >
      <div>
        <label className="label">Task *</label>
        <input
          className="input"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="E.g. Schedule appointment with psychiatrist"
          required
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Category</label>
          <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Due date</label>
          <input
            type="date"
            className="input"
            value={form.dueDate}
            onChange={e => set('dueDate', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label">Follows after (optional)</label>
        <select
          className="input"
          value={form.dependsOnId ?? ''}
          onChange={e => set('dependsOnId', e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">— Standalone task</option>
          {eligible.map(t => (
            <option key={t.id} value={t.id}>
              {catInfo(t.category).emoji} {t.title}{t.done ? ' ✓' : ''}
            </option>
          ))}
        </select>
        {form.dependsOnId && (
          <p className="text-xs text-stone-400 mt-1">
            This task unlocks once the prerequisite is marked done.
          </p>
        )}
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea
          className="input resize-none"
          rows={2}
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Any details, reminders, or context…"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary flex-1">Save</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  )
}

// ── TaskItem ──────────────────────────────────────────────────────────────────

function TaskItem({ task, status, onToggle, onEdit, onDelete, parentTitle }) {
  const cat       = catInfo(task.category)
  const isOverdue = !task.done && task.dueDate && task.dueDate < toDateKey()

  return (
    <div className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition-all ${
      status === 'done'    ? 'bg-stone-50/60' :
      status === 'blocked' ? 'bg-stone-50 border border-dashed border-stone-200' :
                             'bg-white border border-sage-100 shadow-sm'
    }`}>
      {/* Check button */}
      <button
        onClick={() => status !== 'blocked' && onToggle(task.id, task.done)}
        disabled={status === 'blocked'}
        className={`mt-0.5 check-circle flex-shrink-0 ${
          status === 'done'    ? 'check-circle-done' :
          status === 'blocked' ? 'border-stone-200 cursor-not-allowed opacity-40' :
                                 'check-circle-todo'
        }`}
        aria-label={task.done ? 'Mark as not done' : 'Mark as done'}
      >
        {status === 'done' && <CheckCircle2 size={14} />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${
            status === 'done'    ? 'line-through text-stone-400' :
            status === 'blocked' ? 'text-stone-400' :
                                   'text-stone-700'
          }`}>
            {task.title}
          </span>
          <span className={`badge ${cat.color}`}>{cat.emoji} {cat.label}</span>
        </div>

        {status === 'blocked' && parentTitle && (
          <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
            <ArrowDown size={10} />
            Waiting for: <span className="italic">{parentTitle}</span>
          </p>
        )}

        {task.dueDate && (
          <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-400 font-medium' : 'text-stone-400'}`}>
            {isOverdue ? '⚠️ ' : '📅 '}
            {task.dueDate}{isOverdue ? ' — overdue' : ''}
          </p>
        )}

        {task.notes && (
          <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{task.notes}</p>
        )}
      </div>

      <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
        <button onClick={() => onEdit(task)} className="btn-ghost p-1.5" title="Edit">
          <Pencil size={13} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="btn-ghost p-1.5 text-red-300 hover:text-red-500"
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ── TreatmentTasks ─────────────────────────────────────────────────────────────

function TreatmentTasks() {
  const [showModal,    setShowModal]    = useState(false)
  const [editingTask,  setEditingTask]  = useState(null)
  const [showDone,     setShowDone]     = useState(false)

  const tasks   = useLiveQuery(() => db.treatmentTasks.orderBy('createdAt').toArray(), [])
  const taskMap = useMemo(() => new Map((tasks || []).map(t => [t.id, t])), [tasks])
  const chains  = useMemo(() => buildChains(tasks || []), [tasks])

  const pendingChains = chains.filter(ch => ch.some(t => !t.done))
  const doneChains    = chains.filter(ch => ch.every(t => t.done))
  const doneCount     = (tasks || []).filter(t => t.done).length
  const activeCount   = (tasks || []).filter(t => !t.done).length

  const handleSave = async (form) => {
    if (editingTask) {
      await db.treatmentTasks.update(editingTask.id, { ...form })
    } else {
      await db.treatmentTasks.add({
        ...form,
        done: false,
        doneAt: null,
        createdAt: new Date().toISOString(),
      })
    }
    setShowModal(false)
    setEditingTask(null)
  }

  const handleEdit = (task) => { setEditingTask(task); setShowModal(true) }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return
    // Clear dangling dependencies
    const deps = (tasks || []).filter(t => t.dependsOnId === id)
    await Promise.all(deps.map(t => db.treatmentTasks.update(t.id, { dependsOnId: null })))
    await db.treatmentTasks.delete(id)
  }

  const handleToggle = async (id, currentDone) => {
    await db.treatmentTasks.update(id, {
      done:   !currentDone,
      doneAt: !currentDone ? new Date().toISOString() : null,
    })
  }

  const renderChain = (chain) =>
    chain.map((task, idx) => {
      const status     = taskStatus(task, taskMap)
      const parentTask = task.dependsOnId ? taskMap.get(task.dependsOnId) : null

      return (
        <div key={task.id}>
          {idx > 0 && (
            <div className="flex items-center gap-0 pl-[11px] py-0.5">
              <div className={`w-px h-4 ${chain[idx - 1].done ? 'bg-sage-300' : 'bg-stone-200'}`} />
              <ArrowDown
                size={9}
                className={`-ml-[5px] ${chain[idx - 1].done ? 'text-sage-400' : 'text-stone-300'}`}
              />
            </div>
          )}
          <TaskItem
            task={task}
            status={status}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onDelete={handleDelete}
            parentTitle={parentTask?.title}
          />
        </div>
      )
    })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-400">
          {activeCount > 0 ? `${activeCount} active` : 'All done'}
          {doneCount > 0 && ` · ${doneCount} completed`}
        </p>
        <button
          onClick={() => { setEditingTask(null); setShowModal(true) }}
          className="btn-primary flex items-center gap-1.5"
        >
          <Plus size={15} /> Add task
        </button>
      </div>

      {/* Tip */}
      {(tasks || []).length === 0 && (
        <div className="card bg-lavender-50 border-lavender-100 text-sm text-lavender-700">
          <p className="font-medium mb-1">💡 Sequential tasks</p>
          <p className="text-xs text-lavender-600 leading-relaxed">
            Add a task and optionally set "Follows after" to chain it to a previous step.
            For example: <em>Blood test → Schedule appointment → Doctor visit.</em>
            Blocked tasks unlock automatically when their prerequisite is marked done.
          </p>
        </div>
      )}

      {/* Active chains */}
      {pendingChains.length > 0 ? (
        <div className="space-y-5">
          {pendingChains.map((chain, ci) => (
            <div key={ci} className="space-y-0">
              {renderChain(chain)}
            </div>
          ))}
        </div>
      ) : (tasks || []).length > 0 ? null : (
        <div className="card text-center py-10 border-dashed border-stone-200">
          <p className="text-2xl mb-2">🗂️</p>
          <p className="text-stone-400 text-sm mb-1">No tasks yet</p>
          <p className="text-stone-300 text-xs">Add blood tests, appointments, follow-ups…</p>
        </div>
      )}

      {/* Completed chains */}
      {doneChains.length > 0 && (
        <div>
          <button
            onClick={() => setShowDone(d => !d)}
            className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1 select-none"
          >
            {showDone ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Completed ({doneChains.reduce((s, c) => s + c.length, 0)})
          </button>
          {showDone && (
            <div className="space-y-5 mt-3 opacity-60">
              {doneChains.map((chain, ci) => (
                <div key={ci}>{renderChain(chain)}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-stone-700">
                {editingTask ? 'Edit task' : 'New task'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditingTask(null) }} className="btn-ghost p-1.5">
                <X size={16} />
              </button>
            </div>
            <TaskForm
              initial={editingTask || EMPTY_TASK}
              allTasks={tasks || []}
              editingId={editingTask?.id}
              onSave={handleSave}
              onCancel={() => { setShowModal(false); setEditingTask(null) }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── HR Sheet (inline) ─────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: '',           label: '—',          color: '' },
  { value: 'todo',       label: 'Planned',    color: 'bg-stone-100 text-stone-600' },
  { value: 'inprogress', label: 'In progress', color: 'bg-warm-100 text-warm-700' },
  { value: 'done',       label: 'Done',       color: 'bg-sage-100 text-sage-700' },
  { value: 'blocked',    label: 'Blocked',    color: 'bg-red-50 text-red-500' },
]

function HRSheet() {
  const [data,       setData]       = useState(null)
  const [fileName,   setFileName]   = useState('')
  const [rowStatus,  setRowStatus]  = useState({})
  const [dragOver,   setDragOver]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const fileRef = useRef()

  const processFile = useCallback(async (file) => {
    if (!file) return
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ]
    if (!allowed.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Please upload a .xlsx, .xls or .csv file')
      return
    }
    setLoading(true); setError('')
    try {
      const XLSX = await import('xlsx')
      const buf  = await file.arrayBuffer()
      const wb   = XLSX.read(buf, { type: 'array' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const raw  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      if (!raw || raw.length === 0) { setError('File is empty or could not be read'); setLoading(false); return }
      setData({ headers: (raw[0] || []).map(String), rows: raw.slice(1) })
      setFileName(file.name)
      setRowStatus({})
    } catch {
      setError('Could not read the file. Try saving it as .xlsx first.')
    }
    setLoading(false)
  }, [])

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]) }
  const statusInfo = (v) => STATUS_OPTIONS.find(s => s.value === v) || STATUS_OPTIONS[0]
  const doneCnt = Object.values(rowStatus).filter(s => s === 'done').length
  const inpCnt  = Object.values(rowStatus).filter(s => s === 'inprogress').length
  const total   = data ? data.rows.length : 0

  if (!data) return (
    <div className="space-y-4">
      <div
        className={`card border-2 border-dashed text-center py-12 cursor-pointer transition-all ${
          dragOver ? 'border-sage-400 bg-sage-50' : 'border-stone-200 hover:border-stone-300'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current.click()}
      >
        <FileSpreadsheet size={40} className="mx-auto mb-3 text-stone-300" />
        <p className="text-stone-600 font-medium mb-1">Upload the Excel file from HR</p>
        <p className="text-stone-400 text-sm">Drop here or click to browse</p>
        <p className="text-stone-300 text-xs mt-1">.xlsx, .xls, .csv</p>
        {loading && <p className="text-sage-500 text-sm mt-3">Processing…</p>}
        {error   && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
        onChange={e => processFile(e.target.files[0])} />
      <div className="card bg-lavender-50 border-lavender-100">
        <p className="text-sm text-lavender-700 font-medium mb-1">💡 How to use</p>
        <ul className="text-xs text-lavender-600 space-y-1 list-disc list-inside">
          <li>Upload the Excel file sent by HR</li>
          <li>Browse your tasks and reintegration milestones</li>
          <li>Mark the status of each row</li>
          <li>The file never leaves your device</li>
        </ul>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center gap-3 mb-3">
          <FileSpreadsheet size={20} className="text-sage-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-stone-700">{fileName}</p>
            <p className="text-xs text-stone-400">{total} rows</p>
          </div>
          <button
            onClick={() => { setData(null); setFileName(''); setRowStatus({}) }}
            className="btn-secondary flex items-center gap-1.5 text-xs"
          >
            <RefreshCw size={12} /> Change file
          </button>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sage-400 inline-block" />
            <span className="text-stone-600">Done: {doneCnt}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warm-400 inline-block" />
            <span className="text-stone-600">In progress: {inpCnt}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-stone-200 inline-block" />
            <span className="text-stone-400">Total: {total}</span>
          </span>
        </div>
        {total > 0 && (
          <div className="mt-3 w-full bg-stone-100 rounded-full h-2 overflow-hidden">
            <div className="h-2 bg-sage-400 rounded-full transition-all duration-500"
              style={{ width: `${(doneCnt / total) * 100}%` }} />
          </div>
        )}
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="excel-table">
          <thead>
            <tr>
              <th className="text-stone-400 font-normal">#</th>
              {data.headers.map((h, i) => <th key={i}>{h || `Column ${i + 1}`}</th>)}
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, ri) => {
              const st = rowStatus[ri] || ''
              const si = statusInfo(st)
              return (
                <tr key={ri} className={st === 'done' ? 'opacity-50' : ''}>
                  <td className="text-stone-400 text-right">{ri + 1}</td>
                  {data.headers.map((_, ci) => (
                    <td key={ci} title={String(row[ci] ?? '')}>{String(row[ci] ?? '')}</td>
                  ))}
                  <td className="min-w-[130px]">
                    <select
                      value={st}
                      onChange={e => setRowStatus(prev => ({ ...prev, [ri]: e.target.value }))}
                      className={`text-xs rounded-lg px-2 py-1 border-0 outline-none cursor-pointer ${si.color || 'text-stone-400'}`}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-stone-300 text-center">
        Statuses are saved while the page is open. Re-upload to refresh.
      </p>
    </div>
  )
}

// ── Plans page ────────────────────────────────────────────────────────────────

export default function Plans() {
  const [tab, setTab] = useState('tasks')

  return (
    <div className="fade-in space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-stone-700">Plan</h1>
        <p className="text-sm text-stone-400 mt-0.5">Treatment tasks and HR reintegration sheet</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
        {[
          { value: 'tasks',   label: 'Treatment tasks' },
          { value: 'hrsheet', label: 'HR sheet' },
        ].map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.value
                ? 'bg-white shadow-sm text-stone-700'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tasks' ? <TreatmentTasks /> : <HRSheet />}
    </div>
  )
}
