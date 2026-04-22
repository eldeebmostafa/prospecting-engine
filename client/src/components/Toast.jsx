export default function Toast({ toasts }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-xl text-sm font-medium pointer-events-auto
            transition-all duration-300 animate-in slide-in-from-bottom-2
            ${t.type === 'success' ? 'bg-emerald-600 text-white' :
              t.type === 'error'   ? 'bg-red-600 text-white' :
              'bg-slate-800 text-white'}`}
        >
          {t.type === 'success' && (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {t.type === 'error' && (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
          {t.message}
        </div>
      ))}
    </div>
  )
}
