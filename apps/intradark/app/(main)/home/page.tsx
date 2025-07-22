"use client";

import { useExampleStore } from "@/stores/example-store";
import {
  useExampleData,
  useCreateExampleData,
} from "@/hooks/example/use-example";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";

export default function Home() {
  // Example Zustand store usage
  const { count, increment, decrement, reset } = useExampleStore();

  // Example React Query usage
  const { data: exampleData, isLoading, isError, error } = useExampleData();
  const createMutation = useCreateExampleData();

  const handleCreateExample = () => {
    createMutation.mutate({ message: "New example data" });
  };

  if (isLoading) return <div>Loading example data...</div>;
  if (isError) return <div>Error: {error?.message}</div>;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Home</h1>

      <div className="text-sm text-muted-foreground">
        <p>
          This is a placeholder page, instantiated from the synapp monorepo. It
          contains the following:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Zustand stores for state management</li>
          <li>React Query for data fetching and mutations</li>
          <li>UI components from the workspace</li>
          <li>Basic layout structure</li>
        </ul>
      </div>
    </div>
  );
}
