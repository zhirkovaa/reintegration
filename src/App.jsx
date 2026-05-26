import React, { useState, useEffect } from 'react'
import { seedIfEmpty } from './db.js'
import Layout from './components/Layout.jsx'
import Today from './components/Today.jsx'
import MedTracker from './components/MedTracker.jsx'
import ExerciseTracker from './components/ExerciseTracker.jsx'
import PlaudNotes from './components/PlaudNotes.jsx'
import Plans from './components/Plans.jsx'
import Resources from './components/Resources.jsx'

export const PAGES = {
  today:     { id: 'today',     label: 'Сегодня',    icon: 'Sun' },
  meds:      { id: 'meds',      label: 'Препараты',  icon: 'Pill' },
  exercise:  { id: 'exercise',  label: 'Спорт',      icon: 'Activity' },
  plaud:     { id: 'plaud',     label: 'Plaud',      icon: 'Mic' },
  hrplan:    { id: 'hrplan',    label: 'HR-план',    icon: 'ClipboardList' },
  resources: { id: 'resources', label: 'Ресурсы',    icon: 'BookOpen' },
}

export default function App() {
  const [page, setPage] = useState('today')

  useEffect(() => {
    seedIfEmpty()
  }, [])

  const renderPage = () => {
    switch (page) {
      case 'today':     return <Today     navigate={setPage} />
      case 'meds':      return <MedTracker />
      case 'exercise':  return <ExerciseTracker />
      case 'plaud':     return <PlaudNotes />
      case 'hrplan':    return <Plans />
      case 'resources': return <Resources />
      default:          return <Today navigate={setPage} />
    }
  }

  return (
    <Layout page={page} setPage={setPage}>
      {renderPage()}
    </Layout>
  )
}
