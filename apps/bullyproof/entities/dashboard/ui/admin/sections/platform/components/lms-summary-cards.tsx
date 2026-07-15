"use client";

import {
  BookOpen,
  GraduationCap,
  Award,
  TrendingUp,
  BookMarked,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Progress } from "@workspace/ui/components/progress";
import { StaggeredAnimation } from "@workspace/ui/components/atoms/staggered-animation";

interface LmsSummaryCardsProps {
  lmsSummary: {
    coursesPublished: {
      title: string;
      value: number;
      subtitle: string;
    };
    lessonsInLMS: {
      title: string;
      value: number;
      subtitle: string;
    };
    certificatesGenerated: {
      title: string;
      value: number;
      subtitle: string;
    };
    completionRate: {
      title: string;
      value: number;
      subtitle: string;
    };
    mostCompletedCourse: {
      title: string;
      value: string;
      subtitle: string;
    };
  };
}

export function LmsSummaryCards({ lmsSummary }: LmsSummaryCardsProps) {
  const getIcon = (title: string) => {
    switch (title) {
      case "Courses Published":
        return <BookOpen className="h-4 w-4" />;
      case "Lessons in LMS":
        return <BookMarked className="h-4 w-4" />;
      case "Certificates Generated":
        return <Award className="h-4 w-4" />;
      case "Completion Rate":
        return <TrendingUp className="h-4 w-4" />;
      case "Most Completed Course":
        return <GraduationCap className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const lmsItems = [
    { key: "coursesPublished", data: lmsSummary.coursesPublished },
    { key: "lessonsInLMS", data: lmsSummary.lessonsInLMS },
    { key: "certificatesGenerated", data: lmsSummary.certificatesGenerated },
    { key: "completionRate", data: lmsSummary.completionRate },
    { key: "mostCompletedCourse", data: lmsSummary.mostCompletedCourse },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {lmsItems.map((item, index) => (
        <StaggeredAnimation key={item.key} index={index}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                {getIcon((item.data as any).title)}
                <span>{(item.data as any).title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {item.data.title === "Completion Rate" ? (
                  <div className="space-y-2">
                    <div className="text-3xl font-bold">{item.data.value}%</div>
                    <Progress
                      value={(item.data as any).value}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      {item.data.subtitle}
                    </p>
                  </div>
                ) : item.data.title === "Most Completed Course" ? (
                  <div className="space-y-2">
                    <div className="text-lg font-semibold line-clamp-2">
                      {item.data.value}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.data.subtitle}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      Top Module
                    </Badge>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-3xl font-bold">
                      {typeof item.data.value === "number"
                        ? item.data.value.toLocaleString()
                        : item.data.value}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.data.subtitle}
                    </p>
                    {item.data.title === "Certificates Generated" && (
                      <Badge
                        variant="default"
                        className="text-xs bg-green-100 text-green-800"
                      >
                        All Time
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </StaggeredAnimation>
      ))}
    </div>
  );
}
