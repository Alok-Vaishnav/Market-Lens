import { ArrowRight, LoaderCircle, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { searchCompanies } from '../services/api'
import type { CompanySearchResult } from '../types/company'

interface Props { onSelect: (company: CompanySearchResult) => void }

export function SearchBar({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CompanySearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setError(''); return }
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true); setError('')
      try { setResults(await searchCompanies(query.trim(), controller.signal)) }
      catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) setError(err instanceof Error ? err.message : 'Unable to connect to the server.')
      } finally { setLoading(false) }
    }, 350)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [query])

  const showResults = query.trim().length >= 2 && !loading
  return (
    <div className="relative w-full max-w-xl">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-sm focus-within:border-teal focus-within:ring-4 focus-within:ring-teal/10">
        {loading ? <LoaderCircle className="animate-spin text-teal" size={19} /> : <Search className="text-slate-400" size={19} />}
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a company, NSE or BSE symbol..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
      </div>
      {showResults && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-line bg-white p-2 shadow-xl">
          {error ? <p className="px-3 py-4 text-sm text-rose-600">{error}</p> : results.length === 0 ? <p className="px-3 py-4 text-sm text-slate-500">No companies found.</p> : results.map((result) => (
            <button key={result.symbol} onClick={() => onSelect(result)} className="group flex w-full items-center justify-between rounded-lg px-3 py-3 text-left hover:bg-mist">
              <span><strong className="block text-sm text-ink">{result.name}</strong><span className="text-xs text-slate-500">{result.symbol} · {result.exchange ?? 'Exchange unavailable'}</span></span>
              <ArrowRight size={16} className="text-slate-300 group-hover:text-teal" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
