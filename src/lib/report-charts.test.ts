import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReportCharts } from "./report-charts";

const expect = (actual: unknown) => ({
  toEqual: (expected: unknown) => assert.deepEqual(actual, expected),
  toBe: (expected: unknown) => assert.equal(actual, expected),
});

test("missing financial data produces no charts", () => {
  expect(buildReportCharts({})).toEqual([]);
});
test("comparison charts preserve current and previous actual values, including losses", () => {
  const charts = buildReportCharts({ extracted: { income_statement: { revenue: 120, net_income: -7 }, prior_income_statement: { revenue: 100, net_income: 5 } } });
  expect(charts[0].series.map(s => s.values)).toEqual([[100, 120], [5, -7]]);
});
test("missing amounts are never treated as zero", () => {
  expect(buildReportCharts({ extracted: { income_statement: { revenue: 120, net_income: null } } })).toEqual([]);
});
test("pie charts reject losses rather than silently omitting them", () => {
  expect(buildReportCharts({ expense_breakdown: [{ name: "Costs", value: 50 }, { name: "Loss", value: -10 }] })).toEqual([]);
});
test("ratios retain stated percentage units and reject ambiguous values", () => {
  const charts = buildReportCharts({ ratios: [{ name: "Current Ratio", value: "1.56x" }, { name: "Return on Equity", value: "12.4%" }, { name: "Net Profit Margin", value: "0.2" }] });
  expect(charts.find(c => c.unit === "ratio")?.series[0].values).toEqual([1.56]);
  expect(charts.find(c => c.unit === "percent")?.series[0].values).toEqual([12.4]);
});
test("working capital and free cash flow are not inferred from other amounts", () => {
  const charts = buildReportCharts({ extracted: { balance_sheet: { current_assets: 300, current_liabilities: 100, cash: 50 }, cash_flow: { operating_cf: 25, investing_cf: -10 } } });
  expect(charts.find(c => c.title === "Cash and Working Capital")?.labels).toEqual(["Cash"]);
  expect(charts.some(c => c.title === "Free Cash Flow")).toBe(false);
});
test("trend gaps stay null and single-point series are omitted", () => {
  const charts = buildReportCharts({ trend_series: { labels: ["2024", "2025", "2026"], revenue: [100, null, 200], net_income: [null, null, 10] } });
  expect(charts[0].series).toEqual([{ name: "Revenue", values: [100, null, 200] }]);
});