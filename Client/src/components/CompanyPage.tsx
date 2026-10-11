
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ExternalLink,
  TrendingUp,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { getCompany } from '../services/api'
import type { CompanyData, FinancialTable } from '../types/company'
import { formatPrice, formatValue } from '../utils/finance'

const metrics = [
  ['Market Cap', 'marketCap'],
  ['Current Price', 'currentPrice'],
  ['P/E', 'pe'],
  ['P/B', 'pb'],
  ['EPS', 'eps'],
  ['Book Value', 'bookValue'],
  ['ROE', 'roe'],
  ['ROCE', 'roce'],
  ['Dividend Yield', 'dividendYield'],
  ['Debt / Equity', 'debtEquity'],
  ['Operating Margin', 'operatingMargin'],
  ['Net Profit Margin', 'netProfitMargin'],
] as const

export function CompanyPage() {
  const { symbol = '' } = useParams()

  const [company, setCompany] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError('')
    setCompany(null)

    getCompany(symbol, controller.signal)
      .then(setCompany)
      .catch((err: unknown) => {
        if (
          controller.signal.aborted ||
          (err instanceof Error && err.name === 'AbortError')
        ) {
          return
        }

        const message =
          err instanceof Error
            ? err.message
            : 'Unable to load company data.'

        setError(
          message === 'Company not found.'
            ? message
            : 'Unable to load company data. Please try again later.',
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [symbol])

  if (loading) {
    return (
      <>
        <main className="mx-auto max-w-6xl px-5 py-20">
          <p className="text-sm text-slate-500">
            Loading company data...
          </p>
          <div className="mt-4 h-48 animate-pulse rounded-2xl bg-slate-100" />
        </main>
      </>
    )
  }

  if (error || !company) {
    return (
      <>
        <main className="mx-auto max-w-6xl px-5 py-20">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-teal"
          >
            <ArrowLeft size={16} />
            Back to search
          </Link>

          <div className="mt-12 rounded-2xl border border-line bg-white p-6 text-slate-600">
            {error || 'Company not found.'}
          </div>
        </main>
      </>
    )
  }

  const overview = company.overview

  const metricValue = (key: string) =>
    key === 'currentPrice'
      ? overview.currentPrice
      : key === 'marketCap'
        ? overview.marketCap
        : company.metrics[key]

  const growthGroups = [
    ['Sales Growth', company.growth.sales],
    ['Profit Growth', company.growth.profit],
    ['EPS Growth', company.growth.eps],
  ] as const

  const formatGrowth = (value: unknown) => {
    const rendered = formatValue(value)
    return rendered === 'N/A' ? rendered : `${rendered}%`
  }

  return (
    <>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-teal"
        >
          <ArrowLeft size={16} />
          Back to search
        </Link>

        <section className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-teal">
                Company research
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                {company.name}
              </h1>
              <p className="mt-3 text-sm text-slate-500">
                {company.symbol}
                <span className="mx-2 text-slate-300">|</span>
                {company.exchange ?? 'N/A'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <MarketStat
                label="Current price"
                value={formatPrice(overview.currentPrice)}
              />
              <MarketStat
                label="Day change"
                value={formatValue(overview.dayChange)}
                positive
              />
              <MarketStat
                label="Day change %"
                value={formatValue(overview.dayChangePercent)}
                positive
              />
              <MarketStat
                label="Market cap"
                value={formatValue(overview.marketCap)}
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6 border-t border-line pt-5 sm:grid-cols-4">
            <MarketStat
              label="Sector"
              value={formatValue(company.about.sector)}
            />
            <MarketStat
              label="Industry"
              value={formatValue(company.about.industry)}
            />
            <MarketStat
              label="52W high"
              value={formatPrice(overview.week52High)}
            />
            <MarketStat
              label="52W low"
              value={formatPrice(overview.week52Low)}
            />
          </div>
        </section>

        <section className="mt-10">
          <SectionHeading title="About company" eyebrow="Context" />
          <div className="rounded-2xl border border-line bg-white p-6">
            <p className="leading-7 text-slate-600">
              {formatValue(company.about.description)}
            </p>
            <div className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-3">
              <InfoItem label="Industry" value={company.about.industry} />
              <InfoItem label="Sector" value={company.about.sector} />
              <InfoItem
                label="Website"
                value={company.about.website}
                link
              />
            </div>
          </div>
        </section>

        <section className="mt-10">
          <SectionHeading title="Key metrics" eyebrow="At a glance" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {metrics.map(([label, key]) => (
              <div
                key={key}
                className="rounded-xl border border-line bg-white p-4"
              >
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-2 text-lg font-semibold text-ink">
                  {formatValue(metricValue(key))}
                </p>
              </div>
            ))}
          </div>
        </section>

        <FinancialSections financials={company.financials} />

        <section className="mt-10">
          <SectionHeading title="Growth" eyebrow="Simple comparisons" />
          <div className="grid gap-3 sm:grid-cols-3">
            {growthGroups.map(([label, values]) => (
              <div
                key={label}
                className="rounded-xl border border-line bg-white p-5"
              >
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <TrendingUp size={16} className="text-teal" />
                  {label}
                </div>
                <div className="mt-4 flex gap-5">
                  {[
                    ['3 Years', 'threeYears'],
                    ['5 Years', 'fiveYears'],
                    ['10 Years', 'tenYears'],
                  ].map(([period, key]) => (
                    <div key={key}>
                      <p className="text-xs text-slate-400">{period}</p>
                      <p className="mt-1 font-semibold text-ink">
                        {formatGrowth(values[key])}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <ResearchSections research={company.research} />

        {company.sourceData && (
          <section className="mt-10">
            <SectionHeading
              title="Imported performance comparison"
              eyebrow="Source data"
            />
            <div className="grid grid-cols-2 gap-4 rounded-2xl border border-line bg-white p-6 sm:grid-cols-4">
              {[
                ['Previous date', company.sourceData.oldDate],
                ['Previous price', formatPrice(company.sourceData.oldPrice)],
                ['Current date', company.sourceData.currentDate],
                ['Current price', formatPrice(company.sourceData.currentPrice)],
                [
                  'Gain/loss per share',
                  formatPrice(company.sourceData.gainLossPerShare),
                ],
                [
                  'Gain/loss %',
                  formatValue(company.sourceData.gainLossPct),
                ],
                ['Result', company.sourceData.result],
              ].map(([label, value]) => (
                <InfoItem
                  key={String(label)}
                  label={String(label)}
                  value={value}
                />
              ))}
            </div>
          </section>
        )}
      </main>

    </>
  )
}

function FinancialSections({
  financials,
}: {
  financials: CompanyData['financials']
}) {
  return (
    <div className="mt-10 space-y-10">
      <FinancialTableSection
        title="Quarterly results"
        eyebrow="Quarterly financials"
        table={financials.quarterlyResults}
      />
      <FinancialTableSection
        title="Profit & loss"
        eyebrow="Annual financials"
        table={financials.profitAndLoss}
      />
      <FinancialTableSection
        title="Balance sheet"
        eyebrow="Annual financials"
        table={financials.balanceSheet}
      />
      <FinancialTableSection
        title="Cash flow"
        eyebrow="Annual financials"
        table={financials.cashFlows}
      />
      <FinancialTableSection
        title="Ratios"
        eyebrow="Historical ratios"
        table={financials.ratios}
      />
      <FinancialTableSection
        title="Quarterly shareholding"
        eyebrow="Ownership pattern"
        table={financials.shareholdingQuarterly}
      />
      <FinancialTableSection
        title="Yearly shareholding"
        eyebrow="Ownership pattern"
        table={financials.shareholdingYearly}
      />
    </div>
  )
}

function FinancialTableSection({
  title,
  eyebrow,
  table,
}: {
  title: string
  eyebrow: string
  table: FinancialTable
}) {
  return (
    <section>
      <SectionHeading title={title} eyebrow={eyebrow} />
      {table.matrix.length > 1 ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="min-w-[700px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-mist text-xs uppercase tracking-wide text-slate-500">
                {table.headers.map((header, index) => (
                  <th
                    key={`${header}-${index}`}
                    className="whitespace-nowrap px-4 py-4 font-semibold"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.matrix.slice(1).map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-line text-slate-600 last:border-0"
                >
                  {table.headers.map((_, columnIndex) => (
                    <td
                      key={columnIndex}
                      className="whitespace-nowrap px-4 py-3"
                    >
                      {formatValue(row[columnIndex])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState text={`No ${title} data available.`} />
      )}
    </section>
  )
}

type Research = CompanyData['research']

const field = (row: Record<string, unknown>, key: string) => row[key]

function ResearchSections({ research }: { research: Research }) {
  const prices = research.prices.slice().reverse()

  const closeValues = prices
    .map((row) => {
      const value = field(row, 'close')
      return typeof value === 'number' ? value : null
    })
    .filter((value): value is number => value !== null)

  const max = Math.max(...closeValues, 0)
  const min = Math.min(...closeValues, max)

  const points = prices
    .map((row, index) => {
      const close = field(row, 'close')

      return typeof close === 'number'
        ? `${(index / Math.max(prices.length - 1, 1)) * 100},${100 - ((close - min) / Math.max(max - min, 1)) * 90}`
        : ''
    })
    .filter(Boolean)
    .join(' ')

  return (
    <div className="mt-10 space-y-10">
      <section>
        <SectionHeading
          title="Price & volume history"
          eyebrow="Historical market data"
        />
        {prices.length ? (
          <div className="rounded-2xl border border-line bg-white p-5">
            <svg
              viewBox="0 0 100 100"
              className="h-56 w-full"
              preserveAspectRatio="none"
              role="img"
              aria-label="Historical closing price chart"
            >
              <polyline
                points={points}
                fill="none"
                stroke="#0f766e"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <ResearchTable
              rows={prices.slice(-10)}
              columns={[
                ['trade_date', 'Date'],
                ['close', 'Close'],
                ['volume', 'Volume'],
                ['high', 'High'],
                ['low', 'Low'],
              ]}
            />
          </div>
        ) : (
          <EmptyState text="No historical price data available." />
        )}
      </section>

      <section>
        <SectionHeading
          title="Peer comparison"
          eyebrow="Comparable companies"
        />
        {research.peers.length ? (
          <ResearchTable
            rows={research.peers}
            columns={[
              ['symbol', 'Symbol'],
              ['company_name', 'Company'],
              ['price', 'Price'],
              ['market_cap', 'Market cap'],
              ['pe_ratio', 'P/E'],
              ['roe', 'ROE'],
            ]}
          />
        ) : (
          <EmptyState text="No peer comparison data available." />
        )}
      </section>

      <section>
        <SectionHeading
          title="Technical indicators"
          eyebrow="Market signals"
        />
        {research.indicators.length ? (
          <ResearchTable
            rows={research.indicators.slice(-10)}
            columns={[
              ['trade_date', 'Date'],
              ['close', 'Close'],
              ['sma', 'SMA'],
              ['ema', 'EMA'],
              ['rsi', 'RSI'],
              ['macd', 'MACD'],
            ]}
          />
        ) : (
          <EmptyState text="No technical indicator data available." />
        )}
      </section>

      <section>
        <SectionHeading
          title="Corporate actions"
          eyebrow="Dividends, splits & bonuses"
        />
        {research.corporateActions.length ? (
          <ResearchTable
            rows={research.corporateActions}
            columns={[
              ['action_type', 'Type'],
              ['subject', 'Subject'],
              ['ex_date', 'Ex-date'],
              ['ratio_from', 'From'],
              ['ratio_to', 'To'],
              ['dividend_per_share', 'Dividend'],
            ]}
          />
        ) : (
          <EmptyState text="No corporate actions available." />
        )}
      </section>

      <section>
        <SectionHeading
          title="Shareholding"
          eyebrow="Ownership pattern"
        />
        {research.shareholding.length ? (
          <ResearchTable
            rows={research.shareholding}
            columns={[
              ['as_on_date', 'As on'],
              ['promoter_pct', 'Promoter %'],
              ['fii_pct', 'FII %'],
              ['dii_pct', 'DII %'],
              ['public_pct', 'Public %'],
            ]}
          />
        ) : (
          <EmptyState text="No shareholding data available." />
        )}
      </section>

      <section>
        <SectionHeading
          title="Mutual-fund holdings"
          eyebrow="Institutional ownership"
        />
        {research.mutualFundHoldings.length ? (
          <ResearchTable
            rows={research.mutualFundHoldings}
            columns={[
              ['portfolio_date', 'Date'],
              ['scheme_name', 'Scheme'],
              ['fund_house', 'Fund house'],
              ['quantity', 'Quantity'],
              ['pct_of_aum', '% of AUM'],
            ]}
          />
        ) : (
          <EmptyState text="No mutual-fund holding data available." />
        )}
      </section>

      <section>
        <SectionHeading
          title="Deals & insider trades"
          eyebrow="Disclosure data"
        />
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            {research.bulkDeals.length ? (
              <ResearchTable
                rows={research.bulkDeals}
                columns={[
                  ['deal_date', 'Date'],
                  ['client_name', 'Client'],
                  ['buy_sell', 'Side'],
                  ['quantity', 'Quantity'],
                  ['avg_price', 'Price'],
                ]}
              />
            ) : (
              <EmptyState text="No bulk deals available." />
            )}
          </div>

          <div>
            {research.insiderTrades.length ? (
              <ResearchTable
                rows={research.insiderTrades}
                columns={[
                  ['intimation_date', 'Date'],
                  ['acquirer_name', 'Name'],
                  ['transaction_type', 'Type'],
                  ['quantity', 'Quantity'],
                  ['mode', 'Mode'],
                ]}
              />
            ) : (
              <EmptyState text="No insider trades available." />
            )}
          </div>
        </div>
      </section>

      <section>
        <SectionHeading
          title="Estimates & documents"
          eyebrow="Unavailable from provider"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <EmptyState text="Analyst estimates: N/A" />
          <EmptyState text="Documents and filings: N/A" />
        </div>
      </section>
    </div>
  )
}

function ResearchTable({
  rows,
  columns,
}: {
  rows: Record<string, unknown>[]
  columns: [string, string][]
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white">
      <table className="w-full min-w-[650px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-mist text-xs uppercase tracking-wide text-slate-500">
            {columns.map(([, label]) => (
              <th key={label} className="px-4 py-3 font-semibold">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              className="border-b border-line text-slate-600 last:border-0"
            >
              {columns.map(([key]) => (
                <td key={key} className="whitespace-nowrap px-4 py-3">
                  {formatValue(field(row, key))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MarketStat({
  label,
  value,
  positive = false,
}: {
  label: string
  value: string
  positive?: boolean
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`mt-2 text-lg font-semibold ${positive ? 'text-teal' : 'text-ink'}`}
      >
        {value}
      </p>
    </div>
  )
}

function SectionHeading({
  title,
  eyebrow,
}: {
  title: string
  eyebrow: string
}) {
  return (
    <div className="mb-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
        {title}
      </h2>
    </div>
  )
}

function InfoItem({
  label,
  value,
  link = false,
}: {
  label: string
  value: unknown
  link?: boolean
}) {
  const rendered =
    value === null || value === undefined || value === ''
      ? 'N/A'
      : String(value)

  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      {link && rendered !== 'N/A' ? (
        <a
          href={rendered}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 truncate text-sm text-teal hover:underline"
        >
          {rendered}
          <ExternalLink size={12} />
        </a>
      ) : (
        <p className="mt-1 truncate text-sm text-slate-600">
          {rendered}
        </p>
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  )
}
