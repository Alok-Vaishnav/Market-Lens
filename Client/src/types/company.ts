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

export interface FinancialTable {
  matrix: unknown[][]
  headers: string[]
  rows: Record<string, unknown>[]
}

export interface CompanyData {
  name: string
  symbol: string
  exchange?: string | null
  about: { description: string | null; sector: string | null; industry: string | null; website: string | null }
  overview: { currentPrice: number | string | null; dayChange: number | string | null; dayChangePercent: number | string | null; marketCap: number | string | null; week52High: number | string | null; week52Low: number | string | null }
  metrics: Record<string, number | string | null>
  financials: {
    quarterlyResults: FinancialTable
    profitAndLoss: FinancialTable
    balanceSheet: FinancialTable
    cashFlows: FinancialTable
    ratios: FinancialTable
    shareholdingQuarterly: FinancialTable
    shareholdingYearly: FinancialTable
  }
  profitLoss?: ProfitLossEntry[]
  growth: {
    sales: Record<string, number | null>
    profit: Record<string, number | null>
    eps: Record<string, number | null>
  }
  sourceData: {
    lastUpdatedAt?: string | null
    ratios?: Record<string, unknown>
    oldDate?: string | null
    oldPrice?: number | null
    currentDate?: string | null
    currentPrice?: number | null
    gainLossPerShare?: number | null
    gainLossPct?: number | null
    result?: string | null
  } | null
  research: {
    prices: Record<string, unknown>[]
    indicators: Record<string, unknown>[]
    corporateActions: Record<string, unknown>[]
    shareholding: Record<string, unknown>[]
    mutualFundHoldings: Record<string, unknown>[]
    bulkDeals: Record<string, unknown>[]
    blockDeals: Record<string, unknown>[]
    insiderTrades: Record<string, unknown>[]
    peers: Record<string, unknown>[]
    estimates: Record<string, unknown>[]
    documents: Record<string, unknown>[]
  }
}
