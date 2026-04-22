import CountryCombobox from './CountryCombobox'

const LANGUAGES = [
  { label: 'Arabic', value: 'ar' },
  { label: 'English', value: 'en' },
  { label: 'Russian', value: 'ru' },
  { label: 'Farsi', value: 'fa' },
  { label: 'Turkish', value: 'tr' },
  { label: 'French', value: 'fr' },
  { label: 'Swahili', value: 'sw' },
  { label: 'Amharic', value: 'am' },
  { label: 'Uzbek', value: 'uz' },
  { label: 'Dari', value: 'prs' },
]

const LIMITS = [10, 20, 50, 100]

const STEPS = ['Google Maps', 'Web Search', 'AI Qualification']

export default function SearchForm({ form, setForm, onSearch, loading, loadingStep }) {
  const set = (key) => (e) =>
    setForm(prev => ({ ...prev, [key]: e?.target !== undefined ? e.target.value : e }))

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-5 pt-5 pb-3 border-b border-slate-100">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
          Search Configuration
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Country */}
        <Field label="Country" required>
          <CountryCombobox value={form.country} onChange={set('country')} />
        </Field>

        {/* City */}
        <Field label="City">
          <input
            type="text"
            value={form.city}
            onChange={set('city')}
            placeholder="e.g. Tripoli"
            className="input"
          />
        </Field>

        {/* Business Type */}
        <Field label="Business Type" required>
          <input
            type="text"
            value={form.businessType}
            onChange={set('businessType')}
            placeholder="e.g. used car dealer, قطع غيار"
            className="input"
            dir="auto"
          />
        </Field>

        {/* Language */}
        <Field label="Search Language">
          <select value={form.language} onChange={set('language')} className="input">
            {LANGUAGES.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </Field>

        {/* Limit */}
        <Field label="Number of Results">
          <select value={form.limit} onChange={set('limit')} className="input">
            {LIMITS.map(l => (
              <option key={l} value={l}>{l} results</option>
            ))}
          </select>
        </Field>

        {/* Criteria */}
        <Field label="AI Qualification Criteria">
          <textarea
            value={form.criteria}
            onChange={set('criteria')}
            rows={5}
            placeholder="Describe what makes a lead relevant, e.g. B2B car trader who imports used vehicles"
            className="input resize-none leading-relaxed"
          />
        </Field>
      </div>

      {/* Footer: button + loading state */}
      <div className="px-5 py-4 border-t border-slate-100 space-y-3">
        <button
          onClick={onSearch}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-semibold rounded-lg
            hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-150 shadow-sm shadow-blue-200"
        >
          {loading ? 'Searching…' : 'Search Leads'}
        </button>

        {loading && (
          <div className="space-y-2">
            {STEPS.map((step, i) => (
              <div key={step} className={`flex items-center gap-2 text-xs transition-all ${
                i < loadingStep  ? 'text-emerald-600' :
                i === loadingStep ? 'text-blue-600' :
                'text-slate-300'
              }`}>
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 text-[9px] font-bold ${
                  i < loadingStep  ? 'bg-emerald-100 border-emerald-300' :
                  i === loadingStep ? 'bg-blue-100 border-blue-300' :
                  'border-slate-200'
                }`}>
                  {i < loadingStep ? '✓' : i + 1}
                </span>
                <span className="font-medium">{step}</span>
                {i === loadingStep && (
                  <span className="flex gap-0.5 ml-auto">
                    {[0, 1, 2].map(d => (
                      <span
                        key={d}
                        className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${d * 150}ms` }}
                      />
                    ))}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children, required }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
