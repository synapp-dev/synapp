"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";
import { CATEGORIES, type Category } from "@/lib/finance/categorise";
import { merchantName, type FinanceTransaction } from "@/lib/finance/stats";
import { useSetCategory } from "@/hooks/finance/use-finance";
import { CATEGORY_META } from "@/components/finance/category-meta";

/** Small category badge that opens a picker to recategorise the transaction.
 *  "Remember" saves a rule matching the merchant so similar transactions
 *  follow along, now and on future imports. */
export function CategoryPicker({
  transaction,
  className,
}: {
  transaction: FinanceTransaction;
  className?: string;
}) {
  const setCategory = useSetCategory();
  const [remember, setRemember] = useState(true);
  const meta = CATEGORY_META[transaction.category];
  const merchant = merchantName(transaction.description);

  function choose(category: Category) {
    setCategory.mutate(
      {
        transactionId: transaction.id,
        category,
        savePattern: remember ? merchant : undefined,
      },
      {
        onSuccess: ({ updated }) => {
          toast.success(
            remember && updated > 1
              ? `Categorised ${updated} "${merchant}" transactions as ${CATEGORY_META[category].label}`
              : `Categorised as ${CATEGORY_META[category].label}`
          );
        },
        onError: (error) => toast.error(error.message),
      }
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted",
          className
        )}
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: meta.color }}
        />
        {meta.label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
          {merchant}
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={remember}
          onCheckedChange={(checked) => setRemember(checked === true)}
          onSelect={(event) => event.preventDefault()}
        >
          Remember for similar
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {CATEGORIES.map((category) => {
          const { label, icon: Icon, color } = CATEGORY_META[category];
          return (
            <DropdownMenuItem
              key={category}
              onSelect={() => choose(category)}
              className={cn(
                category === transaction.category && "bg-muted font-medium"
              )}
            >
              <Icon className="h-4 w-4" style={{ color }} />
              {label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
