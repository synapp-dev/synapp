"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useInvoiceSheetUrl() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const invoiceId = searchParams.get("id");

  const openInvoice = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("id", id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const closeInvoice = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return { invoiceId, openInvoice, closeInvoice };
}
