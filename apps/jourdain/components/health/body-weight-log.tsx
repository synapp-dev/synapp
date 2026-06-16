"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import { useBodyWeights, useLogBodyWeight } from "@/hooks/gym/use-gym";

function nowLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
const num = (v: string): number | null => {
  const n = parseFloat(v);
  return n > 0 ? Math.round(n * 10) / 10 : null;
};

const chartConfig = {
  weight: { label: "Weight", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function BodyWeightLog() {
  const { data: log } = useBodyWeights();
  const logWeight = useLogBodyWeight();

  const [weight, setWeight] = useState("");
  const [when, setWhen] = useState(nowLocal);
  const [fat, setFat] = useState("");
  const [muscle, setMuscle] = useState("");
  const [water, setWater] = useState("");
  const [note, setNote] = useState("");
  const [showExtra, setShowExtra] = useState(false);

  const entries = log ?? [];
  const latest = entries[0] ?? null;
  const prev = entries[1] ?? null;
  const delta = latest && prev ? Math.round((latest.weightKg - prev.weightKg) * 10) / 10 : null;
  const chart = [...entries]
    .reverse()
    .map((e) => ({ date: e.measuredAt, weight: e.weightKg }));

  function submit() {
    const w = num(weight);
    if (!w) return;
    logWeight.mutate(
      {
        weightKg: w,
        measuredAt: new Date(when).toISOString(),
        bodyFatPct: num(fat),
        muscleMassKg: num(muscle),
        bodyWaterPct: num(water),
        note: note.trim() || null,
      },
      {
        onSuccess: () => {
          setWeight("");
          setFat("");
          setMuscle("");
          setWater("");
          setNote("");
          setWhen(nowLocal());
        },
      }
    );
  }

  return (
    <div className="space-y-4">
      {/* Log form */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="text-sm font-medium">Log a weigh-in</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="bw">Weight (kg)</Label>
              <Input
                id="bw"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className="h-9"
                placeholder="82.5"
              />
            </div>
            <div className="col-span-2 space-y-1.5 sm:col-span-3">
              <Label htmlFor="bw-when">When</Label>
              <Input
                id="bw-when"
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowExtra((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${showExtra ? "rotate-180" : ""}`}
            />
            Body composition &amp; note
          </button>

          {showExtra ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="bw-fat">Body fat %</Label>
                <Input id="bw-fat" type="number" inputMode="decimal" step="0.1" value={fat} onChange={(e) => setFat(e.target.value)} className="h-9" placeholder="18" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bw-musc">Muscle (kg)</Label>
                <Input id="bw-musc" type="number" inputMode="decimal" step="0.1" value={muscle} onChange={(e) => setMuscle(e.target.value)} className="h-9" placeholder="35" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bw-water">Water %</Label>
                <Input id="bw-water" type="number" inputMode="decimal" step="0.1" value={water} onChange={(e) => setWater(e.target.value)} className="h-9" placeholder="55" />
              </div>
              <div className="col-span-2 space-y-1.5 sm:col-span-1">
                <Label htmlFor="bw-note">Note</Label>
                <Input id="bw-note" value={note} onChange={(e) => setNote(e.target.value)} className="h-9" placeholder="fasted" />
              </div>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button size="sm" onClick={submit} disabled={!num(weight) || logWeight.isPending}>
              Log weigh-in
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Latest + trend */}
      <Card>
        <CardContent className="space-y-3 p-4">
          {latest ? (
            <>
              <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Current</p>
                  <p className="flex items-baseline gap-2 text-2xl font-semibold tabular-nums">
                    {latest.weightKg}
                    <span className="text-sm font-normal text-muted-foreground">kg</span>
                    {delta != null && delta !== 0 ? (
                      <span
                        className={`flex items-center gap-0.5 text-xs font-medium ${
                          delta < 0 ? "text-emerald-500" : "text-amber-500"
                        }`}
                      >
                        {delta < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                        {Math.abs(delta)} kg
                      </span>
                    ) : delta === 0 ? (
                      <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(parseISO(latest.measuredAt), "EEE d MMM, h:mma")}
                  </p>
                </div>
                {latest.bodyFatPct != null ? <Stat label="Body fat" value={`${latest.bodyFatPct}%`} /> : null}
                {latest.muscleMassKg != null ? <Stat label="Muscle" value={`${latest.muscleMassKg} kg`} /> : null}
                {latest.bodyWaterPct != null ? <Stat label="Water" value={`${latest.bodyWaterPct}%`} /> : null}
              </div>

              {chart.length > 1 ? (
                <ChartContainer config={chartConfig} className="aspect-[4/1] w-full">
                  <AreaChart data={chart} margin={{ left: 4, right: 4, top: 4 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => format(parseISO(String(v)), "d MMM")}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={32}
                    />
                    <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(v) => format(parseISO(String(v)), "d MMM yyyy")}
                          formatter={(value) => `${value} kg`}
                        />
                      }
                    />
                    <Area
                      dataKey="weight"
                      type="monotone"
                      stroke="var(--color-weight)"
                      fill="var(--color-weight)"
                      fillOpacity={0.15}
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : null}
            </>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No weigh-ins yet. Log your first above — it feeds your gym strength benchmarks.
            </p>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {entries.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 text-xs text-muted-foreground backdrop-blur">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">When</th>
                    <th className="px-3 py-2 text-right font-medium">Weight</th>
                    <th className="px-3 py-2 text-right font-medium">Fat</th>
                    <th className="px-3 py-2 text-right font-medium">Muscle</th>
                    <th className="px-3 py-2 text-right font-medium">Water</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="px-3 py-2">{format(parseISO(e.measuredAt), "d MMM yy, h:mma")}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">{e.weightKg} kg</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{e.bodyFatPct != null ? `${e.bodyFatPct}%` : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{e.muscleMassKg != null ? `${e.muscleMassKg}` : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{e.bodyWaterPct != null ? `${e.bodyWaterPct}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
