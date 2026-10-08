import { Company } from '../models/Company.js'
import mongoose from 'mongoose'

const emptyMetrics = {
  pe: null, pb: null, eps: null, bookValue: null, roe: null, roce: null,
  dividendYield: null, debtEquity: null, operatingMargin: null, netProfitMargin: null,
}
const emptyGrowth = {
  sales: { threeYears: null, fiveYears: null, tenYears: null },
  profit: { threeYears: null, fiveYears: null, tenYears: null },
  eps: { threeYears: null, fiveYears: null, tenYears: null },
}

function cleanCompany(company) {
  return {
    name: company.name,
    symbol: company.symbol,
    exchange: company.exchange ?? null,
    about: {
      description: company.description ?? null,
      sector: company.sector ?? null,
      industry: company.industry ?? null,
      website: company.website ?? null,
    },
    overview: {
      currentPrice: company.currentPrice ?? null,
      dayChange: company.dayChange ?? null,
      dayChangePercent: company.dayChangePercent ?? null,
      marketCap: company.marketCap ?? null,
      week52High: company.week52High ?? null,
      week52Low: company.week52Low ?? null,
    },
    metrics: { ...emptyMetrics, ...(company.metrics ?? {}) },
    profitLoss: company.profitLoss ?? [],
    growth: {
      sales: { ...emptyGrowth.sales, ...(company.growth?.sales ?? {}) },
      profit: { ...emptyGrowth.profit, ...(company.growth?.profit ?? {}) },
      eps: { ...emptyGrowth.eps, ...(company.growth?.eps ?? {}) },
    },
    sourceData: company.sourceData ?? null,
  }
}

function requireDatabase(next) {
  if (mongoose.connection.readyState !== 1) {
    const error = new Error('MongoDB is not connected. Check server/.env and MongoDB Atlas network access.')
    error.statusCode = 503
    next(error)
    return false
  }
  return true
}

export async function listCompanies(_req, res, next) {
  if (!requireDatabase(next)) return
  try {
    const companies = await Company.find({}, { _id: 0, name: 1, symbol: 1, exchange: 1, currentPrice: 1 }).sort({ name: 1 }).lean()
    res.json({ success: true, data: companies })
  } catch (error) { next(error) }
}

export async function searchCompanies(req, res, next) {
  if (!requireDatabase(next)) return
  try {
    const query = String(req.query.q ?? '').trim()
    if (!query) return res.json({ success: true, data: [] })
    const expression = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const companies = await Company.find(
      { $or: [{ name: expression }, { symbol: expression }] },
      { _id: 0, name: 1, symbol: 1, exchange: 1, currentPrice: 1 },
    ).sort({ name: 1 }).limit(20).lean()
    res.json({ success: true, data: companies })
  } catch (error) { next(error) }
}

export async function getCompany(req, res, next) {
  if (!requireDatabase(next)) return
  try {
    const symbol = String(req.params.symbol ?? '').trim().toUpperCase()
    if (!/^[A-Z0-9._-]+$/.test(symbol)) return res.status(400).json({ success: false, message: 'Invalid symbol' })
    const company = await Company.findOne({ symbol }).lean()
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' })
    res.json({ success: true, data: cleanCompany(company) })
  } catch (error) { next(error) }
}
