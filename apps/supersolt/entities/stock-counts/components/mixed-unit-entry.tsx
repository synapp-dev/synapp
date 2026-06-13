"use client";

import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

type MixedUnitEntryProps = {
  unitsPerPack: number;
  packLabel: string;
  baseUnit: string;
  cartons: string;
  looseUnits: string;
  partialBaseUnits: string;
  onCartonsChange: (value: string) => void;
  onLooseUnitsChange: (value: string) => void;
  onPartialBaseUnitsChange: (value: string) => void;
};

export function MixedUnitEntry({
  unitsPerPack,
  packLabel,
  baseUnit,
  cartons,
  looseUnits,
  partialBaseUnits,
  onCartonsChange,
  onLooseUnitsChange,
  onPartialBaseUnitsChange,
}: MixedUnitEntryProps) {
  const cartonTotal = (Number(cartons) || 0) * unitsPerPack;
  const looseTotal = Number(looseUnits) || 0;
  const partialTotal = Number(partialBaseUnits) || 0;
  const total = cartonTotal + looseTotal + partialTotal;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="cartons">{packLabel}s</Label>
        <Input
          id="cartons"
          inputMode="decimal"
          placeholder="0"
          value={cartons}
          onChange={(e) => onCartonsChange(e.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          {unitsPerPack} {baseUnit} per {packLabel.toLowerCase()}
        </p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="loose-units">Loose {baseUnit}s</Label>
        <Input
          id="loose-units"
          inputMode="decimal"
          placeholder="0"
          value={looseUnits}
          onChange={(e) => onLooseUnitsChange(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="partial-units">Partial ({baseUnit})</Label>
        <Input
          id="partial-units"
          inputMode="decimal"
          placeholder="0"
          value={partialBaseUnits}
          onChange={(e) => onPartialBaseUnitsChange(e.target.value)}
        />
      </div>
      <p className="text-sm font-medium">
        Total: {Number.isFinite(total) ? total.toFixed(2) : "0"} {baseUnit}
      </p>
    </div>
  );
}
