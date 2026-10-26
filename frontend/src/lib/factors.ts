/** Same 10 locked factors as the Python engine (factors.py). */
export const FACTORS = [
  { id: "earnings_guidance", category: "Fundamental", name: "Earnings Guidance", weight: 15 },
  { id: "pe_ratio", category: "Fundamental", name: "P/E Ratio", weight: 12 },
  { id: "analyst_ratings", category: "Market Intelligence", name: "Analyst Ratings", weight: 12 },
  { id: "insider_selling", category: "Fundamental", name: "Insider Selling", weight: 10 },
  { id: "technical_signal", category: "Market Intelligence", name: "Technical Signal", weight: 10 },
  { id: "fed_rate", category: "Macro", name: "Fed Rate", weight: 9 },
  { id: "market_cap", category: "Fundamental", name: "Market Cap", weight: 8 },
  { id: "sector_rally", category: "Market Intelligence", name: "Sector Rally", weight: 8 },
  { id: "news_sentiment", category: "External", name: "News Sentiment", weight: 8 },
  { id: "beta", category: "Macro", name: "Beta", weight: 8 },
] as const;

export const CATEGORIES = ["Fundamental", "Market Intelligence", "Macro", "External"] as const;

export const CATEGORY_NOTE: Record<string, string> = {
  Fundamental: "How healthy the business is.",
  "Market Intelligence": "What the market and analysts think.",
  Macro: "The wider economy and risk.",
  External: "What the news is saying.",
};
