"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs";
import { formatDate } from "./utils";
import type { UserWithRolesAndSchools } from "@/entities/me/api/endpoints";
import type { HistorySubTabType } from "./types";

interface UserHistoryTabProps {
  user: UserWithRolesAndSchools | null;
  historySubTab: HistorySubTabType;
  onHistorySubTabChange: (subTab: HistorySubTabType) => void;
  updateLogUsers: Record<
    string,
    {
      firstName: string | null;
      lastName: string | null;
      email: string;
    } | null
  >;
}

export function UserHistoryTab({
  user,
  historySubTab,
  onHistorySubTabChange,
  updateLogUsers,
}: UserHistoryTabProps) {
  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={historySubTab}
          onValueChange={(value) =>
            onHistorySubTabChange(value as HistorySubTabType)
          }
        >
          <TabsList className="mb-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-0">
            {user.metadata?.updateLogs &&
            Array.isArray(user.metadata.updateLogs) &&
            user.metadata.updateLogs.filter(
              (log: any) =>
                log.type === "update" &&
                log.changes &&
                log.changes.length > 0
            ).length > 0 ? (
              <div className="space-y-4">
                {user.metadata.updateLogs
                  .filter(
                    (log: any) =>
                      log.type === "update" &&
                      log.changes &&
                      log.changes.length > 0
                  )
                  .sort(
                    (a: any, b: any) =>
                      new Date(b.updatedAt).getTime() -
                      new Date(a.updatedAt).getTime()
                  )
                  .map((log: any, idx: number) => (
                    <div
                      key={idx}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {formatDate(log.updatedAt)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {log.updatedBy && updateLogUsers[log.updatedBy]
                            ? (() => {
                                const updater =
                                  updateLogUsers[log.updatedBy]!;
                                const fullName = [
                                  updater.firstName,
                                  updater.lastName,
                                ]
                                  .filter(Boolean)
                                  .join(" ");
                                return (
                                  fullName ||
                                  updater.email ||
                                  log.updatedBy
                                );
                              })()
                            : log.updatedBy || "Unknown"}
                          {log.updatedBy &&
                            updateLogUsers[log.updatedBy] && (
                              <span className="ml-1 text-muted-foreground/70">
                                (
                                {updateLogUsers[log.updatedBy]!.email})
                              </span>
                            )}
                        </div>
                      </div>
                      <div className="space-y-1 pl-2 border-l-2 border-muted">
                        {log.changes.map(
                          (change: any, changeIdx: number) => (
                            <div
                              key={changeIdx}
                              className="text-sm"
                            >
                              <span className="font-medium capitalize">
                                {change.field === "firstName"
                                  ? "First Name"
                                  : change.field === "lastName"
                                    ? "Last Name"
                                    : change.field}
                              </span>
                              :{" "}
                              <span className="text-destructive line-through">
                                {change.oldValue || "(empty)"}
                              </span>
                              {" → "}
                              <span className="text-green-600 dark:text-green-400">
                                {change.newValue || "(empty)"}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No details history available
              </p>
            )}
          </TabsContent>

          <TabsContent value="roles" className="mt-0">
            {user.metadata?.roleLogs &&
            Array.isArray(user.metadata.roleLogs) &&
            user.metadata.roleLogs.length > 0 ? (
              <div className="space-y-4">
                {user.metadata.roleLogs
                  .sort(
                    (a: any, b: any) =>
                      new Date(b.updatedAt).getTime() -
                      new Date(a.updatedAt).getTime()
                  )
                  .map((log: any, idx: number) => (
                    <div
                      key={idx}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {formatDate(log.updatedAt)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {log.updatedBy && updateLogUsers[log.updatedBy]
                            ? (() => {
                                const updater =
                                  updateLogUsers[log.updatedBy]!;
                                const fullName = [
                                  updater.firstName,
                                  updater.lastName,
                                ]
                                  .filter(Boolean)
                                  .join(" ");
                                return (
                                  fullName ||
                                  updater.email ||
                                  log.updatedBy
                                );
                              })()
                            : log.updatedBy || "Unknown"}
                          {log.updatedBy &&
                            updateLogUsers[log.updatedBy] && (
                              <span className="ml-1 text-muted-foreground/70">
                                (
                                {updateLogUsers[log.updatedBy]!.email})
                              </span>
                            )}
                        </div>
                      </div>
                      <div className="text-sm">
                        <span
                          className={
                            log.action === "assigned"
                              ? "text-green-600 dark:text-green-400"
                              : "text-destructive"
                          }
                        >
                          {log.action === "assigned"
                            ? "Assigned"
                            : "Removed"}
                        </span>{" "}
                        <span className="font-medium">
                          {log.roleName}
                        </span>
                        {log.schoolName && (
                          <span className="text-muted-foreground">
                            {" "}
                            at {log.schoolName}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No roles history available
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
