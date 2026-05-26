import React, { useState, useEffect } from 'react'
import { seedIfEmpty } from './db.js'
import Layout from './components/Layout.jsx'
import Today from './components/Today.jsx'
import MedTracker from './components/MedTracker.jsx'
import ExerciseTracker from './components/ExerciseTracker.jsx'
import PlaudNotes from './components/PlaudNotes.jsx'
import Plans from './components/Plans.jsx'
import Resources from './components/Resources.jsx'
import Journal from './components/Journal.jsx'
import WorkTracker from './components/WorkTracker.jsx'

export const PAGES = {
  today:     { id: 'today',     label: 'Today',     icon: 'Sun' },
  meds:      { id: 'meds',      label: 'Meds',      icon: 'Pill' },
  exercise:  { id: 'exercise',  label: 'Exercise',  icon: 'Activity' },
  plaud:     { id: 'plaud',     label: 'Plaud',     icon: 'Mic' },
  hrplan:    { id: 'hrplan',    label: 'Plan',      icon: 'ClipboardList' },
  resources: { id: 'resources', label: 'Resources', icon: 'BookOpen' },
  journal:   { id: 'journal',   label: 'Journal',   icon: 'BookText' },
  work:      { id: 'work',      label: 'Work',      icon: 'Briefcase' },
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
      case 'journal':   return <Journal />
      case 'work':      return <WorkTracker />
      default:          return <Today navigate={setPage} />
    }
  }

  return (
    <Layout page={page} setPage={setPage}>
      {renderPage()}
    </Layout>
  )
}
