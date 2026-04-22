import { useState, useCallback, useRef } from 'react'
import SearchForm from './components/SearchForm'
import ResultsTable from './components/ResultsTable'
import Toast from './components/Toast'

// In dev, VITE_API_URL is empty — requests go through Vite's proxy to localhost:3001.
// In production, set VITE_API_URL to the Render backend URL in Vercel env settings.
const API = import.meta.env.VITE_API_URL ?? ''

const STEP_INTERVAL = 6000

export default function App() {
  const [form, setForm] = useState({
    country: '',
    city: '',
    businessType: '',
    language: 'ar',
    limit: 20,
    criteria: '',
  })
  const [loading, setLoading]       = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [results, setResults]       = useState(null)
  const [socialLinks, setSocialLinks] = useState({})
  const [selected, setSelected]     = useState(new Set())
  const [showRejected, setShowRejected] = useState(false)
  const [toasts, setToasts]         = useState([])
  const [searchMeta, setSearchMeta] = useState({})
  const stepTimer = useRef(null)

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }, [])

  async function handleSearch() {
    if (!form.country || !form.businessType) {
      addToast('Country and Business Type are required', 'error')
      return
    }

    setLoading(true)
    setLoadingStep(0)
    setResults(null)
    setSelected(new Set())
    setShowRejected(false)

    // Advance through step labels while waiting
    let step = 0
    clearInterval(stepTimer.current)
    stepTimer.current = setInterval(() => {
      step = Math.min(step + 1, 2)
      setLoadingStep(step)
    }, STEP_INTERVAL)

    try {
      const res = await fetch(`${API}/api/qualify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country:      form.country,
          city:         form.city,
          businessType: form.businessType,
          language:     form.language,
          limit:        Number(form.limit),
          criteria:     form.criteria,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')

      // Stamp a stable _id on every result for checkbox tracking
      const tagged = (data.results ?? []).map((r, i) => ({ ...r, _id: i }))
      setResults(tagged)
      setSocialLinks(data.socialLinks ?? {})
      setSearchMeta({
        country:      form.country,
        city:         form.city,
        businessType: form.businessType,
        searchedAt:   new Date().toISOString(),
      })
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      clearInterval(stepTimer.current)
      setLoading(false)
    }
  }

  async function handleExport() {
    const toExport = (results ?? [])
      .filter(r => selected.has(r._id))
      .map(({ _id, ...r }) => r)

    if (!toExport.length) return

    try {
      const res = await fetch(`${API}/api/sheet/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: toExport, meta: searchMeta }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Export failed')
      addToast(`${data.rowsAdded} leads exported to Google Sheets`, 'success')
      setSelected(new Set())
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100" style={{ fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Header ── */}
      <header className="bg-slate-900 text-white px-5 py-3 flex items-center gap-3 shrink-0 shadow-md">
        <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center shadow-inner">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none">
            <circle cx="6.5" cy="6.5" r="3.5" stroke="white" strokeWidth="1.5"/>
            <path d="M9.5 9.5L13 13" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <span
          className="font-semibold tracking-widest text-sm text-slate-100"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          PROSPECTING ENGINE
        </span>
        <div className="ml-auto flex items-center gap-2">
          {results !== null && !loading && (
            <span className="text-xs text-slate-500 font-data">
              {results.length} results
            </span>
          )}
          {loading && (
            <span className="flex items-center gap-1.5 text-xs text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Running search…
            </span>
          )}
        </div>
      </header>

      {/* ── Main layout ── */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 52px)' }}>

        {/* Left panel */}
        <aside className="w-[300px] min-w-[280px] shrink-0 bg-white border-r border-slate-200 overflow-hidden flex flex-col shadow-sm">
          <SearchForm
            form={form}
            setForm={setForm}
            onSearch={handleSearch}
            loading={loading}
            loadingStep={loadingStep}
          />
        </aside>

        {/* Right panel */}
        <main className="flex-1 overflow-hidden flex flex-col min-w-0">
          <ResultsTable
            results={results}
            socialLinks={socialLinks}
            loading={loading}
            loadingStep={loadingStep}
            selected={selected}
            setSelected={setSelected}
            showRejected={showRejected}
            setShowRejected={setShowRejected}
            onExport={handleExport}
          />
        </main>
      </div>

      <Toast toasts={toasts} />
    </div>
  )
}
