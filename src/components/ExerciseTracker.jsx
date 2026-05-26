import React, { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, X, Trash2, TrendingUp } from 'lucide-react'
import { db, toDateKey } from '../db.js'

const EXERCISE_TYPES = [
  { value: 'Прогулка',    emoji: '🚶' },
  { value: 'Бег',         emoji: '🏃' },
  { value: 'Йога',        emoji: '🧘' },
  { value: 'Растяжка',    emoji: '🤸' },
  { value: 'Силовая',     emoji: '🏋️' },
  { value: 'Велосипед',   emoji: '🚴' },
  { value: 'Плавание',    emoji: '🏊' },
  { value: 'Танцы',       emoji: '💃' },
  { value: 'Другое',      emoji: '⚡' },
]

const INTENSITIES = [
  { value: 'Лёгкая',   color: 'text-sage-500' },
  { value: 'Средняя',  color: 'text-warm-500' },
  { value: 'Высокая',  color: 'text-red-400' },
]

const EMPTY_FORM = {
  type: 'Прогулка',
  duration: 30,
  intensity: 'Лёгкая',
  notes: '',
  date: toDateKey(),
}

function ExerciseForm({ onSave, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="space-y-3">
      <div>
        <label className="label">Тип активности</label>
        <div className="grid grid-cols-3 gap-2">
          {EXERCISE_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => set('type', t.value)}
              className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                form.type === t.value
                  ? 'border-sage-400 bg-sage-50 text-sage-700'
                  : 'border-stone-200 hover:border-stone-300 text-stone-500'
              }`}
            >
              <span className="text-lg">{t.emoji}</span>
              {t.value}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Длительность (мин)</label>
          <input
            type="number" min="1" max="300"
            className="input"
            value={form.duration}
            onChange={e => set('duration', parseInt(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="label">Интенсивность</label>
          <select className="input" value={form.intensity} onChange={e => set('intensity', e.target.value)}>
            {INTENSITIES.map(i => <option key={i.value}>{i.value}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Дата</label>
        <input type="date" className="input" value={form.date}
          onChange={e => set('date', e.target.value)} />
      </div>

      <div>
        <label className="label">Заметки</label>
        <input className="input" value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Как прошло?" />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary flex-1">Сохранить</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Отмена</button>
      </div>
    </form>
  )
}

function HeatMap({ exercises }) {
  const today = toDateKey()
  const days = []
  for (let i = 59; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(toDateKey(d))
  }

  const exerciseDays = new Set((exercises || []).map(e => e.date))

  const weeks = []
  let week = []
  days.forEach((d, i) => {
    week.push(d)
    if (week.length === 7 || i === days.length - 1) {
      weeks.push([...week])
      week = []
    }
  })

  return (
    <div>
      <p className="text-xs text-stone-400 mb-2">60 дней</p>
      <div className="flex gap-1">
        {weeks.map((w, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {w.map(d => (
              <div
                key={d}
                title={d}
                className={`heat-cell ${exerciseDays.has(d) ? 'bg-sage-400' : 'bg-stone-100'} ${d === today ? 'ring-1 ring-sage-400' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ExerciseTracker() {
  const [showModal, setShowModal] = useState(false)
  const today = toDateKey()

  const exercises = useLiveQuery(() =>
    db.exercises.orderBy('date').reverse().toArray(), []
  )

  const stats = useMemo(() => {
    if (!exercises) return { total: 0, thisWeek: 0, totalMin: 0, streak: 0 }
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    const weekKey = toDateKey(weekAgo)
    const thisWeek = exercises.filter(e => e.date >= weekKey).length
    const totalMin = exercises.reduce((s, e) => s + (e.duration || 0), 0)

    const exerciseDays = new Set(exercises.map(e => e.date))
    let streak = 0
    for (let i = 0; i < 60; i++) {
      const d = new Date(); d.setDate(d.getDate() - i)
      if (exerciseDays.has(toDateKey(d))) streak++
      else if (i > 0) break
    }

    return { total: exercises.length, thisWeek, totalMin, streak }
  }, [exercises])

  const handleSave = async (form) => {
    await db.exercises.add({ ...form, createdAt: new Date().toISOString() })
    setShowModal(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить запись?')) return
    await db.exercises.delete(id)
  }

  const typeEmoji = (type) => EXERCISE_TYPES.find(t => t.value === type)?.emoji || '⚡'

  const recent = (exercises || []).slice(0, 15)

  return (
    <div className="fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-700">Спорт</h1>
          <p className="text-sm text-stone-400 mt-0.5">Движение — часть лечения</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5">
          <Plus size={15} /> Записать
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Эта неделя',      value: stats.thisWeek,           suffix: 'тр.' },
          { label: 'Всего тренировок', value: stats.total,              suffix: '' },
          { label: 'Серия дней',       value: stats.streak,             suffix: 'дн.' },
          { label: 'Всего минут',      value: stats.totalMin,           suffix: 'мин' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-2xl font-bold text-sage-600">{s.value}</p>
            <p className="text-xs text-stone-400 mt-0.5">{s.label}</p>
            {s.suffix && <p className="text-xs text-stone-300">{s.suffix}</p>}
          </div>
        ))}
      </div>

      {/* Heat map */}
      {(exercises || []).length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="font-medium text-stone-700 mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-sage-500" /> Активность
          </h2>
          <HeatMap exercises={exercises} />
        </div>
      )}

      {/* Recent */}
      {recent.length > 0 ? (
        <div className="space-y-2">
          <h2 className="font-medium text-stone-700">История</h2>
          {recent.map(ex => (
            <div key={ex.id} className="card flex items-center gap-3">
              <span className="text-2xl">{typeEmoji(ex.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stone-700">{ex.type}</span>
                  <span className="badge bg-stone-100 text-stone-500">{ex.intensity}</span>
                </div>
                <p className="text-xs text-stone-400">
                  {ex.date} · {ex.duration} мин
                  {ex.notes && ` · ${ex.notes}`}
                </p>
              </div>
              <button onClick={() => handleDelete(ex.id)} className="btn-ghost p-1.5 text-red-300 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-10 border-dashed border-stone-200">
          <p className="text-3xl mb-3">🏃</p>
          <p className="text-stone-400 text-sm mb-3">Запишите первую тренировку</p>
          <p className="text-stone-300 text-xs">Даже 15 минут прогулки — это уже спорт</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-stone-700">Записать тренировку</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X size={16} /></button>
            </div>
            <ExerciseForm onSave={handleSave} onCancel={() => setShowModal(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
