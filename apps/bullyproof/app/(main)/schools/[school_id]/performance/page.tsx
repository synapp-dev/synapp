import { Card, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";

export default function PerformancePage({ params }: { params: { school_id: string } }) {
  const { school_id } = params;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Performance</CardTitle>
          <CardDescription>School: {school_id}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}


