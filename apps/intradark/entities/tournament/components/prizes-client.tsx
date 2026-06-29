"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";

import type { PrizeRow } from "../lib/queries";

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json;
}

function placementLabel(low: number, high: number): string {
  if (low === high) {
    const s = ["th", "st", "nd", "rd"][((low % 100) - 20) % 10] ?? ["th", "st", "nd", "rd"][low] ?? "th";
    return `${low}${s}`;
  }
  return `${low}–${high}`;
}

export function PrizesClient({
  seasonId,
  prizes,
  canManage,
}: {
  seasonId: string;
  prizes: PrizeRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [place, setPlace] = useState("1");
  const [amount, setAmount] = useState("");

  function run(fn: () => Promise<unknown>, ok: string) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(ok);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      {prizes.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {prizes.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <span>
                <span className="font-semibold">{placementLabel(p.placementLow, p.placementHigh)}</span>{" "}
                <span>
                  {p.amount
                    ? `${p.currency ?? ""} ${Number(p.amount).toLocaleString()}`.trim()
                    : p.description ?? p.prizeType}
                </span>
                <Badge variant={p.payoutStatus === "paid" ? "default" : "outline"} className="ml-2">
                  {p.payoutStatus}
                </Badge>
              </span>
              {canManage && p.payoutStatus !== "paid" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => run(() => postJson(`/api/tournament/prizes/${p.id}/pay`), "Marked paid.")}
                >
                  Mark paid
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No prizes configured.</p>
      )}

      {canManage ? (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Placement</span>
            <Input
              className="w-20"
              type="number"
              min={1}
              value={place}
              onChange={(e) => setPlace(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Amount</span>
            <Input
              className="w-28"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500"
            />
          </div>
          <Button
            disabled={pending || !place}
            onClick={() => {
              const p = Number(place);
              run(
                () =>
                  postJson(`/api/tournament/seasons/${seasonId}/prizes`, {
                    placementLow: p,
                    placementHigh: p,
                    prizeType: "cash",
                    amount: amount ? Number(amount) : undefined,
                    currency: "AUD",
                  }),
                "Prize added.",
              );
              setAmount("");
            }}
          >
            Add prize
          </Button>
        </div>
      ) : null}
    </div>
  );
}
