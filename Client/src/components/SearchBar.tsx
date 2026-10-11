
import {
  ArrowRight,
  LoaderCircle,
  Search,
  X,
} from 'lucide-react'
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { searchCompanies } from '../services/api'
import type { CompanySearchResult } from '../types/company'

interface Props {
  onSelect: (company: CompanySearchResult) => void
}

export function SearchBar({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CompanySearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const requestInProgress = useRef(false)
  const activeController = useRef<AbortController | null>(null)

  async function handleSearch() {
    const searchQuery = query.trim()

    if (!searchQuery || requestInProgress.current) return

    const controller = new AbortController()

    activeController.current = controller
    requestInProgress.current = true

    setLoading(true)
    setError('')
    setResults([])
    setIsOpen(true)

    try {
      const companies = await searchCompanies(
        searchQuery,
        controller.signal,
      )

      if (controller.signal.aborted) return

      if (!Array.isArray(companies)) {
        throw new Error('The server returned an unexpected response.')
      }

      setResults(companies)
      setError('')
    } catch (err: unknown) {
      if (
        controller.signal.aborted ||
        (err instanceof Error && err.name === 'AbortError')
      ) {
        return
      }

      console.error('Company search failed:', err)

      setResults([])

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to search companies. Please try again.',
      )
    } finally {
      if (activeController.current === controller) {
        activeController.current = null
        requestInProgress.current = false
        setLoading(false)
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void handleSearch()
  }

  function handleSelect(company: CompanySearchResult) {
    activeController.current?.abort()
    activeController.current = null
    requestInProgress.current = false

    setQuery(company.name || company.symbol)
    setResults([])
    setError('')
    setLoading(false)
    setIsOpen(false)

    onSelect(company)
  }

  function handleClear() {
    activeController.current?.abort()
    activeController.current = null
    requestInProgress.current = false

    setQuery('')
    setResults([])
    setError('')
    setLoading(false)
    setIsOpen(false)
  }

  return (
    <div className="relative w-full max-w-xl">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-sm transition focus-within:border-teal focus-within:ring-4 focus-within:ring-teal/10">
          {loading ? (
            <LoaderCircle
              className="shrink-0 animate-spin text-teal"
              size={19}
            />
          ) : (
            <Search className="shrink-0 text-slate-400" size={19} />
          )}

          <input
            type="text"
            value={query}
            onChange={(event) => {
              // Typing updates state only; it never calls the API.
              setQuery(event.target.value)
              setError('')
              setResults([])
            }}
            onFocus={() => {
              if (results.length > 0 || error) {
                setIsOpen(true)
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setIsOpen(false)
              }
            }}
            placeholder="Search a company, NSE or BSE symbol..."
            autoComplete="off"
            aria-label="Search companies"
            aria-expanded={isOpen}
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-slate-400"
          />

          {query && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-mist hover:text-ink"
            >
              <X size={16} />
            </button>
          )}

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="shrink-0 rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close search results"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />

          <div className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-line bg-white p-2 shadow-xl">
            {loading ? (
              <p className="px-3 py-4 text-sm text-slate-500">
                Searching companies...
              </p>
            ) : error ? (
              <div className="px-3 py-4">
                <p className="text-sm text-rose-600">{error}</p>

                <button
                  type="button"
                  onClick={() => void handleSearch()}
                  disabled={loading}
                  className="mt-2 text-sm font-medium text-teal hover:underline disabled:opacity-50"
                >
                  Try again
                </button>
              </div>
            ) : results.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-500">
                No companies found. Try a company name or NSE/BSE symbol.
              </p>
            ) : (
              results.map((company, index) => (
                <button
                  type="button"
                  key={`${company.exchange ?? 'stock'}-${company.symbol}-${index}`}
                  onClick={() => handleSelect(company)}
                  className="group flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left hover:bg-mist"
                >
                  <span className="min-w-0">
                    <strong className="block truncate text-sm text-ink">
                      {company.name || company.symbol}
                    </strong>

                    <span className="text-xs text-slate-500">
                      {company.symbol}
                      {' · '}
                      {company.exchange || 'Exchange unavailable'}
                    </span>
                  </span>

                  <ArrowRight
                    size={16}
                    className="shrink-0 text-slate-300 group-hover:text-teal"
                  />
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
