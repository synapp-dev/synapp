"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Landmark, Upload } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

export function FinanceEmpty({
  message = "Import a bank statement to see your money here.",
}: {
  message?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Landmark className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">No transactions yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
      <Button asChild size="sm" className="mt-1">
        <Link href="/finance/accounts">
          <Upload className="h-4 w-4" />
          Import from Accounts
        </Link>
      </Button>
    </motion.div>
  );
}
