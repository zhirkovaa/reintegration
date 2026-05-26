import React, { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  CheckCircle2, Plus, Pencil, Trash2, X, ChevronDown, ChevronUp, Flame,
} from 'lucide-react'
import { db, toDateKey, toggleMedLog, getMedLogsRange } from '../db.js'

const TYPES = [
  { value: 'antidepressant', label: 'Антидепрессант' },
  { value: 'supplement',     label: 'Суплемент / витамин' },
]
const TIMES = ['утром', 'днём', 'вечером', 'на ночь', 'с едой', 'натощак', 'по необходимости']

const EMPTY_FORM = { name: '', type: 'supplement', dosage: '', scheduleTime: 'утром', notes: '', active: true }

function MedForm({ initial = EMPTY_FORM, onSave, onCancel }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="label">Название *</label>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="Например: Сертралин" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Тип</label>
          <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Дозировка</label>
          <input className="input" value={form.dosage} onChange={e => set('dosage', e.target.value)}
            placeholder="50 мг" />
        </div>
      </div>
      <div>
        <label className="label">Время приёма</label>
        <select className="input" value={form.scheduleTime} onChange={e => set('scheduleTime', e.target.value)}>
          {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Заметки</label>
        <input className="input" value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Необязательно" />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="active-check" checked={form.active}
          onChange={e => set('active', e.target.checked)} className="rounded" />
        <label htmlFor="active-check" className="text-sm text-stone-600">Активен (отображать в трекере)</label>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary flex-1">Сохранить</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Отмена</button>
      </div>
    </form>
  )
}

function CalendarStreak({ medId, logs30 }) {
  const today = toDateKey()
  const days = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(toDateKey(d))
  }

  const takenDays = new Set(logs30.filter(l => l.medicationId === medId).map(l => l.date))

  let streak = 0
  for (let i = 0; i < days.length; i++) {
    const d = days[days.length - 1 - i]
    if (takenDays.has(d) || (i === 0 && !takenDays.has(today))) {
      if (takenDays.has(d)) streak++
      else break
    } else {
      break
    }
  }

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-1">
        {days.map(d => (
          <div
            key={d}
            title={d}
            className={`heat-cell ${
              takenDays.has(d)
                ? 'bg-sage-400'
                : d === today
                  ? 'bg-stone-200 ring-1 ring-sage-300'
                  : 'bg-stone-100'
            }`}
          />
        ))}
      </div>
      {streak > 0 && (
        <p className="text-xs text-warm-600 mt-1 flex items-center gap-1">
          <Flame size={11} /> {streak} дней подряд
        </p>
      )}
    </div>
  )
}

function MedItem({ med, taken, onToggle, onEdit, onDelete, logs30, expanded, onExpand }) {
  return (
    <li className={`rounded-xl border transition-all ${taken ? 'border-sage-200 bg-sage-50/40' : 'border-stone-100 bg-white'}`}>
      <div className="flex items-center gap-3 px-3 py-3">
        <button
          onClick={() => onToggle(med.id)}
          className={`check-circle ${taken ? 'check-circle-done' : 'check-circle-todo'}`}
          aria-label={taken ? 'Снять отметку' : 'Отметить как принято'}
        >
          {taken && <CheckCircle2 size={14} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${taken ? 'text-stone-400' : 'text-stone-700'}`}>
              {med.name}
            </span>
            {med.dosage && (
              <span className="text-xs text-stone-400">{med.dosage}</span>
            )}
            {med.scheduleTime && (
              <span className="badge bg-stone-100 text-stone-500">{med.scheduleTime}</span>
            )}
          </div>
          {med.notes && <p className="text-xs text-stone-400 mt-0.5">{med.notes}</p>}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onExpand} className="btn-ghost p-1.5" title="История">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={() => onEdit(med)} className="btn-ghost p-1.5" title="Изменить">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(med.id)} className="btn-ghost p-1.5 text-red-300 hover:text-red-500" title="Удалить">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-stone-100 mt-1 pt-2">
          <p className="text-xs text-stone-400 mb-1">Последние 30 дней</p>
          <CalendarStreak medId={med.id} logs30={logs30} />
        </div>
      )}
    </li>
  )
}

export default function MedTracker() {
  const [tab, setTab] = useState('antidepressant')
  const [showModal, setShowModal] = useState(false)
  const [editingMed, setEditingMed] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const today = toDateKey()

  const thirtyDaysAgo = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return toDateKey(d)
  }, [])

  const medications = useLiveQuery(() => db.medications.orderBy('sortOrder').toArray(), [])
  const todayLogs   = useLiveQuery(() => db.medLogs.where('date').equals(today).toArray(), [today])
  const logs30      = useLiveQuery(() =>
    db.medLogs.where('date').between(thirtyDaysAgo, today, true, true).toArray(), [today]
  )

  const takenIds = new Set((todayLogs || []).map(l => l.medicationId))

  const filtered = (medications || []).filter(m => m.type === tab)
  const active   = filtered.filter(m => m.active)
  const inactive = filtered.filter(m => !m.active)

  const handleSave = async (form) => {
    if (editingMed) {
      await db.medications.update(editingMed.id, form)
    } else {
      const maxOrder = Math.max(0, ...(medications || []).map(m => m.sortOrder || 0))
      await db.medications.add({ ...form, sortOrder: maxOrder + 10 })
    }
    setShowModal(false)
    setEditingMed(null)
  }

  const handleEdit = (med) => {
    setEditingMed(med)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить этот препарат? История приёма останется.')) return
    await db.medications.delete(id)
  }

  const handleToggle = (medId) => toggleMedLog(medId, today)

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id)

  const doneToday = (medications || []).filter(m => m.active && takenIds.has(m.id)).length
  const totalActive = (medications || []).filter(m => m.active).length

  return (
    <div className="fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-700">Препараты</h1>
          <p className="text-sm text-stone-400 mt-0.5">Принято сегодня: {doneToday} из {totalActive}</p>
        </div>
        <button
          onClick={() => { setEditingMed(null); setShowModal(true) }}
          className="btn-primary flex items-center gap-1.5"
        >
          <Plus size={15} /> Добавить
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
        {[
          { value: 'antidepressant', label: 'Антидепрессанты' },
          { value: 'supplement',     label: 'Суплементы' },
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

      {/* Active list */}
      {active.length > 0 ? (
        <ul className="space-y-2">
          {active.map(med => (
            <MedItem
              key={med.id}
              med={med}
              taken={takenIds.has(med.id)}
              onToggle={handleToggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
              logs30={logs30 || []}
              expanded={expandedId === med.id}
              onExpand={() => toggleExpand(med.id)}
            />
          ))}
        </ul>
      ) : (
        <div className="card text-center py-8 border-dashed border-stone-200">
          <p className="text-stone-400 text-sm mb-3">
            {tab === 'antidepressant' ? 'Добавьте ваш антидепрессант' : 'Добавьте суплементы'}
          </p>
          <button
            onClick={() => { setEditingMed(null); setShowModal(true) }}
            className="btn-primary"
          >
            <Plus size={14} className="inline mr-1" /> Добавить
          </button>
        </div>
      )}

      {/* Inactive */}
      {inactive.length > 0 && (
        <details className="group">
          <summary className="text-xs text-stone-400 cursor-pointer hover:text-stone-600 select-none">
            Неактивные ({inactive.length}) ▾
          </summary>
          <ul className="space-y-2 mt-2 opacity-60">
            {inactive.map(med => (
              <MedItem
                key={med.id}
                med={med}
                taken={false}
                onToggle={() => {}}
                onEdit={handleEdit}
                onDelete={handleDelete}
                logs30={logs30 || []}
                expanded={false}
                onExpand={() => {}}
              />
            ))}
          </ul>
        </details>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-stone-700">
                {editingMed ? 'Изменить препарат' : 'Новый препарат'}
              </h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5">
                <X size={16} />
              </button>
            </div>
            <MedForm
              initial={editingMed || { ...EMPTY_FORM, type: tab }}
              onSave={handleSave}
              onCancel={() => setShowModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
