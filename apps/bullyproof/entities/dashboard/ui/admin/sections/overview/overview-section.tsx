import { SnapshotCard } from "@/entities/dashboard/ui/admin/cards/hero-card";

import dummyData from "@/entities/dashboard/ui/admin/dummy-data/snapshot-card-dummy-data.json";
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

function QuickActionsCard({
  title,
  icon,
  link,
}: {
  title: string;
  icon: React.ReactNode;
  link: string;
}) {
  const words = title.split(" ");
  const firstWord = words[0] || "";
  const secondWord = words.slice(1).join(" ");

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer p-0 flex-1 flex">
      <Link href={link} className="w-full h-full flex items-center gap-1 p-2">
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
  const { metrics } = dummyData;
  return (
    <div className="space-y-6 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      <div className="col-span-1 flex gap-4 h-full items-center">
        <div className="h-fit flex flex-col items-center justify-center w-full max-w-[30%]">
          <div className="flex-1 flex flex-col gap-2 w-full justify-center ">
            <QuickActionsCard
              title="Invite School"
              icon={<Users className="w-4 h-4" />}
              link="/admin/invite-school"
            />
            <QuickActionsCard
              title="Edit Curriculum"
              icon={<Book className="w-4 h-4" />}
              link="/admin/edit-curriculum"
            />
            <QuickActionsCard
              title="Edit Certification"
              icon={<Shield className="w-4 h-4" />}
              link="/admin/edit-certification"
            />
            <QuickActionsCard
              title="Manage Users"
              icon={<Users className="w-4 h-4" />}
              link="/admin/manage-users"
            />
            <QuickActionsCard
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
          <SnapshotCard
            title={metrics.totalSchools.title}
            icon={metrics.totalSchools.icon}
            value={
              metrics.totalSchools.value as {
                amount: number;
                type: "number" | "percentage";
              }
            }
            previousValue={
              metrics.totalSchools.previousValue as {
                amount: number;
                type: "number" | "percentage";
              }
            }
            subtitle={metrics.totalSchools.subtitle}
          />
        </StaggeredAnimation>

        {/* Active Teachers Card */}
        <StaggeredAnimation index={1}>
          <SnapshotCard
            title={metrics.activeTeachers.title}
            icon={metrics.activeTeachers.icon}
            value={
              metrics.activeTeachers.value as {
                amount: number;
                type: "number" | "percentage";
              }
            }
            previousValue={
              metrics.activeTeachers.previousValue as {
                amount: number;
                type: "number" | "percentage";
              }
            }
            subtitle={metrics.activeTeachers.subtitle}
          />
        </StaggeredAnimation>
        {/* Engagement Rate Card */}
        <StaggeredAnimation index={2}>
          <SnapshotCard
            title={metrics.engagementRate.title}
            icon={metrics.engagementRate.icon}
            value={
              metrics.engagementRate.value as {
                amount: number;
                type: "number" | "percentage";
              }
            }
            previousValue={
              metrics.engagementRate.previousValue as {
                amount: number;
                type: "number" | "percentage";
              }
            }
            subtitle={metrics.engagementRate.subtitle}
          />
        </StaggeredAnimation>
        {/* Completed Lessons Card */}
        <StaggeredAnimation index={3}>
          <SnapshotCard
            title={metrics.completedLessons.title}
            icon={metrics.completedLessons.icon}
            value={
              metrics.completedLessons.value as {
                amount: number;
                type: "number" | "percentage";
              }
            }
            previousValue={
              metrics.completedLessons.previousValue as {
                amount: number;
                type: "number" | "percentage";
              }
            }
            subtitle={metrics.completedLessons.subtitle}
          />
        </StaggeredAnimation>
      </div>
    </div>
  );
}
