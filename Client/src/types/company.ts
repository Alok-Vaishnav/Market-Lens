export interface CompanySearchResult {
  name: string
  symbol: string
  exchange?: string | null
  currentPrice?: number | null
}

export interface ProfitLossEntry {
  period?: string | number | null
  [key: string]: string | number | null | undefined
}

export interface CompanyData {
  name: string
  symbol: string
  exchange?: string | null
  about: { description: string | null; sector: string | null; industry: string | null; website: string | null }
  overview: { currentPrice: number | null; dayChange: number | null; dayChangePercent: number | null; marketCap: number | null; week52High: number | null; week52Low: number | null }
  metrics: Record<string, number | null>
  profitLoss?: ProfitLossEntry[]
  growth: {
    sales: Record<string, number | null>
    profit: Record<string, number | null>
    eps: Record<string, number | null>
  }
  sourceData: {
    oldDate: string | null
    oldPrice: number | null
    currentDate: string | null
    currentPrice: number | null
    gainLossPerShare: number | null
    gainLossPct: number | null
    result: string | null
  } | null
}
