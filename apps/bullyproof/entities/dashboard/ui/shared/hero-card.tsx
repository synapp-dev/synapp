import { Card, CardDescription } from "@workspace/ui/components/card";
import { CardHeader } from "@workspace/ui/components/card";
import { CardContent } from "@workspace/ui/components/card";
import Image from "next/image";
import { useMeStore } from "@/entities/me/model/store";

interface HeroCardProps {
  currentTime: Date;
  userTitle: string;
  defaultName?: string;
}

export function HeroCard({ currentTime, userTitle, defaultName = "User" }: HeroCardProps) {
  const currentUser = useMeStore((s) => s.currentUser);

  // Get user name
  const firstName = currentUser?.firstName || "";
  const lastName = currentUser?.lastName || "";
  const fullName =
    currentUser?.fullName ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    defaultName;
  const nameParts = fullName.split(" ");
  const displayFirstName = nameParts[0] || "";
  const displayLastName = nameParts.slice(1).join(" ") || "";
  const shouldBreakLine = (displayFirstName.length + displayLastName.length) > 12;

  return (
    <Card className="relative overflow-visible col-span-2 min-h-52 flex-shrink-0 flex flex-col justify-between">
      <CardHeader>
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
      <CardContent className="flex items-end gap-4">
        <div className="flex flex-col gap-0 items-start">
          <h1 className="text-3xl font-medium">
            <span className={shouldBreakLine ? "text-xl" : ""}>
              {displayFirstName}
            </span>
            {displayLastName && (
              <>
                {shouldBreakLine ? (
                  <>
                    <br />
                    <span className="font-black">{displayLastName}</span>
                  </>
                ) : (
                  <>
                    {" "}
                    <span className="font-black">{displayLastName}</span>
                  </>
                )}
              </>
            )}
          </h1>
          <h2 className="text-muted-foreground">{userTitle}</h2>
        </div>

        {/* Profile Image - positioned to ignore card padding and bleed above */}
        <div className="absolute bottom-0 right-4 w-48 h-full pointer-events-none">
          <div className="relative h-full w-full">
            <Image
              src="/images/bp-man/bp-man-thumbsup.svg"
              alt="BP-Man Thumbs Up"
              fill
              className="object-contain w-full h-full"
              priority
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
