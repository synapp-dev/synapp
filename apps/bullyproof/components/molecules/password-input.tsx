import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { useRouter } from "next/navigation";

interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  confirm?: boolean;
  showPassword: boolean;
  onToggleVisibility: () => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  resetURL?: string;
}

export function PasswordInput({
  value,
  onChange,
  confirm = false,
  showPassword,
  onToggleVisibility,
  onKeyPress,
  resetURL,
}: PasswordInputProps) {
  const router = useRouter();

  return (
    <div className="grid gap-2">
      <div className="flex items-center">
        <Label
          htmlFor={confirm ? "confirmPassword" : "password"}
          className="text-xs text-muted-foreground pl-1"
        >
          {confirm ? "Confirm Password" : "Password"}
        </Label>
        {resetURL && (
          <>
            <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full mt-0.5 mx-2" />
            <Button
              variant="link"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                router.push(resetURL);
              }}
              className="text-xs p-0 h-fit"
            >
              Forgot password?
            </Button>
          </>
        )}
      </div>
      <div className="relative">
        <Input
          id={confirm ? "confirmPassword" : "password"}
          type={showPassword ? "text" : "password"}
          required
          value={value}
          onChange={onChange}
          onKeyPress={onKeyPress}
          className="pr-10"
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
