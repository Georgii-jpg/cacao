"use client";
// Répartition du stock par produit (PieChart).
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPoidsKg } from "@/lib/utils/format";

type Point = { produitId: string; nom: string; code: string; stockKg: number };

const COULEURS = [
  "oklch(0.36 0.07 45)", // cacao primary
  "oklch(0.82 0.13 80)", // doré accent
  "oklch(0.55 0.12 60)", // brun moyen
  "oklch(0.65 0.10 35)", // ocre
  "oklch(0.45 0.08 20)", // brun rouge
];

export function ChartRepartitionProduits({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Répartition par produit</CardTitle>
          <CardDescription>Aucune donnée validée sur 30 jours.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition par produit</CardTitle>
        <CardDescription>
          Dernières clôtures validées par produit (30 j).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="stockKg"
                nameKey="nom"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={45}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COULEURS[i % COULEURS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--popover))",
                }}
                formatter={(value, _key, item) => [
                  formatPoidsKg(Number(value) || 0),
                  (item as { payload: { nom: string } }).payload?.nom ?? "",
                ]}
              />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value: string) => (
                  <span className="text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
