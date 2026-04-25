import { notFound } from "next/navigation";

import { getDummyCaseBySlug } from "@/lib/dummy-cases";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

type Props = {
  params: Promise<{ caseSlug: string }>;
};

const dummyContacts = [
  { name: "Legal Aid Victoria", role: "Legal", phone: "1300 792 387" },
  { name: "Child FIRST", role: "Family support", phone: "1300 721 283" },
  { name: "Assigned clinician", role: "Health", phone: "03 0000 0000" },
];

export default async function SupportContactsPage({ params }: Props) {
  const { caseSlug } = await params;
  const c = getDummyCaseBySlug(caseSlug);
  if (!c) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Support contacts</h1>
        <p className="text-muted-foreground text-sm">
          Shared contacts for {c.displayName} (fictional numbers for demo).
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
          <CardDescription>
            Workers can update contacts; young people could view read-only in a full app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dummyContacts.map((row) => (
                <TableRow key={row.name}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell>{row.phone}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
