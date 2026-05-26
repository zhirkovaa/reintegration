import React from 'react'
import {
  Sun, Pill, Activity, Mic, ClipboardList, BookOpen,
} from 'lucide-react'

const ICON_MAP = { Sun, Pill, Activity, Mic, ClipboardList, BookOpen }

const NAV_ITEMS = [
  { id: 'today',     label: 'Today',     icon: 'Sun' },
  { id: 'meds',      label: 'Meds',      icon: 'Pill' },
  { id: 'exercise',  label: 'Exercise',  icon: 'Activity' },
  { id: 'plaud',     label: 'Plaud',     icon: 'Mic' },
  { id: 'hrplan',    label: 'Plan',      icon: 'ClipboardList' },
  { id: 'resources', label: 'Resources', icon: 'BookOpen' },
]

function NavItem({ item, active, onClick }) {
  const Icon = ICON_MAP[item.icon]
  return (
    <button
      onClick={() => onClick(item.id)}
      className={`nav-item w-full text-left ${active ? 'nav-item-active' : 'nav-item-inactive'}`}
    >
      <Icon size={18} className="flex-shrink-0" />
      <span>{item.label}</span>
    </button>
  )
}

export default function Layout({ page, setPage, children }) {
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-stone-50">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-white border-r border-stone-100 min-h-screen p-4 sticky top-0 h-screen">
        <div className="mb-6 px-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🌿</span>
            <span className="font-semibold text-stone-700 text-sm">Reintegration</span>
          </div>
          <p className="text-xs text-stone-400 capitalize">{dateStr}</p>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map(item => (
            <NavItem
              key={item.id}
              item={item}
              active={page === item.id}
              onClick={setPage}
            />
          ))}
        </nav>

        <p className="text-xs text-stone-300 px-2 mt-4">All data stored locally</p>
      </aside>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-6 overflow-x-hidden">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>

      {/* Bottom nav — mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-stone-100 z-40 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          {NAV_ITEMS.map(item => {
            const Icon = ICON_MAP[item.icon]
            const active = page === item.id
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors ${
                  active ? 'text-sage-600' : 'text-stone-400'
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
