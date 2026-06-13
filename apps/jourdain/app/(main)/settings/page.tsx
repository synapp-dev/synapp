"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { NotificationsCard } from "@/components/organisms/notifications-card";

export default function Settings() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <NotificationsCard />

      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Enter your name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="Enter your email" />
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
