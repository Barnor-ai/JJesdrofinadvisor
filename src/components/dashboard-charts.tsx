import { Card } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const NAVY = "#0b1e3f";
const GOLD = "#c9a961";
const SUCCESS = "#16a34a";
const DESTRUCTIVE = "#dc2626";
const PIE_COLORS = [NAVY, GOLD, "#3b82f6", "#16a34a", "#dc2626", "#a855f7", "#0ea5e9"];

export function RevenueVsNetIncomeChart({ data }: { data: Array<{ label: string; revenue: number | null; netIncome: number | null }> }) {
  return (
    <Card className="p-6">
      <h3 className="font-display text-lg mb-4">Revenue vs Net Income</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip />
          <Legend />
          <Bar dataKey="revenue" fill={NAVY} name="Revenue" />
          <Bar dataKey="netIncome" fill={GOLD} name="Net Income" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function ExpenseBreakdownChart({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <Card className="p-6">
      <h3 className="font-display text-lg mb-4">Revenue Composition</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label={(e: { name: string }) => e.name}>
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function TrendChart({ data }: { data: Array<{ label: string; revenue: number | null; grossProfit: number | null; netIncome: number | null }> }) {
  return (
    <Card className="p-6">
      <h3 className="font-display text-lg mb-4">Trend analysis</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="revenue" stroke={NAVY} strokeWidth={2} name="Revenue" />
          <Line type="monotone" dataKey="grossProfit" stroke={GOLD} strokeWidth={2} name="Gross Profit" />
          <Line type="monotone" dataKey="netIncome" stroke={SUCCESS} strokeWidth={2} name="Net Income" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function RiskTrendChart({ data }: { data: Array<{ label: string; risk: number | null }> }) {
  return (
    <Card className="p-6">
      <h3 className="font-display text-lg mb-4">Risk score across reports</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip />
          <Line type="monotone" dataKey="risk" stroke={DESTRUCTIVE} strokeWidth={2} name="Risk" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
