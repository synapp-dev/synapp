import { SnapshotCardWithData } from "@/entities/dashboard/ui/admin/cards/snapshot-card-with-data";
import { StaggeredAnimation } from "@/components/atoms/staggered-animation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Link from "next/link";
import { Book, FileText, Newspaper, Shield, Users, Zap } from "lucide-react";
import { Separator } from "@workspace/ui/components/separator";
import Image from "next/image";
import { cn } from "@workspace/ui/lib/utils";

function QuickActionsCard({
  title,
  icon,
  link,
  disabled,
}: {
  title: string;
  icon: React.ReactNode;
  link: string;
  disabled?: boolean;
}) {
  const words = title.split(" ");
  const firstWord = words[0] || "";
  const secondWord = words.slice(1).join(" ");

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow cursor-pointer p-0 flex-1 flex",
        disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""
      )}
    >
      <Link
        href={disabled ? "#" : link}
        className="w-full h-full flex items-center gap-1 p-2"
      >
        <div className="p-1 rounded flex-shrink-0">{icon}</div>
        <span className="text-sm">
          <span className="font-light">{firstWord}</span>
          {secondWord && (
            <>
              {" "}
              <span className="font-medium">{secondWord}</span>
            </>
          )}
        </span>
      </Link>
    </Card>
  );
}

export function OverviewSection() {
  return (
    <div className="space-y-6 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      <div className="col-span-1 flex gap-4 h-full items-center">
        <div className="h-fit flex flex-col items-center justify-center w-full max-w-[30%]">
          <div className="flex-1 flex flex-col gap-2 w-full justify-center ">
            <QuickActionsCard
              title="Invite School"
              icon={<Users className="w-4 h-4" />}
              link="/admin/schools?modal=add-new-school"
            />
            <QuickActionsCard
              title="Edit Curriculum"
              icon={<Book className="w-4 h-4" />}
              link="/admin/content/curriculum"
            />
            <QuickActionsCard
              title="Edit Certification"
              icon={<Shield className="w-4 h-4" />}
              link="/admin/content/certification"
            />
            <QuickActionsCard
              title="Manage Users"
              icon={<Users className="w-4 h-4" />}
              link="/admin/users"
            />
            <QuickActionsCard
              disabled
              title="Generate Reports"
              icon={<FileText className="w-4 h-4" />}
              link="/admin/generate-reports"
            />
          </div>
        </div>
        <div className="h-full flex items-center justify-center py-12">
          <Separator orientation="vertical" className="h-full w-fit mx-4" />
        </div>

        {/* News and Updates Card */}
        <Card className="flex-1 w-full h-full flex flex-col relative justify-end items-start overflow-hidden">
          <div className="absolute inset-0 z-10 w-full h-full rounded-lg overflow-hidden">
            <div
              className="w-full h-full"
              style={{
                maskImage:
                  "linear-gradient(to bottom, black 0%, black 30%, rgba(0,0,0,0.8) 45%, rgba(0,0,0,0.4) 60%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, black 0%, black 30%, rgba(0,0,0,0.8) 45%, rgba(0,0,0,0.4) 60%, transparent 100%)",
              }}
            >
              <Image
                src="https://i.imgur.com/JWNLGSJ.png"
                alt="No news updates available"
                width={1200}
                height={600}
                className="w-full h-full object-cover object-top rounded-lg"
              />
            </div>
            {/* Gradient overlay - ensures bottom 25% is fully white/transparent */}
            <div
              className="absolute inset-0 rounded-lg pointer-events-none"
              style={{
                background:
                  "linear-gradient(to bottom, transparent 0%, transparent 30%, rgba(255,255,255,0.2) 45%, rgba(255,255,255,0.5) 60%, hsl(var(--card)) 100%)",
              }}
            />
          </div>
          <CardFooter className="z-20">
            <CardTitle className="text-2xl font-normal">
              <span className="font-bold">Mazenod College</span> joins
              Bullyproof Australia!
            </CardTitle>
          </CardFooter>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {/* Total Schools Card */}
        <StaggeredAnimation index={0}>
          <SnapshotCardWithData
            link="/admin/schools"
            metricKey="schools"
            title="Total Schools"
            icon="School"
            subtitle="Schools actively using platform"
            scope="all"
          />
        </StaggeredAnimation>

        {/* Active Teachers Card */}
        <StaggeredAnimation index={1}>
          <SnapshotCardWithData
            metricKey="teachers"
            title="Active Teachers"
            icon="Users"
            subtitle="Teachers engaged this term"
            scope="all"
          />
        </StaggeredAnimation>
        {/* Engagement Rate Card */}
        <StaggeredAnimation index={2}>
          <SnapshotCardWithData
            metricKey="lessons/engagement-rate"
            title="Engagement Rate"
            icon="Activity"
            subtitle="Teachers active in last 30 days"
            scope="all"
          />
        </StaggeredAnimation>
        {/* Completed Lessons Card */}
        <StaggeredAnimation index={3}>
          <SnapshotCardWithData
            metricKey="lessons/completed"
            title="Completed Lessons"
            icon="BookOpen"
            subtitle="Lessons completed this term"
            scope="all"
          />
        </StaggeredAnimation>
      </div>
    </div>
  );
}
