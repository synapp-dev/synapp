"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // TODO: Implement your authentication check here
        // Example with Supabase:
        // const supabase = createBrowserClient();
        // const { data } = await supabase.auth.getUser();
        // if (data.user) {
        //   router.push("/home");
        // } else {
        //   router.push("/auth");
        // }
        // For now, redirect to home (you can change this to /auth when you implement auth)
        router.push("/dashboard");
      } catch (error) {
        console.error("Error checking authentication:", error);
        router.push("/auth");
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <Image
          src="/images/bullyproof-logo.svg"
          alt="Bullyproof"
          width={100}
          height={100}
          className="mx-auto"
        />
        <CardHeader className="text-center">
          <CardTitle>Welcome!</CardTitle>
          <CardDescription>
            Please wait while we check your authentication status.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <LoaderCircle className="animate-spin h-5 w-5 mx-auto" />
        </CardContent>
      </Card>
    </div>
  );
}
