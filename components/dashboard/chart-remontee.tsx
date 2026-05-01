"use client";
// Taux de remontée par région (admin) ou par magasin (manager) sur 7 jours.
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Ligne = {
  id: string;
  libelle: string;
  joursAvecSaisie: number;
  joursAttendus: number;
  taux: number;
};

export function ChartRemontee({
  data,
  titre,
  description,
}: {
  data: Ligne[];
  titre: string;
  description: string;
}) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{titre}</CardTitle>
          <CardDescription>Aucune donnée disponible.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Coloration : ≥80% vert, ≥50% ambre, sinon rouge
  function couleur(taux: number) {
    if (taux >= 0.8) return "oklch(0.65 0.15 145)"; // emerald
    if (taux >= 0.5) return "oklch(0.75 0.15 75)"; // amber
    return "oklch(0.6 0.2 25)"; // destructive
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titre}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="w-full"
          style={{ height: Math.max(220, 32 * data.length + 40) }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 1]}
                tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="libelle"
                width={120}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--popover))",
                }}
                formatter={(_v, _name, item) => {
                  const p = (item as { payload: Ligne }).payload;
                  return [
                    `${Math.round(p.taux * 100)}% (${p.joursAvecSaisie}/${p.joursAttendus})`,
                    "Taux de remontée",
                  ];
                }}
              />
              <Bar dataKey="taux" radius={[0, 4, 4, 0]}>
                {data.map((d) => (
                  <Cell key={d.id} fill={couleur(d.taux)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
