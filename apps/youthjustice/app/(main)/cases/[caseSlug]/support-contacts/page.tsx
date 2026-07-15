import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Building2, Mail, Phone, ShieldCheck, ShieldOff } from "lucide-react";

import { getDummyCaseBySlug } from "@/lib/dummy-cases";
import { getDummySupportContacts } from "@/lib/dummy-case-extras";
import { Badge } from "@workspace/ui/components/badge";
import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/avatar";
import { Card, CardContent } from "@workspace/ui/components/card";

type Props = {
  params: Promise<{ caseSlug: string }>;
};

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function SupportContactsPage({ params }: Props) {
  const { caseSlug } = await params;
  const c = getDummyCaseBySlug(caseSlug);
  if (!c) {
    notFound();
  }
  const contacts = getDummySupportContacts(caseSlug);

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Support contacts
        </h1>
        <p className="text-muted-foreground text-sm">
          The network around {c.displayName}, with consent-to-contact status
          (demo data).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {contacts.map((contact) => (
          <Card key={contact.id} className="gap-0 py-4">
            <CardContent className="flex items-start gap-3">
              <Avatar className="h-10 w-10 border">
                <AvatarFallback className="bg-muted text-xs font-semibold">
                  {initialsOf(contact.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{contact.name}</p>
                  {contact.consentToContact ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0 text-[10px] text-emerald-600 dark:text-emerald-400"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      Consent to contact
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="gap-1 border-amber-500/40 bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-600 dark:text-amber-400"
                    >
                      <ShieldOff className="h-3 w-3" />
                      Consent required
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{contact.role}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {contact.organisation}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {contact.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {contact.email}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {contact.lastContact
                    ? `Last contact ${format(contact.lastContact, "d MMM yyyy")}`
                    : "No contact recorded yet"}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
