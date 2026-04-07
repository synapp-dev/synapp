import { Suspense } from "react";
import { AuthForm } from "@/components/organisms/auth-form";

export default function AuthPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <Suspense fallback={<></>}>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
