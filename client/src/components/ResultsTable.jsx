import { useRef } from 'react'

const STEPS = ['Searching Google Maps…', 'Searching the web…', 'Qualifying leads with AI…']

const SCORE_STYLE = {
  High:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Medium: 'bg-amber-50   text-amber-700   ring-1 ring-amber-200',
  Low:    'bg-yellow-50  text-yellow-700  ring-1 ring-yellow-200',
  Reject: 'bg-red-50     text-red-600     ring-1 ring-red-200',
}

const SOURCE_STYLE = {
  maps: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  web:  'bg-sky-50    text-sky-700    ring-1 ring-sky-200',
  both: 'bg-teal-50   text-teal-700   ring-1 ring-teal-200',
}

function ScoreBadge({ score }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${SCORE_STYLE[score] ?? 'bg-slate-100 text-slate-500'}`}>
      {score}
    </span>
  )
}

function SourceBadge({ source }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-data font-bold uppercase tracking-wider ${SOURCE_STYLE[source] ?? 'bg-slate-100 text-slate-500'}`}>
      {source}
    </span>
  )
}

function SocialIcons({ socialLinks }) {
  if (!socialLinks) return <span className="text-slate-200">—</span>
  const links = [
    socialLinks.facebook?.[0] && { key: 'F', url: socialLinks.facebook[0], title: 'Facebook', cls: 'text-blue-600 hover:bg-blue-50 ring-blue-200' },
    socialLinks.instagram?.[0] && { key: 'I', url: socialLinks.instagram[0], title: 'Instagram', cls: 'text-pink-600 hover:bg-pink-50 ring-pink-200' },
    socialLinks.tiktok?.[0] && { key: 'T', url: socialLinks.tiktok[0], title: 'TikTok', cls: 'text-slate-700 hover:bg-slate-100 ring-slate-200' },
  ].filter(Boolean)

  if (!links.length) return <span className="text-slate-200">—</span>

  return (
    <div className="flex gap-1">
      {links.map(({ key, url, title, cls }) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={title}
          className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold font-data ring-1 transition-colors ${cls}`}
        >
          {key}
        </a>
      ))}
    </div>
  )
}

export default function ResultsTable({
  results, socialLinks, loading, loadingStep,
  selected, setSelected, showRejected, setShowRejected, onExport,
}) {
  const checkAllRef = useRef(null)

  const visible = results === null ? [] : (
    showRejected ? results : results.filter(r => r.score !== 'Reject')
  )

  const visibleIds = new Set(visible.map(r => r._id))
  const allChecked = visibleIds.size > 0 && [...visibleIds].every(id => selected.has(id))
  const someChecked = [...visibleIds].some(id => selected.has(id))

  if (checkAllRef.current) {
    checkAllRef.current.indeterminate = !allChecked && someChecked
  }

  function toggleAll() {
    setSelected(prev => {
      const next = new Set(prev)
      if (allChecked) visibleIds.forEach(id => next.delete(id))
      else visibleIds.forEach(id => next.add(id))
      return next
    })
  }

  function toggleOne(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectedVisible = [...selected].filter(id => visibleIds.has(id)).length

  const stats = results ? {
    high:   results.filter(r => r.score === 'High').length,
    medium: results.filter(r => r.score === 'Medium').length,
    low:    results.filter(r => r.score === 'Low').length,
    reject: results.filter(r => r.score === 'Reject').length,
  } : null

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-slate-50">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-[3px] border-slate-200 border-t-blue-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-blue-500/30 animate-pulse" />
          </div>
        </div>

        <div className="flex flex-col gap-2 items-start">
          {STEPS.map((step, i) => (
            <div key={i} className={`flex items-center gap-3 text-sm transition-all duration-500 ${
              i < loadingStep  ? 'text-emerald-600' :
              i === loadingStep ? 'text-blue-600 font-medium' :
              'text-slate-300'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                i < loadingStep  ? 'bg-emerald-100 text-emerald-600' :
                i === loadingStep ? 'bg-blue-100 text-blue-600' :
                'bg-slate-100 text-slate-300'
              }`}>
                {i < loadingStep ? '✓' : i + 1}
              </div>
              {step}
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 font-data">~30–60 seconds</p>
      </div>
    )
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (results === null) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-50 text-slate-400 select-none">
        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
          <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2m0 0A7.5 7.5 0 105.2 5.2a7.5 7.5 0 0010.6 10.6z" />
          </svg>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-slate-500">No results yet</p>
          <p className="text-xs text-slate-400">Configure your search and click <strong className="font-semibold">Search Leads</strong></p>
        </div>
      </div>
    )
  }

  // ── Zero results ───────────────────────────────────────────────────────────
  if (results.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-400 text-sm">
        No results found — try different search terms.
      </div>
    )
  }

  // ── Results table ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-100 bg-white shrink-0">
        {/* Stats */}
        {stats && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-700">
              {visible.length} leads
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-emerald-600 font-medium">{stats.high} High</span>
            <span className="text-slate-300">·</span>
            <span className="text-amber-600 font-medium">{stats.medium} Medium</span>
            <span className="text-slate-300">·</span>
            <span className="text-yellow-600 font-medium">{stats.low} Low</span>
            <span className="text-slate-300">·</span>
            <span className="text-red-400">{stats.reject} Rejected</span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowRejected(v => !v)}
            className={`text-xs px-2.5 py-1.5 rounded-md border font-medium transition-colors ${
              showRejected
                ? 'bg-slate-100 border-slate-300 text-slate-700'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {showRejected ? 'Hide Rejected' : 'Show Rejected'}
          </button>

          <button
            onClick={onExport}
            disabled={selectedVisible === 0}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-blue-600 text-white font-semibold
              hover:bg-blue-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-blue-200"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v8m0 0l-3-3m3 3l3-3M3 12h10" />
            </svg>
            {selectedVisible > 0 ? `Export ${selectedVisible}` : 'Export Selected'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="w-9 px-3 py-2.5">
                <input
                  type="checkbox"
                  ref={checkAllRef}
                  checked={allChecked}
                  onChange={toggleAll}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                />
              </th>
              {['Business Name', 'Phone', 'Address', 'Website', 'Source', 'AI Score', 'Duplicate', 'Social', 'AI Reason'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, idx) => {
              const isSelected = selected.has(row._id)
              const isReject = row.score === 'Reject'
              return (
                <tr
                  key={row._id}
                  onClick={() => toggleOne(row._id)}
                  className={`border-b border-slate-50 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50/70' :
                    idx % 2 === 0 ? 'bg-white hover:bg-slate-50/70' : 'bg-slate-50/40 hover:bg-slate-50/80'
                  } ${isReject ? 'opacity-50' : ''}`}
                >
                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(row._id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                    />
                  </td>

                  <td className="px-3 py-2 max-w-[180px]">
                    <span dir="auto" className="block truncate font-medium text-slate-800" title={row.name}>
                      {row.name ?? '—'}
                    </span>
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="font-data text-slate-600 text-[11px]">
                      {row.phone ?? <span className="text-slate-200">—</span>}
                    </span>
                  </td>

                  <td className="px-3 py-2 max-w-[160px]">
                    <span dir="auto" className="block truncate text-slate-500" title={row.address}>
                      {row.address ?? <span className="text-slate-200">—</span>}
                    </span>
                  </td>

                  <td className="px-3 py-2">
                    {row.website
                      ? (
                        <a
                          href={row.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5"
                          title={row.website}
                        >
                          <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2 10L10 2M10 2H5M10 2v5" />
                          </svg>
                          link
                        </a>
                      )
                      : <span className="text-slate-200">—</span>
                    }
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    <SourceBadge source={row.source} />
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    <ScoreBadge score={row.score} />
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.duplicate
                      ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 ring-1 ring-red-200">
                          ⚠ Dup
                        </span>
                      )
                      : <span className="text-slate-200">—</span>
                    }
                  </td>

                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                    <SocialIcons socialLinks={socialLinks} />
                  </td>

                  <td className="px-3 py-2 max-w-[260px]">
                    <span className="text-slate-500 leading-relaxed" title={row.reason}>
                      {row.reason ?? '—'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
