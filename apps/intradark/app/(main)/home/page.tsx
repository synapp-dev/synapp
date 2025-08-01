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
import { useSteamAuth } from "@/hooks/use-steam-auth";
import { useSteamAuthStore } from "@/stores/steam-auth-store";

export default function Home() {
  // Steam authentication
  useSteamAuth();
  const { user, isAuthenticated, logout } = useSteamAuthStore();

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

      {/* Steam Authentication Status */}
      {isAuthenticated && user ? (
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {user.displayName}!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {user.avatar && (
                <img
                  src={user.avatar}
                  alt={user.displayName}
                  className="w-16 h-16 rounded-full"
                />
              )}
              <div>
                <p className="font-medium">{user.displayName}</p>
                <p className="text-sm text-muted-foreground">
                  Steam ID: {user.steamId}
                </p>
                {user.realName && (
                  <p className="text-sm text-muted-foreground">
                    Real Name: {user.realName}
                  </p>
                )}
                {user.timeCreated && (
                  <p className="text-sm text-muted-foreground">
                    Account Created:{" "}
                    {new Date(user.timeCreated * 1000).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <Button onClick={logout} variant="outline">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Not Authenticated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please sign in with Steam to access your profile.
            </p>
          </CardContent>
        </Card>
      )}

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
          <li>Steam authentication integration</li>
        </ul>
      </div>
    </div>
  );
}
