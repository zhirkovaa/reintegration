import React, { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCircle2, Plus, ChevronRight, Zap } from 'lucide-react'
import { db, toDateKey, toggleMedLog } from '../db.js'

const QUOTES = [
  'A small step is still a step forward.',
  'Today it is enough to simply be.',
  'Recovery is not a straight line, and that is okay.',
  'Taking your pill is already an act of self-care.',
  'You are handling this better than it feels.',
  'One action at a time.',
  'The body remembers the way back to itself, even when the mind is tired.',
  'Caring for yourself is work no one sees, but it matters deeply.',
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6)  return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function getWeekMonday() {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

// ── Weekly tracker ────────────────────────────────────────────────────────────

function WeekStrip({ weekLogs, medications }) {
  const today  = toDateKey()
  const monday = getWeekMonday()

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return {
      key:    toDateKey(d),
      narrow: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2),
      num:    d.getDate(),
    }
  })

  const totalActive = (medications || []).filter(m => m.active).length

  // Count distinct medicationIds taken per day
  const takenPerDay = useMemo(() => {
    const map = new Map()
    ;(weekLogs || []).forEach(l => {
      if (!map.has(l.date)) map.set(l.date, new Set())
      map.get(l.date).add(l.medicationId)
    })
    return map
  }, [weekLogs])

  return (
    <div className="card">
      <h2 className="text-sm font-semibold text-stone-600 mb-3">This week</h2>
      <div className="flex justify-between items-end gap-1">
        {days.map(({ key, narrow, num }) => {
          const isFuture = key > today
          const isToday  = key === today
          const taken    = takenPerDay.get(key)?.size ?? 0
          const pct      = totalActive > 0 ? taken / totalActive : 0

          let bg, text
          if (isFuture) {
            bg = 'bg-stone-100'; text = 'text-stone-300'
          } else if (pct >= 1) {
            bg = 'bg-sage-500'; text = 'text-white'
          } else if (pct >= 0.5) {
            bg = 'bg-sage-300'; text = 'text-white'
          } else if (pct > 0) {
            bg = 'bg-sage-100'; text = 'text-sage-700'
          } else {
            bg = 'bg-stone-200'; text = 'text-stone-400'
          }

          return (
            <div key={key} className="flex flex-col items-center gap-1 flex-1">
              <span className={`text-[10px] font-medium ${isToday ? 'text-sage-600' : 'text-stone-400'}`}>
                {narrow}
              </span>
              <div
                className={`
                  w-full aspect-square rounded-xl flex items-center justify-center
                  text-[11px] font-bold transition-all ${bg} ${text}
                  ${isToday ? 'ring-2 ring-sage-500 ring-offset-1' : ''}
                `}
              >
                {!isFuture && totalActive > 0
                  ? pct >= 1 ? '✓' : taken > 0 ? taken : '·'
                  : num}
              </div>
              {isToday && (
                <span className="text-[9px] text-sage-600 font-semibold tracking-wide">TODAY</span>
              )}
            </div>
          )
        })}
      </div>

      {totalActive > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-stone-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-sage-500 inline-block" /> All taken
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-sage-100 inline-block" /> Partial
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-stone-200 inline-block" /> None
          </span>
        </div>
      )}
    </div>
  )
}

// ── Med checklist card ────────────────────────────────────────────────────────

function MedCard({ title, icon, meds, takenIds, onToggle, onNavigate, editLabel }) {
  const done  = meds.filter(m => takenIds.has(m.id)).length
  const total = meds.length
  const pct   = total > 0 ? (done / total) * 100 : 0
  const allDone = done === total && total > 0

  return (
    <div className={`card transition-all ${allDone ? 'border-sage-200 bg-sage-50/30' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <h2 className="font-semibold text-stone-700 text-sm">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            allDone
              ? 'bg-sage-100 text-sage-700'
              : done > 0
                ? 'bg-stone-100 text-stone-600'
                : 'bg-stone-100 text-stone-400'
          }`}>
            {done}/{total}
          </span>
          <button
            onClick={onNavigate}
            className="text-xs text-sage-600 hover:text-sage-700 flex items-center gap-0.5"
          >
            {editLabel} <ChevronRight size={12} />
          </button>
        </div>
      </div>

      {/* Mini progress bar */}
      <div className="w-full bg-stone-100 rounded-full h-1.5 mb-3 overflow-hidden">
        <div
          className="h-1.5 bg-sage-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Items */}
      <ul className="space-y-1.5">
        {meds.map(med => {
          const taken = takenIds.has(med.id)
          return (
            <li key={med.id}>
              <button
                onClick={() => onToggle(med.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                  taken
                    ? 'bg-sage-50 border border-sage-100'
                    : 'bg-stone-50 border border-stone-100 hover:border-stone-200'
                }`}
              >
                {/* Circle */}
                <span className={`check-circle flex-shrink-0 ${taken ? 'check-circle-done' : 'check-circle-todo'}`}>
                  {taken && <CheckCircle2 size={13} />}
                </span>

                {/* Name + dosage */}
                <span className={`flex-1 text-sm ${taken ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                  {med.name}
                  {med.dosage && (
                    <span className="text-stone-400 font-normal ml-1.5">{med.dosage}</span>
                  )}
                </span>

                {/* Time badge */}
                {med.scheduleTime && (
                  <span className={`text-xs shrink-0 px-1.5 py-0.5 rounded-md ${
                    taken ? 'text-stone-300' : 'bg-stone-100 text-stone-500'
                  }`}>
                    {med.scheduleTime}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {allDone && (
        <p className="text-sage-600 text-xs mt-3 text-center font-medium">🎉 All done!</p>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Today({ navigate }) {
  const today   = toDateKey()
  const quote   = QUOTES[new Date().getDate() % QUOTES.length]
  const monday  = getWeekMonday()
  const weekEnd = today

  const medications = useLiveQuery(() =>
    db.medications.where('active').equals(1).sortBy('sortOrder'), []
  )

  const todayLogs = useLiveQuery(() =>
    db.medLogs.where('date').equals(today).toArray(), [today]
  )

  const weekLogs = useLiveQuery(() =>
    db.medLogs
      .where('date')
      .between(toDateKey(monday), weekEnd, true, true)
      .toArray(),
    [today]
  )

  const todayExercise = useLiveQuery(() =>
    db.exercises.where('date').equals(today).first(), [today]
  )

  const takenIds = new Set((todayLogs || []).map(l => l.medicationId))

  const antideps = (medications || []).filter(m => m.type === 'antidepressant')
  const supps    = (medications || []).filter(m => m.type === 'supplement')

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="fade-in space-y-4">
      {/* Header */}
      <div className="card bg-gradient-to-br from-sage-500 to-sage-600 text-white">
        <p className="text-sage-100 text-xs capitalize mb-1">{dateStr}</p>
        <h1 className="text-xl font-semibold mb-2">{getGreeting()} 👋</h1>
        <p className="text-sage-100 text-sm italic leading-snug">"{quote}"</p>
      </div>

      {/* Weekly strip */}
      <WeekStrip weekLogs={weekLogs} medications={medications} />

      {/* No meds state */}
      {(!medications || medications.length === 0) && (
        <div className="card border-dashed border-stone-200 text-center py-8">
          <p className="text-stone-400 text-sm mb-3">Add your medications and supplements</p>
          <button onClick={() => navigate('meds')} className="btn-primary">
            Set up medications
          </button>
        </div>
      )}

      {/* Antidepressants */}
      {antideps.length > 0 && (
        <MedCard
          title="Antidepressants"
          icon="💊"
          meds={antideps}
          takenIds={takenIds}
          onToggle={id => toggleMedLog(id, today)}
          onNavigate={() => navigate('meds')}
          editLabel="manage"
        />
      )}

      {/* Supplements */}
      {supps.length > 0 && (
        <MedCard
          title="Supplements"
          icon="🌿"
          meds={supps}
          takenIds={takenIds}
          onToggle={id => toggleMedLog(id, today)}
          onNavigate={() => navigate('meds')}
          editLabel="edit list"
        />
      )}

      {/* Exercise */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-stone-700 text-sm flex items-center gap-2">
            <Zap size={15} className="text-warm-500" /> Exercise today
          </h2>
          <button
            onClick={() => navigate('exercise')}
            className="text-xs text-sage-600 hover:text-sage-700 flex items-center gap-0.5"
          >
            tracker <ChevronRight size={12} />
          </button>
        </div>
        {todayExercise ? (
          <div className="flex items-center gap-3 bg-stone-50 rounded-xl px-3 py-2">
            <span className="text-xl">✅</span>
            <div>
              <p className="text-sm font-medium text-stone-700">{todayExercise.type}</p>
              <p className="text-xs text-stone-400">{todayExercise.duration} min · {todayExercise.intensity}</p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate('exercise')}
            className="w-full flex items-center gap-2 text-sm text-stone-400 hover:text-sage-600 transition-colors bg-stone-50 rounded-xl px-3 py-2"
          >
            <Plus size={15} />
            Log a workout
          </button>
        )}
      </div>
    </div>
  )
}
