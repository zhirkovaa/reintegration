import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const SECTIONS = [
  {
    id: 'antidep',
    emoji: '💊',
    title: 'Antidepressants: what you need to know',
    color: 'border-lavender-200 bg-lavender-50',
    headerColor: 'text-lavender-800',
    content: [
      {
        heading: 'When will they start working?',
        text: `Antidepressants don't work immediately. The first effects are usually noticeable after 2–4 weeks, with full therapeutic benefit at 6–8 weeks. This is normal. The brain needs time to rebuild neural pathways.`,
      },
      {
        heading: "Why you can't skip doses",
        text: `Antidepressants only work with a stable blood concentration. A missed dose disrupts that balance. Take them every day at the same time — consistency matters more than the perfect time of day.`,
      },
      {
        heading: 'Side effects',
        text: `The first 1–2 weeks can be uncomfortable: nausea, sleep disruption, increased anxiety. This is temporary and fades as your body adjusts. If symptoms are severe, tell your doctor — the dose or timing can often be adjusted.`,
      },
      {
        heading: 'Never stop abruptly',
        text: `Stopping antidepressants on your own can cause discontinuation syndrome (dizziness, "brain zaps", irritability). Any dose reduction should always be gradual and supervised by your doctor.`,
      },
      {
        heading: 'Medication + therapy = best outcomes',
        text: `Research consistently shows that combining medication with psychotherapy (CBT, schema therapy) gives significantly better and more durable results than either alone.`,
      },
      {
        heading: "If the first medication doesn't work",
        text: `30–40% of people don't get full relief from their first antidepressant. This is not a failure — it's information for your doctor. Finding the right medication is an iterative process. Don't give up.`,
      },
    ],
  },
  {
    id: 'burnout',
    emoji: '🔥',
    title: 'Burnout and reintegration',
    color: 'border-warm-200 bg-warm-50',
    headerColor: 'text-warm-800',
    content: [
      {
        heading: 'What is burnout?',
        text: `Occupational burnout is chronic exhaustion, cynicism, and reduced effectiveness caused by prolonged stress. The WHO included it in ICD-11. It is not a character flaw — it is a physiological response of the nervous system.`,
      },
      {
        heading: 'Stages of recovery',
        text: `1. Recognition and rest — the hardest step. Doing nothing is not laziness, it is treatment.\n2. Stabilisation — restoring basic functions: sleep, food, minimal movement.\n3. Reactivation — gradually returning to activities, starting with enjoyable ones.\n4. Reintegration — returning to work with new boundaries in place.`,
      },
      {
        heading: 'Returning to work',
        text: `Successful reintegration is gradual. Start with reduced hours and lighter workload. Discuss realistic expectations with your manager and HR. The key: do not compensate for lost time with a sudden surge of effort.`,
      },
      {
        heading: 'Boundaries are not optional',
        text: `After burnout, the brain is vulnerable to overload. Setting limits is a medical necessity, not a preference. Practice saying "no" and "I need more time."`,
      },
    ],
  },
  {
    id: 'lifestyle',
    emoji: '🌿',
    title: 'Lifestyle and evidence-based support',
    color: 'border-sage-200 bg-sage-50',
    headerColor: 'text-sage-800',
    content: [
      {
        heading: 'Physical activity',
        text: `30 minutes of aerobic activity 3–5 times per week reduces depression symptoms comparably to antidepressants for mild-to-moderate cases (meta-analysis, Br J Sports Med 2023). Any movement is better than none — even a short walk counts.`,
      },
      {
        heading: 'Sleep',
        text: `Sleep disruption and depression have a bidirectional relationship. Prioritise sleep: a consistent wake time (even on weekends), darkness and cool temperature, limiting screens an hour before bed. If insomnia persists, tell your doctor.`,
      },
      {
        heading: 'Vitamin D',
        text: `Vitamin D deficiency is associated with depression. Most people at northern latitudes have insufficient levels. Recommended maintenance dose: 1000–2000 IU/day, ideally taken with a fatty meal. Check your 25(OH)D level with your doctor.`,
      },
      {
        heading: 'Omega-3',
        text: `Omega-3 fatty acids (especially EPA) have shown significant antidepressant effects across multiple RCTs. Minimum effective EPA dose: ~1000 mg/day. Look for supplements with a high EPA content (not just total omega-3).`,
      },
      {
        heading: 'Magnesium',
        text: `Magnesium deficiency is common and linked to anxiety and poor sleep. Magnesium glycinate or malate are the best-absorbed, best-tolerated forms. Best taken in the evening.`,
      },
      {
        heading: 'Social connection',
        text: `Isolation worsens depression. Even small social contacts matter. Don't wait for the "right moment" — small steps (a text to a friend, a 30-minute meetup) work.`,
      },
    ],
  },
  {
    id: 'supplements',
    emoji: '🧪',
    title: 'Supplements and nutraceuticals',
    color: 'border-blue-100 bg-blue-50',
    headerColor: 'text-blue-800',
    content: [
      {
        heading: 'Important note',
        text: `Supplements support treatment but do not replace it. Always discuss them with your doctor, especially if you are on antidepressants — some interactions are dangerous (e.g. St John's Wort + SSRIs = serotonin syndrome).`,
      },
      {
        heading: 'Vitamin B12 and folate',
        text: `Deficiencies in B12 and folate reduce antidepressant response. Folate (methylfolate) is involved in serotonin synthesis. Active forms are often recommended in depression: methylcobalamin and L-MTHF.`,
      },
      {
        heading: 'Zinc',
        text: `Zinc modulates NMDA receptor activity and the serotonin system. Meta-analyses show reduced depression symptoms when zinc is added to treatment. 15–30 mg/day, taken with food.`,
      },
      {
        heading: 'Ashwagandha',
        text: `An adaptogen that lowers cortisol levels. Shown to be effective for anxiety and stress in RCTs. Note: use with caution in bipolar disorder.`,
      },
    ],
  },
  {
    id: 'crisis',
    emoji: '🆘',
    title: 'If things feel unbearable',
    color: 'border-red-200 bg-red-50',
    headerColor: 'text-red-700',
    content: [
      {
        heading: 'Crisis lines',
        text: `Russia: 8-800-2000-122 (free, 24/7)\nMoscow: 051 (landline) or +7 (495) 051\nInternational: befrienders.org`,
      },
      {
        heading: 'When to seek urgent help',
        text: `If you have thoughts of self-harm or suicide — this is a medical situation. Call a crisis line, call emergency services (103), or ask someone to take you to the nearest psychiatric service. You are not alone.`,
      },
      {
        heading: 'Tell your doctor',
        text: `If your condition has worsened while on treatment, contact your psychiatrist immediately. Don't wait for your next scheduled appointment.`,
      },
    ],
  },
]

function Section({ section }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`rounded-2xl border ${section.color} overflow-hidden`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <span className="text-2xl">{section.emoji}</span>
        <span className={`flex-1 font-semibold ${section.headerColor}`}>{section.title}</span>
        {open
          ? <ChevronUp size={18} className="text-stone-400 shrink-0" />
          : <ChevronDown size={18} className="text-stone-400 shrink-0" />
        }
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/60">
          {section.content.map((item, i) => (
            <div key={i} className="pt-4">
              <h3 className={`font-semibold text-sm mb-1.5 ${section.headerColor}`}>{item.heading}</h3>
              <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">{item.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Resources() {
  return (
    <div className="fade-in space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-stone-700">Resources</h1>
        <p className="text-sm text-stone-400 mt-0.5">Knowledge is part of recovery</p>
      </div>

      <div className="card bg-sage-50 border-sage-200">
        <p className="text-xs text-sage-700 leading-relaxed">
          <strong>Note:</strong> the information here is educational and based on scientific research.
          It does not replace consultation with a doctor. All treatment decisions are made together with a specialist.
        </p>
      </div>

      {SECTIONS.map(s => (
        <Section key={s.id} section={s} />
      ))}

      <p className="text-xs text-stone-300 text-center pb-2">
        Sources: WHO, NIMH, Cochrane Library, BMJ, Br J Sports Med
      </p>
    </div>
  )
}
