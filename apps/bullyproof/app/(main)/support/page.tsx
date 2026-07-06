import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Mail } from "lucide-react";
import { SUPPORT_MAILTO } from "@/lib/support";

export default function SupportPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            If you need assistance, our support team is here to help. Please
            contact us via email and we will respond as soon as possible.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <a href={SUPPORT_MAILTO}>
              <Mail className="mr-2 h-4 w-4" />
              Email Support
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
