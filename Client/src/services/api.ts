import type { CompanyData, CompanySearchResult } from '../types/company'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api').replace(/\/$/, '')

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { signal })
    if (!response.ok) {
      if (response.status === 404) throw new Error('Company not found.')
      throw new Error('Unable to connect to the server.')
    }
    const payload = await response.json() as { data?: T; message?: string }
    return (payload.data ?? payload) as T
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    if (error instanceof Error && error.message === 'Company not found.') throw error
    throw new Error('Unable to connect to the server.')
  }
}

export function searchCompanies(query: string, signal?: AbortSignal): Promise<CompanySearchResult[]> {
  return request<CompanySearchResult[]>(`/companies/search?q=${encodeURIComponent(query)}`, signal)
}

export function getCompany(symbol: string, signal?: AbortSignal): Promise<CompanyData> {
  return request<CompanyData>(`/companies/${encodeURIComponent(symbol)}`, signal)
}
