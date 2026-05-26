import React, { useState, useRef, useCallback } from 'react'
import { Upload, FileSpreadsheet, X, Download, RefreshCw } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: '',           label: '—',          color: '' },
  { value: 'todo',       label: 'Planned',    color: 'bg-stone-100 text-stone-600' },
  { value: 'inprogress', label: 'In progress', color: 'bg-warm-100 text-warm-700' },
  { value: 'done',       label: 'Done',       color: 'bg-sage-100 text-sage-700' },
  { value: 'blocked',    label: 'Blocked',    color: 'bg-red-50 text-red-500' },
]

export default function HRPlan() {
  const [data, setData]           = useState(null)   // { headers, rows }
  const [fileName, setFileName]   = useState('')
  const [rowStatus, setRowStatus] = useState({})     // { rowIdx: status }
  const [dragOver, setDragOver]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
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
    setLoading(true)
    setError('')
    try {
      const XLSX = await import('xlsx')
      const buf  = await file.arrayBuffer()
      const wb   = XLSX.read(buf, { type: 'array' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const raw  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

      if (!raw || raw.length === 0) {
        setError('File is empty or could not be read')
        setLoading(false)
        return
      }

      const headers = (raw[0] || []).map(String)
      const rows    = raw.slice(1)
      setData({ headers, rows })
      setFileName(file.name)
      setRowStatus({})
    } catch (e) {
      setError('Could not read the file. Try saving it as .xlsx first.')
    }
    setLoading(false)
  }, [])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    processFile(e.dataTransfer.files[0])
  }

  const setStatus = (rowIdx, status) => {
    setRowStatus(prev => ({ ...prev, [rowIdx]: status }))
  }

  const statusInfo = (v) => STATUS_OPTIONS.find(s => s.value === v) || STATUS_OPTIONS[0]

  const doneCnt = Object.values(rowStatus).filter(s => s === 'done').length
  const inpCnt  = Object.values(rowStatus).filter(s => s === 'inprogress').length
  const total   = data ? data.rows.length : 0

  return (
    <div className="fade-in space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-700">HR Plan</h1>
          <p className="text-sm text-stone-400 mt-0.5">Your reintegration plan from HR</p>
        </div>
        {data && (
          <button
            onClick={() => { setData(null); setFileName(''); setRowStatus({}) }}
            className="btn-secondary flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> Load another file
          </button>
        )}
      </div>

      {!data ? (
        <div className="space-y-4">
          {/* Upload zone */}
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
            <p className="text-stone-400 text-sm">Drop a file here or click to browse</p>
            <p className="text-stone-300 text-xs mt-1">.xlsx, .xls, .csv</p>
            {loading && <p className="text-sage-500 text-sm mt-3">Processing file…</p>}
            {error  && <p className="text-red-400 text-sm mt-3">{error}</p>}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={e => processFile(e.target.files[0])}
          />

          <div className="card bg-lavender-50 border-lavender-100">
            <p className="text-sm text-lavender-700 font-medium mb-1">💡 How to use</p>
            <ul className="text-xs text-lavender-600 space-y-1 list-disc list-inside">
              <li>Upload the Excel file sent by HR</li>
              <li>Browse your tasks and reintegration milestones</li>
              <li>Mark the status of each row</li>
              <li>The file never leaves your device — everything stays in your browser</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* File info + stats */}
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <FileSpreadsheet size={20} className="text-sage-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-700">{fileName}</p>
                <p className="text-xs text-stone-400">{total} rows</p>
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sage-400 inline-block" />
                <span className="text-stone-600">Done: {doneCnt}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-warm-400 inline-block" />
                <span className="text-stone-600">In progress: {inpCnt}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-stone-200 inline-block" />
                <span className="text-stone-400">Total: {total}</span>
              </div>
            </div>
            {total > 0 && (
              <div className="mt-3 w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 bg-sage-400 rounded-full transition-all duration-500"
                  style={{ width: `${(doneCnt / total) * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Table */}
          <div className="card p-0 overflow-x-auto">
            <table className="excel-table">
              <thead>
                <tr>
                  <th className="text-stone-400 font-normal">#</th>
                  {data.headers.map((h, i) => (
                    <th key={i}>{h || `Column ${i + 1}`}</th>
                  ))}
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
                        <td key={ci} title={String(row[ci] ?? '')}>
                          {String(row[ci] ?? '')}
                        </td>
                      ))}
                      <td className="min-w-[130px]">
                        <select
                          value={st}
                          onChange={e => setStatus(ri, e.target.value)}
                          className={`text-xs rounded-lg px-2 py-1 border-0 outline-none cursor-pointer ${si.color || 'text-stone-400'}`}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-stone-300 text-center">
            Statuses are saved while the page is open. To update the file, reload and re-upload.
          </p>
        </div>
      )}
    </div>
  )
}
