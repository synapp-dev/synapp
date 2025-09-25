import { AuthForm } from "@/components/organisms/auth-form";
import { Suspense } from "react";

export default function AuthPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <Suspense fallback={<></>}>
          <AuthForm />
        </Suspense>
      </div>
    </div>
  );
}
