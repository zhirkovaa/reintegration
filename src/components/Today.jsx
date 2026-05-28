import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  CheckCircle2, Flame, Plus, Loader, Sparkles,
  Upload, Clock, Trash2, ChevronRight, Mic,
} from 'lucide-react'
import { db, toDateKey, toggleMedLog } from '../db.js'

const QUOTES = [
  'A small step is still a step forward.',
  'Today it is enough to simply be.',
  'Recovery is not a straight line, and that is okay.',
  'Taking your pill is already an act of self-care.',
  'You are handling this better than it feels.',
  'One action at a time.',
  'The body remembers the way back to itself, even when the mind is tired.',
  'Caring for yourself is work no one else sees, but it matters deeply.',
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6)  return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function calcStreak(loggedDates) {
  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    if (loggedDates.has(toDateKey(d))) streak++
    else if (i > 0) break
  }
  return streak
}

// ── Streaks ───────────────────────────────────────────────────────────────────

function StreaksRow({ medications, medLogs90, exercises90 }) {
  const antideps = useMemo(() => (medications || []).filter(m => m.type === 'antidepressant'), [medications])
  const supps    = useMemo(() => (medications || []).filter(m => m.type === 'supplement'),     [medications])

  const antidepStreak = useMemo(() => {
    if (!antideps.length) return 0
    const ids = new Set(antideps.map(m => m.id))
    const dateMap = new Map()
    ;(medLogs90 || []).forEach(l => {
      if (!ids.has(l.medicationId)) return
      if (!dateMap.has(l.date)) dateMap.set(l.date, new Set())
      dateMap.get(l.date).add(l.medicationId)
    })
    const fullDays = new Set(
      [...dateMap].filter(([, s]) => s.size >= ids.size).map(([d]) => d)
    )
    return calcStreak(fullDays)
  }, [antideps, medLogs90])

  const suppStreak = useMemo(() => {
    if (!supps.length) return 0
    const ids = new Set(supps.map(m => m.id))
    const dateMap = new Map()
    ;(medLogs90 || []).forEach(l => {
      if (!ids.has(l.medicationId)) return
      if (!dateMap.has(l.date)) dateMap.set(l.date, new Set())
      dateMap.get(l.date).add(l.medicationId)
    })
    const fullDays = new Set(
      [...dateMap].filter(([, s]) => s.size >= ids.size).map(([d]) => d)
    )
    return calcStreak(fullDays)
  }, [supps, medLogs90])

  const exerciseStreak = useMemo(() => {
    const days = new Set((exercises90 || []).map(e => e.date))
    return calcStreak(days)
  }, [exercises90])

  const items = [
    { label: 'Antidepressants', emoji: '💊', streak: antidepStreak },
    { label: 'Supplements',     emoji: '🌿', streak: suppStreak    },
    { label: 'Exercise',        emoji: '🏃', streak: exerciseStreak },
  ]

  return (
    <div className="card">
      <h2 className="text-sm font-semibold text-stone-600 mb-3 flex items-center gap-1.5">
        <Flame size={14} className="text-warm-500" /> Streaks
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {items.map(s => (
          <div key={s.label} className="text-center">
            <div className={`text-3xl font-bold leading-none ${s.streak > 0 ? 'text-warm-500' : 'text-stone-200'}`}>
              {s.streak}
            </div>
            <div className="text-[10px] text-stone-400 mt-1">{s.emoji} {s.label}</div>
            {s.streak > 0 && <div className="text-[9px] text-warm-400 mt-0.5">🔥 days in a row</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Agenda ────────────────────────────────────────────────────────────────────

function AgendaCard({ date }) {
  const [showAdd, setShowAdd] = useState(false)
  const [time,  setTime]  = useState('')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')

  const items = useLiveQuery(async () => {
    const rows = await db.agendaItems.where('date').equals(date).toArray()
    return rows.sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  }, [date])

  const addItem = async () => {
    if (!title.trim()) return
    await db.agendaItems.add({
      date,
      time:  time.trim(),
      title: title.trim(),
      notes: notes.trim(),
      done:  false,
      createdAt: new Date().toISOString(),
    })
    setTime(''); setTitle(''); setNotes(''); setShowAdd(false)
  }

  const toggle = (item) => db.agendaItems.update(item.id, { done: !item.done })
  const del    = (id)   => db.agendaItems.delete(id)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-stone-700 text-sm flex items-center gap-1.5">
          <Clock size={14} className="text-lavender-500" /> Today's agenda
        </h2>
        <button onClick={() => setShowAdd(v => !v)} className="btn-ghost p-1.5">
          <Plus size={15} />
        </button>
      </div>

      {showAdd && (
        <div className="bg-stone-50 rounded-xl p-3 mb-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="time"
              className="input w-28 text-sm font-mono"
              value={time}
              onChange={e => setTime(e.target.value)}
            />
            <input
              className="input flex-1 text-sm"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Event or reminder"
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && addItem()}
            />
          </div>
          <input
            className="input text-sm"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes (e.g. bring paperwork from Zorgdomein)"
          />
          <div className="flex gap-2">
            <button onClick={addItem} disabled={!title.trim()} className="btn-primary text-xs px-3 py-1.5">
              Add
            </button>
            <button onClick={() => setShowAdd(false)} className="btn-ghost text-xs px-3 py-1.5">
              Cancel
            </button>
          </div>
        </div>
      )}

      {(items || []).length === 0 && !showAdd ? (
        <p className="text-xs text-stone-400 text-center py-2">No events today — tap + to add one</p>
      ) : (
        <ul className="space-y-1.5">
          {(items || []).map(item => (
            <li
              key={item.id}
              className={`flex items-start gap-2 px-2 py-1.5 rounded-xl transition-all ${
                item.done ? 'opacity-50' : 'hover:bg-stone-50'
              }`}
            >
              <button
                onClick={() => toggle(item)}
                className={`check-circle mt-0.5 flex-shrink-0 ${item.done ? 'check-circle-done' : 'check-circle-todo'}`}
              >
                {item.done && <CheckCircle2 size={13} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {item.time && (
                    <span className="text-xs font-mono text-lavender-600 bg-lavender-50 px-1.5 py-0.5 rounded-md">
                      {item.time}
                    </span>
                  )}
                  <span className={`text-sm ${item.done ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                    {item.title}
                  </span>
                </div>
                {item.notes && <p className="text-xs text-stone-400 mt-0.5">{item.notes}</p>}
              </div>
              <button
                onClick={() => del(item.id)}
                className="btn-ghost p-1 text-red-300 hover:text-red-500 flex-shrink-0"
              >
                <Trash2 size={11} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Mood check-in ─────────────────────────────────────────────────────────────

async function analyzeMood({ mood, energy, notes }, apiKey) {
  const prompt = `You are a compassionate wellness coach supporting someone recovering from burnout and depression.

They filled in today's check-in:
- Mood: ${mood}/10
- Energy: ${energy}/10
- Notes: "${notes || '(no notes written)'}"

Write a warm, brief insight (2–3 sentences max). Acknowledge how they feel today, notice something constructive or positive if you can, and offer one small gentle encouragement. Be human and specific to what they shared, not generic. No clinical language.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `API error ${res.status}`)
  }
  const data = await res.json()
  return data.content[0].text
}

const MOOD_EMOJI   = ['😞','😔','😕','😐','🙂','😊','😄','🤩','💫','🌟']
const ENERGY_EMOJI = ['🪫','😴','😪','😑','😌','⚡','🔋','💪','🚀','🌈']

function MoodCard({ date, apiKey }) {
  const moodLog = useLiveQuery(() => db.moodLogs.where('date').equals(date).first(), [date])

  const [mood,      setMood]      = useState(5)
  const [energy,    setEnergy]    = useState(5)
  const [notes,     setNotes]     = useState('')
  const [analysis,  setAnalysis]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [fileNames, setFileNames] = useState([])
  const fileRef = useRef(null)

  useEffect(() => {
    if (moodLog) {
      setMood(moodLog.mood ?? 5)
      setEnergy(moodLog.energy ?? 5)
      setNotes(moodLog.notes || '')
      setAnalysis(moodLog.analysis || '')
    } else if (moodLog === null) {
      setMood(5); setEnergy(5); setNotes(''); setAnalysis('')
    }
    setError('')
  }, [moodLog, date])

  const upsert = async (patch) => {
    const existing = await db.moodLogs.where('date').equals(date).first()
    if (existing) {
      await db.moodLogs.update(existing.id, patch)
    } else {
      await db.moodLogs.add({
        date, mood: 5, energy: 5, notes: '', analysis: '',
        ...patch,
        createdAt: new Date().toISOString(),
      })
    }
  }

  const save = () => upsert({ mood, energy, notes })

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const names = []
    let appended = notes

    for (const file of files) {
      names.push(file.name)
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const text = await file.text()
        appended = appended
          ? `${appended}\n\n— ${file.name} —\n${text}`
          : `— ${file.name} —\n${text}`
      }
    }
    setFileNames(prev => [...prev, ...names])
    if (appended !== notes) setNotes(appended)
    e.target.value = ''
  }

  const handleAnalyze = async () => {
    if (!apiKey) {
      setError('Add your Claude API key in Journal → Settings ⚙️')
      return
    }
    setLoading(true); setError('')
    await upsert({ mood, energy, notes })
    try {
      const result = await analyzeMood({ mood, energy, notes }, apiKey)
      setAnalysis(result)
      await upsert({ analysis: result, analyzedAt: new Date().toISOString() })
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="card space-y-4">
      <h2 className="font-semibold text-stone-700 text-sm flex items-center gap-1.5">
        <Sparkles size={14} className="text-lavender-500" /> How are you today?
      </h2>

      {/* Sliders */}
      <div className="space-y-4">
        {[
          { label: 'Mood',   value: mood,   setValue: setMood,   emojis: MOOD_EMOJI },
          { label: 'Energy', value: energy, setValue: setEnergy, emojis: ENERGY_EMOJI },
        ].map(({ label, value, setValue, emojis }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-stone-500 font-medium">{label}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-lg leading-none">{emojis[value - 1]}</span>
                <span className="text-xs text-stone-400 w-8 text-right">{value}/10</span>
              </div>
            </div>
            <input
              type="range" min="1" max="10" step="1"
              value={value}
              onChange={e => setValue(Number(e.target.value))}
              onMouseUp={save}
              onTouchEnd={save}
              className="w-full h-2 rounded-full appearance-none bg-stone-100 cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-sage-500 [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-stone-300 mt-0.5 px-0.5">
              <span>1 — low</span><span>10 — great</span>
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div>
        <label className="label">Notes</label>
        <textarea
          className="input text-sm resize-none leading-relaxed"
          rows={4}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={save}
          placeholder="Write freely — how you woke up, how you feel now, anything on your mind…"
        />
      </div>

      {/* File upload */}
      <div>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".txt,.mp3,.m4a,.wav,.ogg,.mp4"
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="btn-ghost text-xs flex items-center gap-1.5 text-stone-500"
        >
          <Upload size={13} /> Upload from Plaud (audio / text file)
        </button>
        {fileNames.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {fileNames.map((n, i) => (
              <span key={i} className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Mic size={9} /> {n}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Analyze */}
      <button
        onClick={handleAnalyze}
        disabled={loading}
        className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
      >
        {loading
          ? <><Loader size={14} className="animate-spin" /> Analyzing…</>
          : <><Sparkles size={14} /> AI insight for today</>
        }
      </button>

      {error && (
        <p className="text-xs text-red-500 flex items-start gap-1">⚠️ {error}</p>
      )}

      {analysis && (
        <div className="bg-lavender-50 border border-lavender-100 rounded-xl p-3">
          <p className="text-sm text-lavender-800 leading-relaxed">{analysis}</p>
        </div>
      )}
    </div>
  )
}

// ── Med checklist card ────────────────────────────────────────────────────────

function MedCard({ title, icon, meds, takenIds, onToggle, onNavigate, editLabel }) {
  const done    = meds.filter(m => takenIds.has(m.id)).length
  const total   = meds.length
  const pct     = total > 0 ? (done / total) * 100 : 0
  const allDone = done === total && total > 0

  return (
    <div className={`card transition-all ${allDone ? 'border-sage-200 bg-sage-50/30' : ''}`}>
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

      <div className="w-full bg-stone-100 rounded-full h-1.5 mb-3 overflow-hidden">
        <div
          className="h-1.5 bg-sage-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

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
                <span className={`check-circle flex-shrink-0 ${taken ? 'check-circle-done' : 'check-circle-todo'}`}>
                  {taken && <CheckCircle2 size={13} />}
                </span>
                <span className={`flex-1 text-sm ${taken ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                  {med.name}
                  {med.dosage && <span className="text-stone-400 font-normal ml-1.5">{med.dosage}</span>}
                </span>
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

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Today({ navigate }) {
  const today = toDateKey()
  const quote = QUOTES[new Date().getDate() % QUOTES.length]

  const ninetyDaysAgo = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 90); return toDateKey(d)
  }, [])

  const medications   = useLiveQuery(() => db.medications.where('active').equals(1).sortBy('sortOrder'), [])
  const todayLogs     = useLiveQuery(() => db.medLogs.where('date').equals(today).toArray(), [today])
  const medLogs90     = useLiveQuery(() =>
    db.medLogs.where('date').between(ninetyDaysAgo, today, true, true).toArray(), []
  )
  const exercises90   = useLiveQuery(() =>
    db.exercises.where('date').between(ninetyDaysAgo, today, true, true).toArray(), []
  )
  const apiKeySetting = useLiveQuery(() => db.settings.where('key').equals('claude_api_key').first(), [])

  const apiKey   = apiKeySetting?.value || ''
  const takenIds = new Set((todayLogs || []).map(l => l.medicationId))
  const antideps = (medications || []).filter(m => m.type === 'antidepressant')
  const supps    = (medications || []).filter(m => m.type === 'supplement')

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="fade-in space-y-4">
      {/* Header */}
      <div className="card bg-gradient-to-br from-sage-500 to-sage-600 text-white">
        <p className="text-sage-100 text-xs capitalize mb-1">{dateStr}</p>
        <h1 className="text-xl font-semibold mb-2">{getGreeting()} 👋</h1>
        <p className="text-sage-100 text-sm italic leading-snug">"{quote}"</p>
      </div>

      <StreaksRow medications={medications} medLogs90={medLogs90} exercises90={exercises90} />
      <AgendaCard date={today} />
      <MoodCard date={today} apiKey={apiKey} />

      {(!medications || medications.length === 0) && (
        <div className="card border-dashed border-stone-200 text-center py-8">
          <p className="text-stone-400 text-sm mb-3">Add your medications and supplements</p>
          <button onClick={() => navigate('meds')} className="btn-primary">Set up medications</button>
        </div>
      )}

      {antideps.length > 0 && (
        <MedCard
          title="Antidepressants" icon="💊"
          meds={antideps} takenIds={takenIds}
          onToggle={id => toggleMedLog(id, today)}
          onNavigate={() => navigate('meds')}
          editLabel="manage"
        />
      )}

      {supps.length > 0 && (
        <MedCard
          title="Supplements" icon="🌿"
          meds={supps} takenIds={takenIds}
          onToggle={id => toggleMedLog(id, today)}
          onNavigate={() => navigate('meds')}
          editLabel="edit list"
        />
      )}
    </div>
  )
}
