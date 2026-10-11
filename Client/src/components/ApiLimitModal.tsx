import { AlertTriangle, X } from 'lucide-react'
import { useEffect } from 'react'

export const API_LIMIT_MESSAGE =
  "We've reached today's API request limit. Please try again after your quota resets."

interface ApiLimitModalProps {
  onClose: () => void
}

export function ApiLimitModal({ onClose }: ApiLimitModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="api-limit-title"
        className="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle size={22} />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close popup"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <h2 id="api-limit-title" className="mt-5 text-lg font-semibold text-ink">
          Daily API Limit Reached
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {API_LIMIT_MESSAGE}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Okay, got it
        </button>
      </section>
    </div>
  )
}
