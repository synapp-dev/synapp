import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Image from "next/image";
import { LoaderCircle } from "lucide-react";

export default function Page() {
  // Middleware handles redirects based on authentication status
  // This page will only render briefly if there's any delay in redirect
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <Image
          src="/images/bullyproof-logo.svg"
          alt="Bullyproof"
          width={100}
          height={100}
          className="mx-auto"
          priority
        />
        <CardHeader className="text-center">
          <CardTitle>Welcome!</CardTitle>
          <CardDescription>Redirecting...</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <LoaderCircle className="animate-spin h-5 w-5 mx-auto" />
        </CardContent>
      </Card>
    </div>
  );
}
