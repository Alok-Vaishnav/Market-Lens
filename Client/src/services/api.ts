
import type { CompanyData, CompanySearchResult } from '../types/company'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8005/api'
).replace(/\/+$/, '')

export const API_RATE_LIMIT_EVENT = 'market-lens:api-rate-limit'

const DEFAULT_RATE_LIMIT_MESSAGE =
  "We've reached today's API request limit. Please try again after your quota resets."

type ApiErrorPayload = {
  message?: unknown
  error?: unknown
  code?: unknown
  success?: boolean
  status?: number
  details?: unknown
  data?: unknown
  [key: string]: unknown
}

export class ApiRequestError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.code = code
  }
}

function getNestedText(value: unknown, depth = 0): string {
  if (depth > 4 || value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)

      if (parsed !== null && typeof parsed === 'object') {
        return getNestedText(parsed, depth + 1) || value
      }

      return value
    } catch {
      return value
    }
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (typeof value !== 'object') {
    return ''
  }

  return Object.values(value as Record<string, unknown>)
    .map((item) => getNestedText(item, depth + 1))
    .filter(Boolean)
    .join(' ')
}

function getErrorMessage(payload: ApiErrorPayload | null): string {
  if (!payload) return ''

  return [
    payload.message,
    payload.error,
    payload.code,
    payload.details,
  ]
    .map((value) => getNestedText(value))
    .filter(Boolean)
    .join(' ')
}

function isRateLimitError(
  status: number,
  payload: ApiErrorPayload | null,
): boolean {
  const message = getErrorMessage(payload)

  return (
    status === 429 ||
    /rate[\s_-]*limit|too many requests|quota|request limit|daily limit|resource exhausted|retry_after_seconds/i.test(
      message,
    )
  )
}

function notifyRateLimit(): void {
  if (typeof window === 'undefined') return

  window.dispatchEvent(
    new CustomEvent(API_RATE_LIMIT_EVENT, {
      detail: {
        message: DEFAULT_RATE_LIMIT_MESSAGE,
      },
    }),
  )
}

async function request<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === 'AbortError' || signal?.aborted)
    ) {
      throw error
    }

    throw new ApiRequestError(
      'Unable to connect to the server. Please check your connection and try again.',
    )
  }

  const payload = (await response.json().catch(() => null)) as
    | ApiErrorPayload
    | null

  // Detect quota errors before handling other HTTP errors.
  if (isRateLimitError(response.status, payload)) {
    notifyRateLimit()
    throw new ApiRequestError(
      DEFAULT_RATE_LIMIT_MESSAGE,
      'API_RATE_LIMIT',
    )
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new ApiRequestError('Company not found.')
    }

    throw new ApiRequestError(
      'Unable to retrieve company data. Please try again later.',
    )
  }

  if (payload === null) {
    throw new ApiRequestError('The server returned an invalid response.')
  }

  // Some providers return an error in the JSON body with HTTP 200.
  if (payload.success === false) {
    const message = getErrorMessage(payload)

    if (isRateLimitError(response.status, payload)) {
      notifyRateLimit()
      throw new ApiRequestError(
        DEFAULT_RATE_LIMIT_MESSAGE,
        'API_RATE_LIMIT',
      )
    }

    throw new ApiRequestError(
      message
        ? 'The request could not be completed. Please try again later.'
        : 'The API request failed.',
    )
  }

  return (payload.data ?? payload) as T
}

export function searchCompanies(
  query: string,
  signal?: AbortSignal,
): Promise<CompanySearchResult[]> {
  return request<CompanySearchResult[]>(
    `/companies/search?q=${encodeURIComponent(query)}`,
    signal,
  )
}

export function getCompany(
  symbol: string,
  signal?: AbortSignal,
): Promise<CompanyData> {
  return request<CompanyData>(
    `/companies/${encodeURIComponent(symbol)}`,
    signal,
  )
}
