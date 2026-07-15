import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

interface MobileInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function MobileInput({ value, onChange }: MobileInputProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="mobile" className="text-xs text-muted-foreground pl-1">
        Mobile Number
      </Label>
      <Input
        id="mobile"
        type="tel"
        placeholder="+1 (555) 000-0000"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
