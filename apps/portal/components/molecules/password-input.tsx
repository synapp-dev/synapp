import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  forgot?: boolean;
  confirm?: boolean;
  showPassword: boolean;
  onToggleVisibility: () => void;
}

export function PasswordInput({
  value,
  onChange,
  forgot = false,
  confirm = false,
  showPassword,
  onToggleVisibility,
}: PasswordInputProps) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center">
        <Label
          htmlFor={confirm ? "confirmPassword" : "password"}
          className="text-xs text-muted-foreground pl-1"
        >
          {confirm ? "Confirm Password" : "Password"}
        </Label>
        {forgot && (
          <a
            href="#"
            className="ml-auto text-xs underline-offset-2 hover:underline"
          >
            Forgot your password?
          </a>
        )}
      </div>
      <div className="relative">
        <Input
          id={confirm ? "confirmPassword" : "password"}
          type={showPassword ? "text" : "password"}
          required
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {!showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
