"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";

import { useCreateRequest } from "@/hooks/requests/use-requests";
import { RequestFormShell } from "./form-shell";

type Category = "bank" | "personal";

export function ChangeOfDetailsForm() {
  const router = useRouter();
  const create = useCreateRequest();

  const [categories, setCategories] = React.useState<Category[]>([]);
  const [bank, setBank] = React.useState({
    institution: "",
    bsb: "",
    accountNumber: "",
    accountName: "",
  });
  const [personal, setPersonal] = React.useState({
    phone: "",
    email: "",
    address: "",
  });

  const toggle = (c: Category) =>
    setCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (categories.length === 0) {
      toast.error("Choose at least one thing to change");
      return;
    }
    const parts: string[] = [];
    if (categories.includes("bank")) parts.push("bank");
    if (categories.includes("personal")) parts.push("personal");

    try {
      const detail = await create.mutateAsync({
        kind: "change_of_details",
        title: `Update ${parts.join(" & ")} details`,
        payload: {
          categories,
          ...(categories.includes("bank") ? { bank } : {}),
          ...(categories.includes("personal") ? { personal } : {}),
        },
      });
      toast.success("Change submitted — HR will verify your identity");
      router.push(`/requests/${detail.id}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <RequestFormShell kind="change_of_details">
      <form className="space-y-5" onSubmit={submit}>
        <div className="rounded-md bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          For your protection, HR / Payroll will call you to verify 3 forms of
          ID before any change is applied.
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">What would you like to change?</p>
          <label className="flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm">
            <Checkbox
              checked={categories.includes("bank")}
              onCheckedChange={() => toggle("bank")}
            />
            Bank details
          </label>
          <label className="flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm">
            <Checkbox
              checked={categories.includes("personal")}
              onCheckedChange={() => toggle("personal")}
            />
            Personal details (contact, email, address)
          </label>
        </div>

        {categories.includes("bank") ? (
          <div className="space-y-3">
            <Separator />
            <p className="text-sm font-semibold">Bank details</p>
            <div className="space-y-1.5">
              <Label htmlFor="inst">Banking institution</Label>
              <Input
                id="inst"
                value={bank.institution}
                onChange={(e) =>
                  setBank({ ...bank, institution: e.target.value })
                }
                placeholder="e.g. Westpac"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bsb">BSB</Label>
                <Input
                  id="bsb"
                  value={bank.bsb}
                  onChange={(e) => setBank({ ...bank, bsb: e.target.value })}
                  placeholder="000-000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acct">Account number</Label>
                <Input
                  id="acct"
                  value={bank.accountNumber}
                  onChange={(e) =>
                    setBank({ ...bank, accountNumber: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="an">Name on account</Label>
              <Input
                id="an"
                value={bank.accountName}
                onChange={(e) =>
                  setBank({ ...bank, accountName: e.target.value })
                }
              />
            </div>
          </div>
        ) : null}

        {categories.includes("personal") ? (
          <div className="space-y-3">
            <Separator />
            <p className="text-sm font-semibold">Personal details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Contact number</Label>
                <Input
                  id="phone"
                  value={personal.phone}
                  onChange={(e) =>
                    setPersonal({ ...personal, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={personal.email}
                  onChange={(e) =>
                    setPersonal({ ...personal, email: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addr">Address</Label>
              <Input
                id="addr"
                value={personal.address}
                onChange={(e) =>
                  setPersonal({ ...personal, address: e.target.value })
                }
                placeholder="Street, suburb, state, postcode"
              />
            </div>
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={create.isPending}
          className="w-full bg-orange-500 text-white hover:bg-orange-600"
        >
          {create.isPending ? "Submitting…" : "Submit change request"}
        </Button>
      </form>
    </RequestFormShell>
  );
}
