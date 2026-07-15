import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";

interface NameInputProps {
  firstName: string;
  lastName: string;
  onFirstNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLastNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function NameInput({
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
}: NameInputProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="grid gap-2">
        <Label
          htmlFor="firstName"
          className="text-xs text-muted-foreground pl-1"
        >
          First Name
        </Label>
        <Input
          id="firstName"
          type="text"
          required
          value={firstName}
          onChange={onFirstNameChange}
        />
      </div>
      <div className="grid gap-2">
        <Label
          htmlFor="lastName"
          className="text-xs text-muted-foreground pl-1"
        >
          Last Name
        </Label>
        <Input
          id="lastName"
          type="text"
          required
          value={lastName}
          onChange={onLastNameChange}
        />
      </div>
    </div>
  );
}
