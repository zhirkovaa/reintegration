import React, { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Save, Check, Key, Link2, ExternalLink, Shield } from 'lucide-react'
import { db } from '../db.js'

const KEYS = ['claude_api_key', 'onedrive_url', 'onenote_url', 'powerpoint_url']

export default function Settings() {
  const stored = useLiveQuery(() => db.settings.where('key').anyOf(KEYS).toArray(), [])

  const [claudeKey,  setClaudeKey]  = useState('')
  const [onedrive,   setOnedrive]   = useState('')
  const [onenote,    setOnenote]    = useState('')
  const [powerpoint, setPowerpoint] = useState('')
  const [saved,      setSaved]      = useState(false)

  useEffect(() => {
    if (!stored) return
    const get = (k) => stored.find(s => s.key === k)?.value || ''
    setClaudeKey(get('claude_api_key'))
    setOnedrive(get('onedrive_url'))
    setOnenote(get('onenote_url'))
    setPowerpoint(get('powerpoint_url'))
  }, [stored])

  const handleSave = async () => {
    await Promise.all([
      db.settings.put({ key: 'claude_api_key',  value: claudeKey.trim() }),
      db.settings.put({ key: 'onedrive_url',    value: onedrive.trim() }),
      db.settings.put({ key: 'onenote_url',     value: onenote.trim() }),
      db.settings.put({ key: 'powerpoint_url',  value: powerpoint.trim() }),
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const links = [
    {
      label:       'Excel / OneDrive spreadsheet',
      value:       onedrive,
      set:         setOnedrive,
      placeholder: 'https://onedrive.live.com/…',
    },
    {
      label:       'OneNote notebook',
      value:       onenote,
      set:         setOnenote,
      placeholder: 'https://onedrive.live.com/redir?…',
    },
    {
      label:       'PowerPoint presentation',
      value:       powerpoint,
      set:         setPowerpoint,
      placeholder: 'https://onedrive.live.com/…',
    },
  ]

  return (
    <div className="fade-in space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-stone-700">Settings</h1>
        <p className="text-sm text-stone-400 mt-0.5">API key and external links</p>
      </div>

      {/* Security note */}
      <div className="card bg-sage-50 border-sage-200">
        <div className="flex items-start gap-2">
          <Shield size={14} className="text-sage-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-sage-700 leading-relaxed">
            Your API key is stored only in this browser (IndexedDB). It is never sent to any server other than Anthropic, and is never saved in the repository or any source file.
          </p>
        </div>
      </div>

      {/* AI */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-stone-700 text-sm flex items-center gap-2">
          <Key size={14} className="text-lavender-500" /> AI — Claude
        </h2>
        <div>
          <label className="label">Anthropic API key</label>
          <input
            className="input font-mono text-xs"
            type="password"
            value={claudeKey}
            onChange={e => setClaudeKey(e.target.value)}
            placeholder="sk-ant-api03-…"
            autoComplete="off"
          />
          <p className="text-xs text-stone-400 mt-1.5">
            Get a free key at{' '}
            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sage-600 underline"
            >
              console.anthropic.com
            </a>
            . Used for AI mood insights and journal analysis.
          </p>
        </div>
      </div>

      {/* Microsoft links */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-stone-700 text-sm flex items-center gap-2">
          <Link2 size={14} className="text-lavender-500" /> Microsoft links
        </h2>
        <p className="text-xs text-stone-400 -mt-2">
          Paste the sharing link for each file. These open directly from the app.
        </p>

        {links.map(({ label, value, set, placeholder }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">{label}</label>
              {value && (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sage-600 hover:text-sage-700 flex items-center gap-1"
                >
                  <ExternalLink size={11} /> Open
                </a>
              )}
            </div>
            <input
              className="input text-sm"
              type="url"
              value={value}
              onChange={e => set(e.target.value)}
              placeholder={placeholder}
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        className={`btn-primary w-full flex items-center justify-center gap-2 transition-colors ${
          saved ? 'bg-sage-600' : ''
        }`}
      >
        {saved
          ? <><Check size={15} /> Saved!</>
          : <><Save size={15} /> Save settings</>
        }
      </button>

      {/* Local dev note */}
      <div className="card bg-stone-50 border-stone-100">
        <p className="text-xs text-stone-400 leading-relaxed">
          <span className="font-medium text-stone-500">Local development:</span> copy{' '}
          <code className="bg-stone-100 px-1 rounded text-[11px]">.env.example</code> to{' '}
          <code className="bg-stone-100 px-1 rounded text-[11px]">.env.local</code> and fill in your keys.
          That file is gitignored and never committed.
        </p>
      </div>
    </div>
  )
}
