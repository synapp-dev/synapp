import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Form } from "@workspace/ui/components/form";
import { cn } from "@workspace/ui/lib/utils";

export function FormCard() {
  return (
    <Card className="h-full gap-0">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <h1 className="text-xs font-bold text-muted-foreground">Form</h1>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 items-center justify-center">
        <div className="flex items-center justify-center gap-0.5 w-full h-full">
          {Array.from({ length: 3 }).map((_, index) => {
            return (
              <div
                key={index}
                className="flex items-center justify-center gap-0.5 bg-muted border border-border rounded-full p-1"
              >
                <p className="text-xs font-bold">W</p>
                {/* <p className="text-sm">Mirage</p> */}
                <p className="text-xs font-bold">IC</p>
                <p className="text-xs font-bold">13-11</p>
              </div>
            );
          })}
        </div>
        {/* <p className="text-xs text-muted-foreground">Form</p> */}
      </CardContent>
    </Card>
  );
}
