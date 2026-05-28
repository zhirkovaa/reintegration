import React, { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ExternalLink, Save, Sparkles, Copy, Check, Settings, X, Loader } from 'lucide-react'
import { db, toDateKey } from '../db.js'

// ── AI call ───────────────────────────────────────────────────────────────────

async function analyzeWithClaude(text, apiKey) {
  const prompt = `You are helping a person track their recovery from burnout and depression.
Analyze this diary entry and extract structured data ready to paste into a spreadsheet.

Diary entry:
"""
${text}
"""

Extract and format the following (skip fields not mentioned, use "—" if clearly absent):

📅 Date: (infer from context or use today)
💼 Work hours actual:
💼 Work hours planned:
✅ Tasks completed: (brief list)
😴 Sleep quality: (1-10 or description)
⚡ Energy level: (1-10 or description)
😊 Mood: (1-10 or description)
💊 Medications taken: (yes/no/partial)
🏃 Exercise: (type + duration, or none)
🏥 Medical/appointments:
🌿 Key events or feelings: (1-2 sentences max)
📝 Notes for doctor:

Format each line clearly, one per line, exactly as shown above. Be concise.`

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
      max_tokens: 1024,
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

// ── Settings modal ────────────────────────────────────────────────────────────

function SettingsModal({ onClose }) {
  const stored = useLiveQuery(() =>
    db.settings.where('key').anyOf(['onedrive_url', 'claude_api_key']).toArray(), []
  )

  const getValue = (key) => stored?.find(s => s.key === key)?.value || ''

  const [url, setUrl]       = useState('')
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved]   = useState(false)

  useEffect(() => {
    if (stored) {
      setUrl(getValue('onedrive_url'))
      setApiKey(getValue('claude_api_key'))
    }
  }, [stored])

  const handleSave = async () => {
    await db.settings.put({ key: 'onedrive_url',   value: url })
    await db.settings.put({ key: 'claude_api_key', value: apiKey })
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-stone-700">Settings</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">OneDrive / Excel URL</label>
            <input
              className="input"
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://onedrive.live.com/…"
            />
            <p className="text-xs text-stone-400 mt-1">Paste the sharing link to your Excel file</p>
          </div>

          <div>
            <label className="label">Anthropic API key</label>
            <input
              className="input font-mono text-xs"
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-…"
            />
            <p className="text-xs text-stone-400 mt-1">
              Get a free key at{' '}
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sage-600 underline"
              >
                console.anthropic.com
              </a>
              . Stored only in your browser.
            </p>
          </div>

          <button onClick={handleSave} className={`btn-primary w-full ${saved ? 'bg-sage-600' : ''}`}>
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Journal() {
  const [date,        setDate]        = useState(toDateKey())
  const [text,        setText]        = useState('')
  const [analysis,    setAnalysis]    = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [copied,      setCopied]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const settings = useLiveQuery(() =>
    db.settings.where('key').anyOf(['onedrive_url', 'claude_api_key']).toArray(), []
  )
  const getSetting = (key) => settings?.find(s => s.key === key)?.value || ''

  const entry = useLiveQuery(() =>
    db.journalEntries.where('date').equals(date).first(), [date]
  )

  // Load saved entry when date changes
  useEffect(() => {
    if (entry) {
      setText(entry.content || '')
      setAnalysis(entry.analysis || '')
    } else {
      setText('')
      setAnalysis('')
    }
    setError('')
  }, [entry, date])

  const handleSave = async () => {
    if (!text.trim()) return
    if (entry) {
      await db.journalEntries.update(entry.id, { content: text, updatedAt: new Date().toISOString() })
    } else {
      await db.journalEntries.add({ date, content: text, analysis: '', createdAt: new Date().toISOString() })
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const handleAnalyze = async () => {
    if (!text.trim()) return
    const apiKey = getSetting('claude_api_key')
    if (!apiKey) {
      setError('Add your Claude API key in Settings first.')
      return
    }
    setLoading(true)
    setError('')
    try {
      // Save first
      if (entry) {
        await db.journalEntries.update(entry.id, { content: text })
      } else {
        await db.journalEntries.add({ date, content: text, analysis: '', createdAt: new Date().toISOString() })
      }
      const result = await analyzeWithClaude(text, apiKey)
      setAnalysis(result)
      // Save analysis
      const e = await db.journalEntries.where('date').equals(date).first()
      if (e) await db.journalEntries.update(e.id, { analysis: result, analyzedAt: new Date().toISOString() })
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(analysis)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const onedriveUrl = getSetting('onedrive_url')
  const apiKey      = getSetting('claude_api_key')

  const recentEntries = useLiveQuery(() =>
    db.journalEntries.orderBy('date').reverse().limit(7).toArray(), []
  )

  return (
    <div className="fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-700">Journal</h1>
          <p className="text-sm text-stone-400 mt-0.5">Daily diary + AI analysis</p>
        </div>
        <div className="flex items-center gap-2">
          {onedriveUrl && (
            <a
              href={onedriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex items-center gap-1.5 text-xs"
            >
              <ExternalLink size={13} /> Open table
            </a>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="btn-ghost p-2"
            title="Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Setup prompt */}
      {(!onedriveUrl || !apiKey) && (
        <div
          className="card bg-lavender-50 border-lavender-200 cursor-pointer hover:border-lavender-300 transition-colors"
          onClick={() => setShowSettings(true)}
        >
          <p className="text-sm text-lavender-700">
            <span className="font-medium">⚙️ Quick setup:</span>{' '}
            {!onedriveUrl && 'add your OneDrive link'}
            {!onedriveUrl && !apiKey && ' and '}
            {!apiKey && 'add your Claude API key'}
            {' '}to enable AI analysis.{' '}
            <span className="underline">Open settings →</span>
          </p>
        </div>
      )}

      {/* Date selector */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          className="input w-auto text-sm"
          value={date}
          onChange={e => setDate(e.target.value)}
          max={toDateKey()}
        />
        <button
          onClick={() => setDate(toDateKey())}
          className={`text-xs px-2 py-1 rounded-lg transition-colors ${
            date === toDateKey() ? 'bg-sage-100 text-sage-700' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
          }`}
        >
          Today
        </button>
        {/* Recent dates */}
        <div className="flex gap-1 overflow-x-auto">
          {(recentEntries || [])
            .filter(e => e.date !== date && e.date !== toDateKey())
            .slice(0, 3)
            .map(e => (
              <button
                key={e.date}
                onClick={() => setDate(e.date)}
                className="text-xs px-2 py-1 rounded-lg bg-stone-50 text-stone-400 hover:bg-stone-100 whitespace-nowrap shrink-0"
              >
                {e.date.slice(5)}
              </button>
            ))}
        </div>
      </div>

      {/* Editor */}
      <div className="card p-0 overflow-hidden">
        <textarea
          className="w-full p-4 text-sm text-stone-700 resize-none focus:outline-none bg-white leading-relaxed"
          rows={10}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`Write freely about your day…\n\nFor example:\n• How you felt when you woke up\n• What you worked on and how long\n• Did you take your medications?\n• Did you exercise?\n• Any highlights or difficulties\n• How you feel now`}
        />
        <div className="flex items-center justify-between px-4 py-2 bg-stone-50 border-t border-stone-100">
          <span className="text-xs text-stone-400">{text.length} chars</span>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!text.trim()}
              className={`btn-secondary flex items-center gap-1.5 text-xs ${saved ? 'text-sage-600' : ''}`}
            >
              <Save size={13} />
              {saved ? 'Saved ✓' : 'Save'}
            </button>
            <button
              onClick={handleAnalyze}
              disabled={!text.trim() || loading}
              className="btn-primary flex items-center gap-1.5 text-xs"
            >
              {loading
                ? <><Loader size={13} className="animate-spin" /> Analyzing…</>
                : <><Sparkles size={13} /> Analyze with AI</>
              }
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="card bg-red-50 border-red-200 text-red-600 text-sm flex items-start gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Analysis result */}
      {analysis && (
        <div className="card border-lavender-200 bg-lavender-50/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-stone-700 flex items-center gap-2">
              <Sparkles size={15} className="text-lavender-500" />
              Ready to copy to table
            </h2>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                copied
                  ? 'bg-sage-100 text-sage-700'
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300'
              }`}
            >
              {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy all</>}
            </button>
          </div>
          <pre className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed font-sans">
            {analysis}
          </pre>
          {onedriveUrl && (
            <a
              href={onedriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-1.5 text-xs text-sage-600 hover:text-sage-700"
            >
              <ExternalLink size={12} /> Open table to paste →
            </a>
          )}
        </div>
      )}

      {/* Previous entries list */}
      {(recentEntries || []).length > 0 && (
        <div>
          <h2 className="text-xs font-medium text-stone-400 mb-2">Previous entries</h2>
          <div className="flex flex-col gap-1">
            {(recentEntries || []).map(e => (
              <button
                key={e.id}
                onClick={() => setDate(e.date)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm transition-colors ${
                  e.date === date
                    ? 'bg-sage-50 border border-sage-200 text-sage-700'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <span className="text-xs text-stone-400 w-20 shrink-0">{e.date}</span>
                <span className="flex-1 truncate text-xs text-stone-500">{e.content?.slice(0, 80)}…</span>
                {e.analysis && <Sparkles size={11} className="text-lavender-400 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
