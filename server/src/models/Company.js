import mongoose from 'mongoose'

const nullableNumber = { type: Number, default: null }
const profitLossSchema = new mongoose.Schema({
  period: { type: String, default: null },
  sales: nullableNumber,
  expenses: nullableNumber,
  operatingProfit: nullableNumber,
  opm: nullableNumber,
  otherIncome: nullableNumber,
  interest: nullableNumber,
  depreciation: nullableNumber,
  profitBeforeTax: nullableNumber,
  taxPercent: nullableNumber,
  netProfit: nullableNumber,
  eps: nullableNumber,
}, { _id: false, strict: true })

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  symbol: { type: String, required: true, unique: true, uppercase: true, trim: true },
  exchange: { type: String, default: null },
  sector: { type: String, default: null },
  industry: { type: String, default: null },
  website: { type: String, default: null },
  description: { type: String, default: null },
  currentPrice: nullableNumber,
  dayChange: nullableNumber,
  dayChangePercent: nullableNumber,
  marketCap: nullableNumber,
  week52High: nullableNumber,
  week52Low: nullableNumber,
  metrics: {
    pe: nullableNumber, pb: nullableNumber, eps: nullableNumber, bookValue: nullableNumber,
    roe: nullableNumber, roce: nullableNumber, dividendYield: nullableNumber, debtEquity: nullableNumber,
    operatingMargin: nullableNumber, netProfitMargin: nullableNumber,
  },
  profitLoss: { type: [profitLossSchema], default: [] },
  growth: {
    sales: { threeYears: nullableNumber, fiveYears: nullableNumber, tenYears: nullableNumber },
    profit: { threeYears: nullableNumber, fiveYears: nullableNumber, tenYears: nullableNumber },
    eps: { threeYears: nullableNumber, fiveYears: nullableNumber, tenYears: nullableNumber },
  },
  sourceData: {
    oldDate: { type: String, default: null },
    oldPrice: nullableNumber,
    currentDate: { type: String, default: null },
    currentPrice: nullableNumber,
    gainLossPerShare: nullableNumber,
    gainLossPct: nullableNumber,
    result: { type: String, default: null },
  },
}, { timestamps: true, strict: true })

export const Company = mongoose.model('Company', companySchema, 'companies')
