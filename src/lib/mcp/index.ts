import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCompanies from "./tools/list-companies";
import createCompany from "./tools/create-company";
import listAnalyses from "./tools/list-analyses";
import getAnalysis from "./tools/get-analysis";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "finscope-mcp",
  title: "FinScope",
  version: "0.1.0",
  instructions:
    "Tools to read the signed-in user's FinScope companies and AI financial statement analyses (income statement, balance sheet, cash flow, ratios, red flags, recommendations). Use list_companies and list_analyses to discover records, then get_analysis for the full report JSON.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCompanies, createCompany, listAnalyses, getAnalysis],
});
