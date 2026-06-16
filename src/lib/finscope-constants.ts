export const INDUSTRIES = [
  "SaaS / Technology",
  "Retail & E-commerce",
  "Manufacturing",
  "Financial Services",
  "Healthcare & Pharma",
  "Real Estate",
  "Hospitality & Tourism",
  "Construction",
  "Energy & Utilities",
  "Logistics & Transportation",
  "Agriculture",
  "Telecommunications",
  "Education",
  "Media & Entertainment",
  "Professional Services",
  "Non-profit",
  "Government",
  "Other",
];

export const LOCATIONS = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany", "France",
  "Spain", "Italy", "Netherlands", "Belgium", "Switzerland", "Sweden", "Norway",
  "Denmark", "Finland", "Ireland", "Portugal", "Poland", "Austria",
  "United Arab Emirates", "Saudi Arabia", "Qatar", "Israel", "Turkey",
  "India", "Singapore", "Hong Kong", "Japan", "South Korea", "China", "Malaysia",
  "Indonesia", "Thailand", "Vietnam", "Philippines",
  "South Africa", "Nigeria", "Kenya", "Ghana", "Egypt", "Morocco",
  "Brazil", "Mexico", "Argentina", "Chile", "Colombia", "Peru",
  "New Zealand", "Other",
];

export const CURRENCIES = ["USD", "EUR", "GBP", "NGN", "ZAR", "INR", "JPY", "CNY", "CAD", "AUD", "CHF", "AED", "KES", "GHS", "SGD", "HKD", "BRL", "MXN"];

export const PERIODS = ["Monthly", "Quarterly", "Annually"] as const;
export type PeriodType = typeof PERIODS[number];
