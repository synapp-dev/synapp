import {
  Card,
  CardTitle,
  CardHeader,
  CardContent,
} from "@workspace/ui/components/card";
import { Bot } from "lucide-react";

export function BotPreviewCard() {
  return (
    <Card className="h-full w-full min-h-38">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-4 h-4" />
          Bot
        </CardTitle>
      </CardHeader>
      <CardContent></CardContent>
    </Card>
  );
}
