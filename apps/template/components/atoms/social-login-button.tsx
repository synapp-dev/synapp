import { Button } from "@workspace/ui/components/button";
import { ReactNode } from "react";

interface SocialLoginButtonProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}

export function SocialLoginButton({
  icon,
  label,
  onClick,
}: SocialLoginButtonProps) {
  return (
    <Button
      variant="outline"
      type="button"
      className="w-full"
      onClick={onClick}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </Button>
  );
}
