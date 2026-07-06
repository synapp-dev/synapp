"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardFooter,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import {
  GraduationCap,
  Image,
  Key,
  Mail,
  MapPin,
  Shield,
  UserCircle,
  UserPlus,
} from "lucide-react";
import { useSchoolDetail } from "../school-detail-context";

export function SchoolOnboardingPanel() {
  const {
    school,
    handleTabChange,
    classesDialogIntentRef,
  } = useSchoolDetail();
  const router = useRouter();
  const searchParams = useSearchParams();

  const pushSchoolTab = (tab: string, dialog?: string) => {
    if (!school.slug) return;
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("school", school.slug);
    params.set("tab", tab);
    if (dialog) {
      params.set("dialog", dialog);
    } else {
      params.delete("dialog");
    }
    router.push(`/admin/schools?${params.toString()}`, { scroll: false });
  };

  const essentialSteps = [
    {
      id: "add-licence",
      title: "Add School Licence",
      description: school.activeLicence
        ? "Active school licence exists"
        : "No active school licence has been added yet",
      icon: Key,
      completed: school.activeLicence,
      onActivate: () => {
        handleTabChange("license");
        pushSchoolTab(
          "license",
          school.activeLicence ? undefined : "ADD-school-licence"
        );
      },
    },
    {
      id: "add-admin",
      title: "Add School Admin",
      description:
        school.schoolAdminCount > 0
          ? "School admin has been added"
          : "No school admin has been added yet",
      icon: Shield,
      completed: school.schoolAdminCount > 0,
      onActivate: () => {
        handleTabChange("users");
        pushSchoolTab("users", "add-school-admin");
      },
    },
    {
      id: "add-teachers",
      title: "Add Staff and AP Teachers",
      description:
        school.teacherCount > 0
          ? "Staff and AP teachers have been added"
          : "No staff or AP teachers have been added yet",
      icon: UserPlus,
      completed: school.teacherCount > 0,
      onActivate: () => {
        handleTabChange("users");
        pushSchoolTab("users", "add-teacher");
      },
    },
    {
      id: "add-classes",
      title: "Add Classes",
      description:
        school.classCount > 0
          ? "Classes have been added"
          : "No classes have been added yet",
      icon: GraduationCap,
      completed: school.classCount > 0,
      onActivate: () => {
        handleTabChange("classes");
        classesDialogIntentRef.current = true;
        pushSchoolTab("classes", "add-class");
      },
    },
  ];

  let previousCompleted = true;

  const optionalSteps = [
    {
      id: "add-email-domain",
      title: "Add Email Domain",
      description: (school as { emailDomain?: string | null }).emailDomain
        ? `Email domain: ${(school as { emailDomain?: string | null }).emailDomain}`
        : "No email domain has been added yet",
      icon: Mail,
      completed: !!(school as { emailDomain?: string | null }).emailDomain,
    },
    {
      id: "add-address",
      title: "Add Address",
      description: (school as { address?: string | null }).address
        ? `Address: ${(school as { address?: string | null }).address}`
        : "No address has been added yet",
      icon: MapPin,
      completed: !!(school as { address?: string | null }).address,
    },
    {
      id: "add-banner",
      title: "Add Banner",
      description: (school as { bannerUrl?: string | null }).bannerUrl
        ? "Banner image has been added"
        : "No banner image has been added yet",
      icon: Image,
      completed: !!(school as { bannerUrl?: string | null }).bannerUrl,
    },
    {
      id: "add-avatar",
      title: "Add Avatar",
      description: (school as { avatarUrl?: string | null }).avatarUrl
        ? "Avatar image has been added"
        : "No avatar image has been added yet",
      icon: UserCircle,
      completed: !!(school as { avatarUrl?: string | null }).avatarUrl,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground">Essential</h4>
        <div className="grid grid-cols-4 gap-4">
          {essentialSteps.map((item) => {
            const Icon = item.icon;
            const isCompleted = item.completed;
            const isAvailable = previousCompleted;
            const isDisabled = !isAvailable;

            if (isCompleted) {
              previousCompleted = true;
            } else {
              previousCompleted = false;
            }

            return (
              <Card
                key={item.id}
                className={`transition-all relative h-fit p-0 ${
                  isCompleted
                    ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                    : isAvailable
                      ? "hover:bg-muted/30 border-border"
                      : "bg-muted/30 opacity-60 border-muted"
                } ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                onClick={() => {
                  if (!isDisabled) item.onActivate();
                }}
              >
                <CardContent className="p-4 pb-3 flex flex-col items-center">
                  <div className="flex items-center justify-center mb-3">
                    <Icon
                      className={`h-12 w-12 ${
                        isCompleted
                          ? "text-green-600"
                          : isAvailable
                            ? "text-muted-foreground"
                            : "text-muted-foreground/50"
                      }`}
                    />
                  </div>
                  <h3
                    className={`text-sm font-semibold text-center mb-1 ${
                      isCompleted
                        ? "text-green-700 dark:text-green-400"
                        : isAvailable
                          ? ""
                          : "text-muted-foreground"
                    }`}
                  >
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground text-center line-clamp-2">
                    {item.description}
                  </p>
                </CardContent>
                {isCompleted && (
                  <CardFooter className="px-4 py-2 bg-muted border-t-0 rounded-b-xl">
                    <span className="text-xs font-medium text-green-700 dark:text-green-400 w-full text-center">
                      Completed
                    </span>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground">(Optional)</h4>
        <div className="grid grid-cols-4 gap-4">
          {optionalSteps.map((item) => {
            const Icon = item.icon;
            const isCompleted = item.completed;

            return (
              <Card
                key={item.id}
                className={`transition-all relative h-fit ${
                  isCompleted
                    ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                    : "hover:bg-muted/30 border-border"
                } cursor-pointer`}
                onClick={() => handleTabChange("details")}
              >
                <CardContent className="p-4 pb-3 flex flex-col items-center">
                  <div className="flex items-center justify-center mb-3">
                    <Icon
                      className={`h-12 w-12 ${
                        isCompleted
                          ? "text-green-600"
                          : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <h3
                    className={`text-sm font-semibold text-center mb-1 ${
                      isCompleted ? "text-green-700 dark:text-green-400" : ""
                    }`}
                  >
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground text-center line-clamp-2">
                    {item.description}
                  </p>
                </CardContent>
                {isCompleted && (
                  <CardFooter className="p-3 bg-muted/50 border-t-0 rounded-b-xl">
                    <span className="text-xs font-medium text-green-700 dark:text-green-400 w-full text-center">
                      Completed
                    </span>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
