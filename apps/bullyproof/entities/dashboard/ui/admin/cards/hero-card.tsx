import {
  TrendingUp,
  TrendingDown,
  School,
  Users,
  Activity,
  BookOpen,
  LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import CountUp from "react-countup";

interface SnapshotCardProps {
  title: string;
  icon: string;
  value: {
    amount: number;
    type: "number" | "percentage";
  };
  previousValue: {
    amount: number;
    type: "number" | "percentage";
  };
  subtitle: string;
}

export function SnapshotCard({
  title,
  icon,
  value,
  previousValue,
  subtitle,
}: SnapshotCardProps) {
  // Calculate trend
  const trendPercentage =
    ((value.amount - previousValue.amount) / previousValue.amount) * 100;
  const trendDirection = value.amount > previousValue.amount ? "up" : "down";
  const trendPercentageFormatted = `${trendDirection === "up" ? "+" : ""}${trendPercentage.toFixed(1)}%`;

  const TrendIcon = trendDirection === "up" ? TrendingUp : TrendingDown;
  const trendColor =
    trendDirection === "up" ? "text-green-600" : "text-red-600";
  const trendBgColor = trendDirection === "up" ? "bg-green-50" : "bg-red-50";
  const trendBorderColor =
    trendDirection === "up" ? "border-green-200" : "border-red-200";

  // Icon mapping
  const iconMap: Record<string, LucideIcon> = {
    School,
    Users,
    Activity,
    BookOpen,
  };

  const IconComponent = iconMap[icon] || School;

  return (
    <Card className="relative">
      <CardHeader className="">
        <CardTitle className="text-sm font-medium text-muted-foreground flex flex-row justify-between">
          <div className="flex items-center gap-1">
            {/* Lucide Icon */}
            <IconComponent className="h-3 w-3" />
            <h2 className="text-sm font-medium text-muted-foreground">
              {title}
            </h2>
          </div>
          <div
            className={`inline-flex items-center gap-1 rounded-md border px-1 text-xs ${trendBgColor} ${trendBorderColor}`}
          >
            <TrendIcon className="h-3 w-3" />
            <span className="font-medium">{trendPercentageFormatted}</span>
          </div>
        </CardTitle>
        <div className="flex items-center justify-between">
          <div className="text-5xl font-bold text-primary/80">
            <CountUp start={0} end={value.amount} duration={2} />
            {value.type === "percentage" && "%"}
          </div>
        </div>
      </CardHeader>
      <CardFooter className="flex flex-col items-start">
        <div className="flex gap-1 text-sm items-center justify-center">
          <TrendIcon className={`h-3 w-3 ${trendColor}`} />
          <span className="font-medium">
            {trendDirection === "up"
              ? "Trending up this period"
              : "Trending down this period"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardFooter>
    </Card>
  );
}
