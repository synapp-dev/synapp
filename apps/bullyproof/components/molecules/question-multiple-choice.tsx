"use client";

import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/radio-group";

interface QuestionMultipleChoiceProps {
  id: string;
  label: string;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  options: string[];
  allowMultiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function QuestionMultipleChoice({
  id,
  label,
  value,
  onChange,
  options,
  allowMultiple = false,
  required = false,
  disabled = false,
  className,
}: QuestionMultipleChoiceProps) {
  const inputId = `question-${id}`;
  const isArrayValue = Array.isArray(value);
  const selectedValues = isArrayValue ? value : value ? [value] : [];

  const handleSingleSelect = (optionValue: string) => {
    if (!disabled) {
      onChange(optionValue);
    }
  };

  const handleMultipleSelect = (optionValue: string) => {
    if (!disabled) {
      const currentValues = isArrayValue ? value : value ? [value] : [];
      const isSelected = currentValues.includes(optionValue);

      if (isSelected) {
        onChange(currentValues.filter((v) => v !== optionValue));
      } else {
        onChange([...currentValues, optionValue]);
      }
    }
  };

  if (allowMultiple) {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <div className="flex flex-col gap-3">
          {options.map((option, index) => {
            const optionId = `${inputId}-option-${index}`;
            const isChecked = selectedValues.includes(option);

            return (
              <div key={optionId} className="flex items-center gap-2">
                <Checkbox
                  id={optionId}
                  checked={isChecked}
                  onCheckedChange={() => handleMultipleSelect(option)}
                  disabled={disabled}
                  required={required && index === 0}
                />
                <Label
                  htmlFor={optionId}
                  className={cn(
                    "text-sm font-normal cursor-pointer",
                    disabled && "cursor-not-allowed opacity-60"
                  )}
                >
                  {option}
                </Label>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <RadioGroup
        value={isArrayValue ? "" : (value || "")}
        onValueChange={handleSingleSelect}
        disabled={disabled}
        required={required}
      >
        {options.map((option, index) => {
          const optionId = `${inputId}-option-${index}`;

          return (
            <div key={optionId} className="flex items-center gap-2">
              <RadioGroupItem value={option} id={optionId} />
              <Label
                htmlFor={optionId}
                className={cn(
                  "text-sm font-normal cursor-pointer",
                  disabled && "cursor-not-allowed opacity-60"
                )}
              >
                {option}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
