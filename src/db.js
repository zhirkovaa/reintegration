import Dexie from 'dexie'

export const db = new Dexie('ReintegrationDB')

db.version(1).stores({
  medications:  '++id, name, type, active, sortOrder',
  medLogs:      '++id, medicationId, date',
  exercises:    '++id, date',
  plaudNotes:   '++id, date, category, title',
  hrPlanData:   'key',
  settings:     'key',
})

export const toDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const DEFAULT_MEDICATIONS = [
  {
    name: 'Антидепрессант',
    type: 'antidepressant',
    dosage: '',
    scheduleTime: 'утром',
    notes: 'добавьте название и дозировку',
    active: true,
    sortOrder: 0,
  },
]

export const DEFAULT_SUPPLEMENTS = [
  { name: 'Витамин D3',         type: 'supplement', dosage: '2000 МЕ',   scheduleTime: 'утром',    notes: '',  active: true,  sortOrder: 10 },
  { name: 'Omega-3 (EPA/DHA)',  type: 'supplement', dosage: '1000 мг',   scheduleTime: 'с едой',   notes: '',  active: true,  sortOrder: 20 },
  { name: 'Магний (глицинат)',  type: 'supplement', dosage: '300 мг',    scheduleTime: 'вечером',  notes: '',  active: true,  sortOrder: 30 },
  { name: 'Витамин B12',        type: 'supplement', dosage: '500 мкг',   scheduleTime: 'утром',    notes: '',  active: false, sortOrder: 40 },
  { name: 'Фолат (B9)',         type: 'supplement', dosage: '400 мкг',   scheduleTime: 'утром',    notes: '',  active: false, sortOrder: 50 },
  { name: 'Цинк',               type: 'supplement', dosage: '15 мг',     scheduleTime: 'с едой',   notes: '',  active: false, sortOrder: 60 },
]

export async function seedIfEmpty() {
  const count = await db.medications.count()
  if (count === 0) {
    await db.medications.bulkAdd([...DEFAULT_MEDICATIONS, ...DEFAULT_SUPPLEMENTS])
  }
}

export async function toggleMedLog(medicationId, date) {
  const existing = await db.medLogs
    .where({ medicationId, date })
    .first()
  if (existing) {
    await db.medLogs.delete(existing.id)
    return false
  } else {
    await db.medLogs.add({ medicationId, date, takenAt: new Date().toISOString() })
    return true
  }
}

export async function getMedLogsForDate(date) {
  return db.medLogs.where('date').equals(date).toArray()
}

export async function getMedLogsRange(startDate, endDate) {
  return db.medLogs
    .where('date')
    .between(startDate, endDate, true, true)
    .toArray()
}
