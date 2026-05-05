import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

type VitalsMetricCardsProps = {
  metrics: readonly string[];
};

export function VitalsMetricCards({ metrics }: VitalsMetricCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((title) => (
        <Card key={title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">{title}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-sm">Coming soon.</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
