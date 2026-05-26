import React, { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCircle2, Circle, Plus, ChevronRight } from 'lucide-react'
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

export default function Today({ navigate }) {
  const today = toDateKey()
  const quote = QUOTES[new Date().getDate() % QUOTES.length]

  const medications = useLiveQuery(() =>
    db.medications.where('active').equals(1).sortBy('sortOrder'), []
  )

  const todayLogs = useLiveQuery(() =>
    db.medLogs.where('date').equals(today).toArray(), [today]
  )

  const todayExercise = useLiveQuery(() =>
    db.exercises.where('date').equals(today).first(), [today]
  )

  const takenIds = new Set((todayLogs || []).map(l => l.medicationId))

  const antideps   = (medications || []).filter(m => m.type === 'antidepressant')
  const supps      = (medications || []).filter(m => m.type === 'supplement')
  const allActive  = medications || []
  const doneCount  = allActive.filter(m => takenIds.has(m.id)).length
  const totalCount = allActive.length
  const pct        = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const handleToggle = async (medId) => {
    await toggleMedLog(medId, today)
  }

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="fade-in space-y-5">
      {/* Header */}
      <div className="card bg-gradient-to-br from-sage-500 to-sage-600 text-white">
        <p className="text-sage-100 text-sm capitalize mb-1">{dateStr}</p>
        <h1 className="text-2xl font-semibold mb-3">{getGreeting()} 👋</h1>
        <p className="text-sage-100 text-sm italic">«{quote}»</p>
      </div>

      {/* Progress */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-stone-700">Today's progress</h2>
          <span className="text-sm text-stone-500">{doneCount} / {totalCount}</span>
        </div>
        <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-2.5 bg-sage-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {pct === 100 && totalCount > 0 && (
          <p className="text-sage-600 text-sm mt-2 font-medium">🎉 Everything taken today!</p>
        )}
      </div>

      {/* Antidepressants */}
      {antideps.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-stone-700">Antidepressants</h2>
            <button
              onClick={() => navigate('meds')}
              className="text-xs text-sage-600 hover:text-sage-700 flex items-center gap-0.5"
            >
              all <ChevronRight size={13} />
            </button>
          </div>
          <ul className="space-y-2">
            {antideps.map(med => {
              const done = takenIds.has(med.id)
              return (
                <li key={med.id} className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggle(med.id)}
                    className={`check-circle ${done ? 'check-circle-done' : 'check-circle-todo'}`}
                    aria-label={done ? 'Mark as not taken' : 'Mark as taken'}
                  >
                    {done && <CheckCircle2 size={14} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${done ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                      {med.name}
                    </span>
                    {med.dosage && (
                      <span className="text-xs text-stone-400 ml-2">{med.dosage}</span>
                    )}
                  </div>
                  {med.scheduleTime && (
                    <span className="text-xs text-stone-400 shrink-0">{med.scheduleTime}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Supplements */}
      {supps.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-stone-700">Supplements</h2>
            <button
              onClick={() => navigate('meds')}
              className="text-xs text-sage-600 hover:text-sage-700 flex items-center gap-0.5"
            >
              edit <ChevronRight size={13} />
            </button>
          </div>
          <ul className="space-y-2">
            {supps.map(med => {
              const done = takenIds.has(med.id)
              return (
                <li key={med.id} className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggle(med.id)}
                    className={`check-circle ${done ? 'check-circle-done' : 'check-circle-todo'}`}
                    aria-label={done ? 'Отметить как не принято' : 'Отметить как принято'}
                  >
                    {done && <CheckCircle2 size={14} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm ${done ? 'line-through text-stone-400' : 'text-stone-600'}`}>
                      {med.name}
                    </span>
                    {med.dosage && (
                      <span className="text-xs text-stone-400 ml-2">{med.dosage}</span>
                    )}
                  </div>
                  {med.scheduleTime && (
                    <span className="text-xs text-stone-400 shrink-0">{med.scheduleTime}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Exercise */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-stone-700">Exercise today</h2>
          <button
            onClick={() => navigate('exercise')}
            className="text-xs text-sage-600 hover:text-sage-700 flex items-center gap-0.5"
          >
            tracker <ChevronRight size={13} />
          </button>
        </div>
        {todayExercise ? (
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-sm font-medium text-stone-700">{todayExercise.type}</p>
              <p className="text-xs text-stone-400">{todayExercise.duration} min · {todayExercise.intensity}</p>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate('exercise')}
            className="flex items-center gap-2 text-sm text-stone-400 hover:text-sage-600 transition-colors"
          >
            <Plus size={16} />
            Log a workout
          </button>
        )}
      </div>

      {/* No medications yet */}
      {(!medications || medications.length === 0) && (
        <div className="card border-dashed border-stone-200 text-center py-8">
          <p className="text-stone-400 text-sm mb-3">Add your medications and supplements in the tracker</p>
          <button onClick={() => navigate('meds')} className="btn-primary">
            Set up medications
          </button>
        </div>
      )}
    </div>
  )
}
