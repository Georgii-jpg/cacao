"use client";
// Évolution du stock total réseau (clôtures cumulées) sur 30 jours.
// Recharts AreaChart — client component obligé (SVG + hooks).
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPoidsKg } from "@/lib/utils/format";

type Point = {
  date: string;
  stockTotalKg: number;
  entreesKg: number;
  sortiesKg: number;
};

export function ChartEvolutionStock({ data }: { data: Point[] }) {
  // Format date pour affichage XAxis (jj/mm)
  const dataFmt = data.map((p) => ({
    ...p,
    label: p.date.slice(8, 10) + "/" + p.date.slice(5, 7),
  }));

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Évolution du stock réseau</CardTitle>
        <CardDescription>
          Somme des clôtures validées et soumises, sur 30 jours glissants.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dataFmt} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="grad-stock" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.36 0.07 45)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="oklch(0.36 0.07 45)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)} t` : `${v} kg`
                }
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--popover))",
                }}
                labelFormatter={(label) => `Jour ${String(label)}`}
                formatter={(value) => [
                  formatPoidsKg(Number(value) || 0),
                  "Stock total",
                ]}
              />
              <Area
                type="monotone"
                dataKey="stockTotalKg"
                stroke="oklch(0.36 0.07 45)"
                strokeWidth={2}
                fill="url(#grad-stock)"
                name="Stock total"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
