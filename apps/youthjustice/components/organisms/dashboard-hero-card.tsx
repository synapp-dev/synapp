"use client";

import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { useMeStore } from "@/entities/me/model/store";

interface DashboardHeroCardProps {
  currentTime: Date;
}

export function DashboardHeroCard({ currentTime }: DashboardHeroCardProps) {
  const currentUser = useMeStore((s) => s.currentUser);

  const rawName =
    currentUser?.fullName?.trim() ||
    currentUser?.email?.split("@")[0]?.trim() ||
    "there";
  const nameParts = rawName.split(/\s+/).filter(Boolean);
  const displayFirstName = nameParts[0] ?? "";
  const displayLastName = nameParts.slice(1).join(" ");
  const shouldBreakLine = displayFirstName.length + displayLastName.length > 14;

  const initials =
    `${displayFirstName.charAt(0)}${displayLastName.charAt(0) || displayFirstName.charAt(1) || "?"}`.toUpperCase();

  return (
    <Card className="relative col-span-2 flex min-h-[13rem] flex-shrink-0 flex-col justify-between overflow-visible gap-3 py-4 md:min-h-52 md:gap-4 md:py-5">
      {/* Full-height portrait on the right: bottom flush with card, top overlaps card edge */}
      <div
        className="pointer-events-none absolute right-0 top-[-1rem] bottom-0 z-0 w-[36%] min-w-[7.25rem] max-w-[12.5rem] overflow-hidden rounded-l-xl sm:top-[-1.125rem] sm:w-[38%] sm:min-w-[8.5rem] sm:max-w-[14rem] md:top-[-1.25rem] md:max-w-[16rem]"
        aria-hidden
      >
        {currentUser?.avatarUrl ? (
          <Avatar className="size-full rounded-none ring-0">
            <AvatarImage
              src={currentUser.avatarUrl}
              alt=""
              className="object-cover object-top"
            />
            <AvatarFallback className="rounded-none text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="relative size-full">
            <Image
              src="/images/user/staff-photo-aaron-girton.png"
              alt=""
              fill
              className="object-cover object-top"
              sizes="(max-width: 640px) 160px, (max-width: 1024px) 220px, 280px"
              priority
            />
          </div>
        )}
      </div>

      <CardHeader className="relative z-10 shrink-0 pb-0 pr-[40%] pt-0 sm:pr-[42%]">
        <CardDescription>
          <div>
            {currentTime.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          <div>
            {currentTime.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="relative z-10 flex min-h-0 flex-1 flex-col justify-end overflow-visible pb-0 pr-[40%] pt-0 sm:pr-[42%]">
        <div className="flex min-w-0 flex-col items-start gap-1">
          <h1 className="text-3xl sm:text-4xl">
            <span
              className={`font-light ${shouldBreakLine ? "text-2xl sm:text-3xl" : ""}`}
            >
              {displayFirstName}
            </span>
            {displayLastName ? (
              shouldBreakLine ? (
                <>
                  <br />
                  <span className="font-bold">{displayLastName}</span>
                </>
              ) : (
                <>
                  {" "}
                  <span className="font-bold">{displayLastName}</span>
                </>
              )
            ) : null}
          </h1>
          <div className="flex flex-col -space-y-0.5">
            <p className="text-sm font-semibold capitalize text-muted-foreground sm:text-base">
              Youth Justice Case Manager
            </p>
            <p className="text-xs capitalize text-muted-foreground sm:text-sm">
              South East Metro
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
