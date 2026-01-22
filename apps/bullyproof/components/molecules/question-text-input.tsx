"use client";

import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";

interface QuestionTextInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
}

export function QuestionTextInput({
  id,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  multiline = false,
  placeholder,
  className,
}: QuestionTextInputProps) {
  const inputId = `question-${id}`;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={inputId} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {multiline ? (
        <Textarea
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          rows={4}
          className="resize-none"
          required={required}
        />
      ) : (
        <Input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
        />
      )}
    </div>
  );
}
