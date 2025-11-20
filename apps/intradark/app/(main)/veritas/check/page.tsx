"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export default function CheckPage() {
  const [id, setId] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (id.trim()) {
      router.push(`/veritas/check/${id.trim()}`);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Check Player</CardTitle>
          <CardDescription>
            Enter a player ID to view their profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="playerId">Player ID</Label>
              <Input
                id="playerId"
                type="text"
                placeholder="Enter player ID"
                value={id}
                onChange={(e) => setId(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
