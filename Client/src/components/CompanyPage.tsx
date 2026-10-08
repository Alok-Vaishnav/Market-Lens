import { ArrowLeft, ExternalLink, TrendingUp } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getCompany } from '../services/api'
import type { CompanyData, ProfitLossEntry } from '../types/company'
import { formatPrice, formatValue } from '../utils/finance'

const metrics = [['Market Cap', 'marketCap'], ['Current Price', 'currentPrice'], ['P/E', 'pe'], ['P/B', 'pb'], ['EPS', 'eps'], ['Book Value', 'bookValue'], ['ROE', 'roe'], ['ROCE', 'roce'], ['Dividend Yield', 'dividendYield'], ['Debt / Equity', 'debtEquity'], ['Operating Margin', 'operatingMargin'], ['Net Profit Margin', 'netProfitMargin']] as const
const profitColumns = [['Sales', 'sales'], ['Expenses', 'expenses'], ['Operating Profit', 'operatingProfit'], ['OPM %', 'opm'], ['Other Income', 'otherIncome'], ['Interest', 'interest'], ['Depreciation', 'depreciation'], ['Profit Before Tax', 'profitBeforeTax'], ['Tax %', 'taxPercent'], ['Net Profit', 'netProfit'], ['EPS', 'eps']] as const

export function CompanyPage() {
  const { symbol = '' } = useParams()
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    getCompany(symbol, controller.signal).then(setCompany).catch((err) => {
      if (!(err instanceof DOMException && err.name === 'AbortError')) setError(err instanceof Error ? err.message : 'Unable to load company data. Please try again.')
    }).finally(() => setLoading(false))
    return () => controller.abort()
  }, [symbol])

  if (loading) return <main className="mx-auto max-w-6xl px-5 py-20"><p className="text-sm text-slate-500">Loading company data...</p><div className="mt-4 h-48 animate-pulse rounded-2xl bg-slate-100" /></main>
  if (error || !company) return <main className="mx-auto max-w-6xl px-5 py-20"><Link to="/" className="inline-flex items-center gap-2 text-sm text-teal"><ArrowLeft size={16} /> Back to search</Link><div className="mt-12 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">{error || 'Company not found.'}</div></main>

  const overview = company.overview
  const metricValue = (key: string) => key === 'currentPrice' ? overview.currentPrice : key === 'marketCap' ? overview.marketCap : company.metrics[key]
  const growthGroups = [['Sales Growth', company.growth.sales], ['Profit Growth', company.growth.profit], ['EPS Growth', company.growth.eps]] as const
  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
      <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-teal"><ArrowLeft size={16} /> Back to search</Link>
      <section className="rounded-2xl border border-line bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end"><div><p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-teal">Company research</p><h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{company.name}</h1><p className="mt-3 text-sm text-slate-500">{company.symbol} <span className="mx-2 text-slate-300">|</span> {company.exchange ?? 'N/A'}</p></div><div className="grid grid-cols-2 gap-6 sm:grid-cols-4"><MarketStat label="Current price" value={formatPrice(overview.currentPrice)} /><MarketStat label="Day change" value={formatValue(overview.dayChange)} positive /><MarketStat label="Day change %" value={formatValue(overview.dayChangePercent)} positive /><MarketStat label="Market cap" value={formatValue(overview.marketCap)} /></div></div>
        <div className="mt-6 grid grid-cols-2 gap-6 border-t border-line pt-5 sm:grid-cols-4"><MarketStat label="Sector" value={formatValue(company.about.sector)} /><MarketStat label="Industry" value={formatValue(company.about.industry)} /><MarketStat label="52W high" value={formatPrice(overview.week52High)} /><MarketStat label="52W low" value={formatPrice(overview.week52Low)} /></div>
      </section>
      <section className="mt-10"><SectionHeading title="About company" eyebrow="Context" /><div className="rounded-2xl border border-line bg-white p-6"><p className="leading-7 text-slate-600">{formatValue(company.about.description)}</p><div className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-3"><InfoItem label="Industry" value={company.about.industry} /><InfoItem label="Sector" value={company.about.sector} /><InfoItem label="Website" value={company.about.website} link /></div></div></section>
      <section className="mt-10"><SectionHeading title="Key metrics" eyebrow="At a glance" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{metrics.map(([label, key]) => <div key={key} className="rounded-xl border border-line bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-lg font-semibold text-ink">{formatValue(metricValue(key))}</p></div>)}</div></section>
      <section className="mt-10"><SectionHeading title="Profit & loss" eyebrow="Annual financials" />{company.profitLoss?.length ? <div className="overflow-x-auto rounded-2xl border border-line bg-white"><table className="min-w-[1100px] w-full border-collapse text-left text-sm"><thead><tr className="border-b border-line bg-mist text-xs uppercase tracking-wide text-slate-500"><th className="px-5 py-4 font-semibold">Period</th>{profitColumns.map(([label]) => <th key={label} className="px-5 py-4 text-right font-semibold">{label}</th>)}</tr></thead><tbody>{company.profitLoss.map((entry, index) => <ProfitRow key={index} entry={entry} index={index} />)}</tbody></table></div> : <EmptyState text="No Profit & Loss data available." />}</section>
      <section className="mt-10"><SectionHeading title="Growth" eyebrow="Simple comparisons" /><div className="grid gap-3 sm:grid-cols-3">{growthGroups.map(([label, values]) => <div key={label} className="rounded-xl border border-line bg-white p-5"><div className="flex items-center gap-2 text-sm text-slate-500"><TrendingUp size={16} className="text-teal" />{label}</div><div className="mt-4 flex gap-5">{[['3 Years', 'threeYears'], ['5 Years', 'fiveYears'], ['10 Years', 'tenYears']].map(([period, key]) => <div key={key}><p className="text-xs text-slate-400">{period}</p><p className="mt-1 font-semibold text-ink">{formatValue(values[key])}</p></div>)}</div></div>)}</div></section>
      {company.sourceData && <section className="mt-10"><SectionHeading title="Imported performance comparison" eyebrow="Source data" /><div className="grid grid-cols-2 gap-4 rounded-2xl border border-line bg-white p-6 sm:grid-cols-4">{[['Previous date', company.sourceData.oldDate], ['Previous price', formatPrice(company.sourceData.oldPrice)], ['Current date', company.sourceData.currentDate], ['Current price', formatPrice(company.sourceData.currentPrice)], ['Gain/loss per share', formatPrice(company.sourceData.gainLossPerShare)], ['Gain/loss %', formatValue(company.sourceData.gainLossPct)], ['Result', company.sourceData.result]].map(([label, value]) => <InfoItem key={String(label)} label={String(label)} value={value} />)}</div></section>}
    </main>
  )
}

function ProfitRow({ entry, index }: { entry: ProfitLossEntry; index: number }) { return <tr className="border-b border-line last:border-0 text-slate-600"><td className="whitespace-nowrap px-5 py-3">{formatValue(entry.period ?? `Period ${index + 1}`)}</td>{profitColumns.map(([, key]) => <td key={key} className="px-5 py-3 text-right">{formatValue(entry[key])}</td>)}</tr> }
function MarketStat({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) { return <div><p className="text-xs text-slate-500">{label}</p><p className={`mt-2 text-lg font-semibold ${positive ? 'text-teal' : 'text-ink'}`}>{value}</p></div> }
function SectionHeading({ title, eyebrow }: { title: string; eyebrow: string }) { return <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-teal">{eyebrow}</p><h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{title}</h2></div> }
function InfoItem({ label, value, link = false }: { label: string; value: unknown; link?: boolean }) { const rendered = value === null || value === undefined || value === '' ? 'N/A' : String(value); return <div><p className="text-xs text-slate-400">{label}</p>{link && rendered !== 'N/A' ? <a href={rendered} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 truncate text-sm text-teal hover:underline">{rendered}<ExternalLink size={12} /></a> : <p className="mt-1 truncate text-sm text-slate-600">{rendered}</p>}</div> }
function EmptyState({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-sm text-slate-500">{text}</div> }
