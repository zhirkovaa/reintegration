import React, { useState, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, X, Trash2, FileText, Search, ChevronLeft, Upload } from 'lucide-react'
import { db, toDateKey } from '../db.js'

const CATEGORIES = [
  { value: 'psychiatrist', label: 'Психиатр / Психолог', emoji: '🧠', color: 'bg-lavender-100 text-lavender-700' },
  { value: 'manager',      label: 'Встреча с менеджером', emoji: '💼', color: 'bg-warm-100 text-warm-700' },
  { value: 'conversation', label: 'Важный разговор',      emoji: '💬', color: 'bg-blue-50 text-blue-600' },
  { value: 'solo',         label: 'Мои мысли (соло)',     emoji: '🌙', color: 'bg-stone-100 text-stone-600' },
]

const catInfo = (v) => CATEGORIES.find(c => c.value === v) || CATEGORIES[3]

const EMPTY_FORM = { title: '', category: 'psychiatrist', date: toDateKey(), notes: '' }

function AddNoteModal({ onSave, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFile = (f) => {
    if (f && f.type === 'application/pdf') setFile(f)
    else alert('Пожалуйста, выберите PDF-файл')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    let fileData = null
    let fileName = null
    if (file) {
      const buf = await file.arrayBuffer()
      fileData = buf
      fileName = file.name
    }
    onSave({ ...form, fileData, fileName, createdAt: new Date().toISOString() })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="label">Заголовок *</label>
        <input className="input" value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="Например: Встреча с психиатром — начало лечения" required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Категория</label>
          <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Дата</label>
          <input type="date" className="input" value={form.date}
            onChange={e => set('date', e.target.value)} />
        </div>
      </div>

      {/* PDF upload */}
      <div>
        <label className="label">PDF-файл (саммари из Plaud)</label>
        <div
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-sage-400 bg-sage-50' : 'border-stone-200 hover:border-stone-300'
          }`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current.click()}
        >
          {file ? (
            <div className="flex items-center justify-center gap-2 text-sage-600">
              <FileText size={18} />
              <span className="text-sm font-medium">{file.name}</span>
              <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }}
                className="text-stone-400 hover:text-red-400">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="text-stone-400">
              <Upload size={24} className="mx-auto mb-1 text-stone-300" />
              <p className="text-sm">Перетащите PDF или нажмите</p>
              <p className="text-xs mt-0.5">Только PDF</p>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden"
          onChange={e => handleFile(e.target.files[0])} />
      </div>

      <div>
        <label className="label">Ключевые моменты / Заметки</label>
        <textarea
          className="input resize-none"
          rows={4}
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Что важного обсудили? Какие решения приняты? Что запомнилось?"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary flex-1">Сохранить</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Отмена</button>
      </div>
    </form>
  )
}

function NoteViewer({ note, onBack, onDelete }) {
  const [pdfUrl, setPdfUrl] = useState(null)

  React.useEffect(() => {
    if (note.fileData) {
      const blob = new Blob([note.fileData], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPdfUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [note.fileData])

  const cat = catInfo(note.category)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-ghost p-1.5">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-stone-700 truncate">{note.title}</h1>
          <p className="text-xs text-stone-400">{note.date}</p>
        </div>
        <span className={`badge ${cat.color}`}>{cat.emoji} {cat.label}</span>
        <button
          onClick={() => { if (window.confirm('Удалить эту заметку?')) onDelete(note.id) }}
          className="btn-ghost p-1.5 text-red-300 hover:text-red-500"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {note.notes && (
        <div className="card">
          <h2 className="text-sm font-medium text-stone-600 mb-2">Ключевые моменты</h2>
          <p className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed">{note.notes}</p>
        </div>
      )}

      {pdfUrl ? (
        <div>
          <h2 className="text-sm font-medium text-stone-600 mb-2">PDF-саммари</h2>
          <iframe src={pdfUrl} className="pdf-frame" title={note.title} />
        </div>
      ) : (
        !note.fileData && (
          <div className="card text-center py-6 text-stone-300">
            <FileText size={32} className="mx-auto mb-2" />
            <p className="text-sm">PDF не прикреплён</p>
          </div>
        )
      )}
    </div>
  )
}

export default function PlaudNotes() {
  const [showModal, setShowModal] = useState(false)
  const [viewNote, setViewNote] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')

  const notes = useLiveQuery(() =>
    db.plaudNotes.orderBy('date').reverse().toArray(), []
  )

  const filtered = (notes || []).filter(n => {
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'all' || n.category === filterCat
    return matchSearch && matchCat
  })

  const handleSave = async (data) => {
    await db.plaudNotes.add(data)
    setShowModal(false)
  }

  const handleDelete = async (id) => {
    await db.plaudNotes.delete(id)
    setViewNote(null)
  }

  if (viewNote) {
    const current = (notes || []).find(n => n.id === viewNote)
    if (current) {
      return (
        <div className="fade-in">
          <NoteViewer note={current} onBack={() => setViewNote(null)} onDelete={handleDelete} />
        </div>
      )
    }
  }

  return (
    <div className="fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-700">Plaud-заметки</h1>
          <p className="text-sm text-stone-400 mt-0.5">Саммари встреч и разговоров</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5">
          <Plus size={15} /> Добавить
        </button>
      </div>

      {/* Search + filter */}
      {(notes || []).length > 0 && (
        <div className="space-y-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" />
            <input
              className="input pl-9"
              placeholder="Поиск по заголовку..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterCat('all')}
              className={`badge cursor-pointer ${filterCat === 'all' ? 'bg-sage-100 text-sage-700' : 'bg-stone-100 text-stone-500'}`}
            >
              Все
            </button>
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setFilterCat(prev => prev === c.value ? 'all' : c.value)}
                className={`badge cursor-pointer ${filterCat === c.value ? c.color : 'bg-stone-100 text-stone-500'}`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map(note => {
            const cat = catInfo(note.category)
            return (
              <button
                key={note.id}
                onClick={() => setViewNote(note.id)}
                className="card w-full text-left hover:border-sage-200 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{cat.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-stone-700 group-hover:text-sage-700 transition-colors">
                        {note.title}
                      </span>
                      {note.fileData && (
                        <span className="badge bg-stone-100 text-stone-400">
                          <FileText size={10} /> PDF
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {note.date} · <span className={`${cat.color} px-1 py-0.5 rounded text-xs`}>{cat.label}</span>
                    </p>
                    {note.notes && (
                      <p className="text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">{note.notes}</p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="card text-center py-10 border-dashed border-stone-200">
          <p className="text-3xl mb-3">🎙️</p>
          <p className="text-stone-400 text-sm mb-1">
            {search || filterCat !== 'all' ? 'Ничего не найдено' : 'Добавьте первую заметку Plaud'}
          </p>
          {!search && filterCat === 'all' && (
            <p className="text-stone-300 text-xs">Загружайте PDF-саммари с вашего Plaud устройства</p>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-stone-700">Новая заметка</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5"><X size={16} /></button>
            </div>
            <AddNoteModal onSave={handleSave} onCancel={() => setShowModal(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
