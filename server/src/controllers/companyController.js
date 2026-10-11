
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

dotenv.config({ path: path.join(serverDirectory, ".env") });

const BHARATSTOCK_BASE_URL = (
  process.env.BHARATSTOCK_API_URL || "https://bharatstockapi.com"
).replace(/\/+$/, "");
const API_KEY = () => process.env.BHARATSTOCK_API_KEY;

const QUOTA_ERROR_MESSAGE = "Daily API request limit reached.";

const providerErrorText = (value, depth = 0) => {
  if (depth > 3 || value === null || value === undefined) return "";

  if (typeof value === "string") {
    try {
      return providerErrorText(JSON.parse(value), depth + 1) || value;
    } catch {
      return value;
    }
  }

  if (typeof value === "number") return String(value);
  if (typeof value !== "object") return "";

  return Object.values(value)
    .map((item) => providerErrorText(item, depth + 1))
    .filter(Boolean)
    .join(" ");
};

const isQuotaText = (value) =>
  /rate[\s_-]*limit|too many requests|quota|request limit|daily limit|resource exhausted/i.test(
    value
  );

const isQuotaError = (error) =>
  error?.code === "API_RATE_LIMIT" ||
  error?.status === 429 ||
  isQuotaText(error?.message || "");

// -------------------- API REQUEST HELPER --------------------

const bharatStockRequest = async (endpoint, params = {}) => {
  const apiKey = API_KEY();

  if (!apiKey) {
    const error = new Error(
      "BHARATSTOCK_API_KEY is missing from server/.env"
    );
    error.status = 500;
    throw error;
  }

  const url = new URL(
    `${BHARATSTOCK_BASE_URL}/v1/${endpoint.replace(/^\/+/, "")}`
  );

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-Key": apiKey,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  const text = await response.text();

  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  const providerMessage = providerErrorText({
    message: data?.message,
    error: data?.error,
    code: data?.code,
    details: data?.details,
    detail: data?.detail,
  });
  const quotaReached =
    response.status === 429 || isQuotaText(providerMessage);

  if (quotaReached || !response.ok || data?.success === false) {
    const error = new Error(
      quotaReached
        ? QUOTA_ERROR_MESSAGE
        : response.status === 404
          ? "Company not found."
          : "Provider request failed."
    );
    error.status = quotaReached ? 429 : response.status;
    if (quotaReached) error.code = "API_RATE_LIMIT";
    throw error;
  }

  return data;
};

// Optional endpoints should not make the whole dashboard fail.
const optionalRequest = async (endpoint, params = {}) => {
  try {
    return await bharatStockRequest(endpoint, params);
  } catch (error) {
    console.warn(
      `[BharatStockAPI] ${endpoint}: ${error.message}`
    );

    if (isQuotaError(error)) throw error;
    return null;
  }
};

// -------------------- NORMALIZATION HELPERS --------------------

const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null);

const asRecord = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const numericValue = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const recordYear = (record) => {
  const value =
    record.fiscal_year ||
    record.period_end_date ||
    record.date ||
    record.as_on_date;
  const match = String(value || "").match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
};

const annualGrowth = (records, field, years) => {
  const datedRecords = records
    .map((record) => ({ record, year: recordYear(record) }))
    .filter(({ year }) => year !== null)
    .sort((a, b) => b.year - a.year);

  if (datedRecords.length === 0) return null;

  const latest = datedRecords[0];
  const previous = datedRecords.find(
    ({ year }) => year === latest.year - years
  );
  const latestValue = numericValue(latest.record[field]);
  const previousValue = previous
    ? numericValue(previous.record[field])
    : null;

  if (
    latestValue === null ||
    previousValue === null ||
    previousValue === 0
  ) {
    return null;
  }

  return ((latestValue - previousValue) / Math.abs(previousValue)) * 100;
};

const toTable = (value) => {
  const records = safeArray(value);

  if (records.length === 0) {
    return { headers: [], rows: [], matrix: [] };
  }

  const headers = [
    ...new Set(records.flatMap((record) => Object.keys(record))),
  ];

  const rows = records.map((record) =>
    headers.map((header) => record[header] ?? null)
  );

  return {
    headers,
    rows,
    matrix: [headers, ...rows],
  };
};

const latestFirst = (records, field) =>
  [...records].sort((a, b) =>
    String(b[field] || "").localeCompare(String(a[field] || ""))
  );

const normalizeSymbol = (rawSymbol) => {
  let symbol = String(rawSymbol || "")
    .trim()
    .toUpperCase();

  // Accept older frontend symbols such as TCS.NS or TCS.BO.
  // BharatStock uses plain symbols such as TCS.
  symbol = symbol.replace(/\.(NS|BO|NSE|BSE)$/i, "");

  if (!/^[A-Z0-9^=_-]+$/.test(symbol)) {
    const error = new Error("Invalid stock ticker.");
    error.status = 400;
    throw error;
  }

  return symbol;
};

// -------------------- COMPANY SEARCH --------------------

// GET /api/companies?q=tcs
// GET /api/companies?search=tcs
const listCompanies = async (req, res) => {
  const query = String(
    req.query?.q || req.query?.search || ""
  ).trim();

  if (!query) {
    return res.json({
      success: true,
      count: 0,
      data: [],
      message: "Enter a company name or ticker to search.",
    });
  }

  return searchCompanies(req, res);
};

// GET /api/companies/search?q=tcs
// GET /api/companies/search/:query
const searchCompanies = async (req, res) => {
  try {
    const query = String(
      req.params?.query ||
        req.query?.q ||
        req.query?.search ||
        ""
    ).trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required.",
      });
    }

    const response = await bharatStockRequest("search", {
      q: query,
      limit: 20,
    });

    const companies = safeArray(response).map((item) => {
      const symbol = String(
        item.symbol || item.ticker || item.code || ""
      ).toUpperCase();

      return {
        symbol,
        ticker: symbol,
        code: symbol,
        name:
          item.company_name ||
          item.companyName ||
          item.company_name ||
          item.name ||
          symbol,
        companyName:
          item.company_name ||
          item.companyName ||
          item.name ||
          symbol,
        exchange: item.exchange || "",
        country: item.country || "India",
        currency: item.currency || "INR",
        type: item.type || "Stock",
        isin: item.isin || "",
      };
    });

    return res.json({
      success: true,
      count: companies.length,
      data: companies,
    });
  } catch (error) {
    console.error("searchCompanies error:", error.message);

    const quotaReached = isQuotaError(error);
    return res.status(quotaReached ? 429 : error.status || 502).json({
      success: false,
      ...(quotaReached && { code: "API_RATE_LIMIT" }),
      message: quotaReached
        ? QUOTA_ERROR_MESSAGE
        : "Company search failed.",
    });
  }
};

// -------------------- COMPANY DETAILS --------------------

// GET /api/companies/:symbol
const getCompany = async (req, res) => {
  try {
    const symbol = normalizeSymbol(req.params?.symbol);

    // Fetch the stock first so we can use its sector for peer comparison.
    const stockResponse = await bharatStockRequest(
      `stocks/${encodeURIComponent(symbol)}`
    );
    const stock = asRecord(stockResponse?.data || stockResponse);

    const sector = stock.sector || "";

    // Keep the requests parallel to reduce total response time.
    const [
      pricesResponse,
      quarterlyResponse,
      annualResponse,
      ratiosResponse,
      shareholdingResponse,
      peersResponse,
    ] = await Promise.all([
      optionalRequest(`stocks/${encodeURIComponent(symbol)}/prices`, {
        page: 1,
        page_size: 365,
      }),

      optionalRequest(`stocks/${encodeURIComponent(symbol)}/financials`, {
        period_type: "quarterly",
        page: 1,
        page_size: 100,
      }),

      optionalRequest(`stocks/${encodeURIComponent(symbol)}/financials`, {
        period_type: "annual",
        page: 1,
        page_size: 100,
      }),

      optionalRequest(`stocks/${encodeURIComponent(symbol)}/ratios`),

      optionalRequest(`stocks/${encodeURIComponent(symbol)}/shareholding`, {
        page: 1,
        page_size: 20,
      }),

      sector
        ? optionalRequest("stocks/compare", {
            sector,
            sort: "market_cap",
            limit: 20,
          })
        : Promise.resolve(null),
    ]);

    // -------------------- PRICE DATA --------------------

    const priceHistory = latestFirst(
      safeArray(pricesResponse),
      "trade_date"
    );

    const latestPrice = priceHistory[0] || stock.latest_price || {};
    const previousPrice = priceHistory[1] || {};

    const price = firstValue(
      latestPrice.close,
      stock.latest_price?.close,
      null
    );

    const previousClose = firstValue(
      latestPrice.prev_close,
      previousPrice.close,
      stock.latest_price?.prev_close,
      null
    );

    const change =
      price != null && previousClose != null
        ? Number(price) - Number(previousClose)
        : null;

    const changesPercentage =
      change != null && Number(previousClose) !== 0
        ? (change / Number(previousClose)) * 100
        : null;

    // -------------------- FINANCIAL DATA --------------------

    const quarterlyRecords = safeArray(quarterlyResponse);
    const annualRecords = safeArray(annualResponse);

    const quarterlyIncome = quarterlyRecords.map((row) => ({
      ...row,
      date: row.period_end_date || row.fiscal_year || null,
    }));

    const annualIncome = annualRecords.map((row) => ({
      ...row,
      date: row.period_end_date || row.fiscal_year || null,
    }));

    // The API returns normalized financial rows. Each row contains
    // P&L, balance-sheet and, for annual records, cash-flow fields.
    const balanceSheetFields = [
      "total_assets",
      "non_current_assets",
      "current_assets",
      "property_plant_equipment",
      "inventories",
      "trade_receivables_current",
      "cash_and_cash_equivalents",
      "total_equity",
      "equity_attributable_to_owners",
      "minority_interest_balance",
      "other_equity",
      "total_liabilities",
      "non_current_liabilities",
      "current_liabilities",
      "borrowings_non_current",
      "borrowings_current",
      "trade_payables_current",
    ];

    const cashFlowFields = [
      "cash_flow_operating",
      "cash_flow_investing",
      "cash_flow_financing",
      "net_change_in_cash",
      "capex",
    ];

    const selectFields = (records, fields) =>
      records.map((row) => {
        const result = {
          date: row.period_end_date || row.fiscal_year || null,
          period_type: row.period_type || null,
        };

        for (const field of fields) {
          result[field] = row[field] ?? null;
        }

        return result;
      });

    const yearlyBalance = selectFields(
      annualRecords,
      balanceSheetFields
    );

    const quarterlyBalance = selectFields(
      quarterlyRecords,
      balanceSheetFields
    );

    const yearlyCashFlow = selectFields(
      annualRecords,
      cashFlowFields
    );

    // The API documents cash-flow figures on annual rows only.
    const quarterlyCashFlow = selectFields(
      quarterlyRecords,
      cashFlowFields
    ).map((row) => ({
      ...row,
      cash_flow_operating: null,
      cash_flow_investing: null,
      cash_flow_financing: null,
      net_change_in_cash: null,
      capex: null,
    }));

    const ratios = asRecord(ratiosResponse?.data || ratiosResponse);

    // -------------------- SHAREHOLDING --------------------

    const shareholdingRecords = latestFirst(
      safeArray(shareholdingResponse),
      "as_on_date"
    );
    const yearlyShareholdingRecords = [
      ...new Map(
        shareholdingRecords
          .map((record) => [recordYear(record), record])
          .filter(([year]) => year !== null)
      ).values(),
    ];

    const growth = {
      sales: {
        threeYears: annualGrowth(annualRecords, "revenue", 3),
        fiveYears: annualGrowth(annualRecords, "revenue", 5),
        tenYears: annualGrowth(annualRecords, "revenue", 10),
      },
      profit: {
        threeYears: annualGrowth(annualRecords, "net_profit", 3),
        fiveYears: annualGrowth(annualRecords, "net_profit", 5),
        tenYears: annualGrowth(annualRecords, "net_profit", 10),
      },
      eps: {
        threeYears: annualGrowth(annualRecords, "eps", 3),
        fiveYears: annualGrowth(annualRecords, "eps", 5),
        tenYears: annualGrowth(annualRecords, "eps", 10),
      },
    };

    // -------------------- PEERS --------------------

    const peers = safeArray(peersResponse).filter(
      (peer) => peer.symbol !== symbol
    );

    // -------------------- RESPONSE --------------------

    const company = {
      symbol,
      ticker: symbol,
      name: stock.company_name || symbol,
      companyName: stock.company_name || symbol,
      exchange: stock.exchange || null,

      about: {
        description: stock.description || null,
        sector: stock.sector || null,
        industry: stock.industry || null,
        website:
          firstValue(
            stock.website,
            stock.website_url,
            stock.company_website,
            stock.official_website
          ) || null,
      },

      overview: {
        currentPrice: price,
        dayChange: change,
        dayChangePercent: changesPercentage,
        marketCap: stock.market_cap ?? null,
        week52High: ratios.week_52_high ?? null,
        week52Low: ratios.week_52_low ?? null,
      },

      metrics: {
        pe: ratios.pe_ratio ?? null,
        pb: ratios.pb_ratio ?? null,
        eps: ratios.eps ?? null,
        bookValue: ratios.book_value ?? null,
        roe: ratios.roe ?? null,
        roce: ratios.roce ?? null,
        dividendYield: ratios.dividend_yield ?? null,
        debtEquity: ratios.debt_to_equity ?? null,
        operatingMargin: ratios.operating_margin ?? null,
        netProfitMargin: ratios.net_profit_margin ?? null,
      },

      financials: {
        quarterlyResults: toTable(quarterlyIncome),
        profitAndLoss: toTable(annualIncome),
        balanceSheet: toTable(yearlyBalance),
        cashFlows: toTable(yearlyCashFlow),
        ratios: toTable(ratios ? [ratios] : []),
        shareholdingQuarterly: toTable(shareholdingRecords),
        shareholdingYearly: toTable(yearlyShareholdingRecords),
      },

      growth,

      research: {
        prices: priceHistory,
        indicators: [],
        corporateActions: [],
        shareholding: shareholdingRecords,
        mutualFundHoldings: [],
        bulkDeals: [],
        blockDeals: [],
        insiderTrades: [],
        peers,
        estimates: [],
        documents: [],
      },

      sourceData: null,
    };

    return res.json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error("getCompany error:", error.message);

    const quotaReached = isQuotaError(error);
    return res.status(quotaReached ? 429 : error.status || 502).json({
      success: false,
      ...(quotaReached && { code: "API_RATE_LIMIT" }),
      message: quotaReached
        ? QUOTA_ERROR_MESSAGE
        : error.status === 404
          ? "Company not found."
          : "Unable to fetch company details.",
    });
  }
};

export {
  listCompanies,
  searchCompanies,
  getCompany,
};
