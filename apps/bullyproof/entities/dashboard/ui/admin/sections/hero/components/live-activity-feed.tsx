"use client";

import { useState, useEffect } from "react";
import {
  School,
  GraduationCap,
  Award,
  UserPlus,
  FileBadge2,
} from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

interface ActivityEvent {
  id: string;
  type:
    | "school_onboarded"
    | "class_completed"
    | "training_completed"
    | "user_registered"
    | "certificate_issued";
  message: string;
  timestamp: string;
  icon: string;
}

const eventTemplates = [
  // School onboarding
  {
    type: "school_onboarded" as const,
    templates: [
      "{school} onboarded",
      "{school} joined the platform",
      "New school: {school}",
    ],
    schools: [
      "Mazenod College",
      "St. Mary's High",
      "Riverside High",
      "Westfield Academy",
      "Eastbrook School",
      "Northside College",
    ],
  },
  // Class completion
  {
    type: "class_completed" as const,
    templates: [
      "{class} completed '{lesson}'",
      "{class} finished '{lesson}'",
      "{class} completed training module",
    ],
    classes: [
      "Class 7B",
      "Year 10A",
      "Form 5C",
      "Grade 8D",
      "Class 9E",
      "Year 11B",
    ],
    lessons: [
      "Welcome to Bullyproof",
      "Building Empathy",
      "Conflict Resolution",
      "Digital Citizenship",
      "Peer Support",
    ],
  },
  // Training completion
  {
    type: "training_completed" as const,
    templates: [
      "{name} completed training",
      "{name} finished the course",
      "{name} completed their module",
    ],
    names: [
      "Sarah Johnson",
      "Michael Chen",
      "Emma Davis",
      "James Wilson",
      "Lisa Brown",
      "David Smith",
      "Anna Taylor",
      "Chris Lee",
    ],
  },
  // User registration
  {
    type: "user_registered" as const,
    templates: [
      "{name} registered",
      "New user: {name}",
      "{name} joined the platform",
    ],
    names: [
      "Sarah Johnson",
      "Michael Chen",
      "Emma Davis",
      "James Wilson",
      "Lisa Brown",
      "David Smith",
      "Anna Taylor",
      "Chris Lee",
    ],
  },
  // Certificate issued
  {
    type: "certificate_issued" as const,
    templates: [
      "Certificate issued to {name}",
      "{name} earned a certificate",
      "Certificate awarded to {name}",
    ],
    names: [
      "Sarah Johnson",
      "Michael Chen",
      "Emma Davis",
      "James Wilson",
      "Lisa Brown",
      "David Smith",
      "Anna Taylor",
      "Chris Lee",
    ],
  },
];

const getIcon = (type: string) => {
  switch (type) {
    case "school_onboarded":
      return <School className="h-4 w-4" />;
    case "class_completed":
      return <GraduationCap className="h-4 w-4" />;
    case "training_completed":
      return <Award className="h-4 w-4" />;
    case "user_registered":
      return <UserPlus className="h-4 w-4" />;
    case "certificate_issued":
      return <FileBadge2 className="h-4 w-4" />;
    default:
      return <School className="h-4 w-4" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "school_onboarded":
      return "bg-blue-100 text-blue-800";
    case "class_completed":
      return "bg-green-100 text-green-800";
    case "training_completed":
      return "bg-purple-100 text-purple-800";
    case "user_registered":
      return "bg-cyan-100 text-cyan-800";
    case "certificate_issued":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case "school_onboarded":
      return "SCHOOL";
    case "class_completed":
      return "CLASS";
    case "training_completed":
      return "TRAINING";
    case "user_registered":
      return "USER";
    case "certificate_issued":
      return "CERTIFICATE";
    default:
      return "EVENT";
  }
};

const formatTimeAgo = (timestamp: string) => {
  const now = new Date();
  const eventTime = new Date(timestamp);
  const diffInSeconds = Math.floor(
    (now.getTime() - eventTime.getTime()) / 1000
  );

  if (diffInSeconds < 60) {
    return "Just now";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
};

const generateRandomEvent = (): ActivityEvent => {
  const templateGroup =
    eventTemplates[Math.floor(Math.random() * eventTemplates.length)];

  if (!templateGroup) {
    // Fallback event if templateGroup is undefined
    return {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "school_onboarded",
      message: "System activity",
      timestamp: new Date().toISOString(),
      icon: "school_onboarded",
    };
  }

  const template =
    templateGroup.templates[
      Math.floor(Math.random() * templateGroup.templates.length)
    ];

  if (!template) {
    // Fallback event if template is undefined
    return {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: templateGroup.type,
      message: "System activity",
      timestamp: new Date().toISOString(),
      icon: templateGroup.type,
    };
  }

  let message = template;

  // Replace placeholders
  if (template.includes("{school}") && templateGroup.schools) {
    const school =
      templateGroup.schools[
        Math.floor(Math.random() * templateGroup.schools.length)
      ];
    if (school) {
      message = message.replace("{school}", school);
    }
  }
  if (template.includes("{class}") && templateGroup.classes) {
    const class_ =
      templateGroup.classes[
        Math.floor(Math.random() * templateGroup.classes.length)
      ];
    if (class_) {
      message = message.replace("{class}", class_);
    }
  }
  if (template.includes("{lesson}") && templateGroup.lessons) {
    const lesson =
      templateGroup.lessons[
        Math.floor(Math.random() * templateGroup.lessons.length)
      ];
    if (lesson) {
      message = message.replace("{lesson}", lesson);
    }
  }
  if (template.includes("{name}") && templateGroup.names) {
    const name =
      templateGroup.names[
        Math.floor(Math.random() * templateGroup.names.length)
      ];
    if (name) {
      message = message.replace("{name}", name);
    }
  }

  return {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: templateGroup.type,
    message,
    timestamp: new Date().toISOString(),
    icon: templateGroup.type,
  };
};

export function LiveActivityFeed() {
  const [currentEvent, setCurrentEvent] = useState<ActivityEvent | null>(null);

  // Generate initial event
  useEffect(() => {
    setCurrentEvent(generateRandomEvent());
  }, []);

  // Auto-update with new events
  useEffect(() => {
    const interval = setInterval(
      () => {
        const newEvent = generateRandomEvent();
        setCurrentEvent(newEvent);
      },
      Math.random() * 3000 + 3000
    ); // 3-6 seconds

    return () => clearInterval(interval);
  }, []);

  if (!currentEvent) {
    return (
      <div className="flex items-center justify-center h-16 text-muted-foreground">
        Loading activity feed...
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between h-full w-full px-4 py-4"
      key={currentEvent.id}
    >
      {/* Badge and message on the left */}
      <div className="flex items-center gap-2">
        <div
          className="animate-slide-left-fade-in-slow flex item-center"
          key={currentEvent.id}
        >
          <Badge
            variant="secondary"
            className={cn("text-xs", getTypeColor(currentEvent.type))}
          >
            {getIcon(currentEvent.icon)}
            {getTypeLabel(currentEvent.type)}
          </Badge>
        </div>

        <span className="text-sm text-foreground animate-slide-up-fade-in-slow">
          {currentEvent.message}
        </span>
      </div>

      {/* Timestamp on the right */}
      <span className="text-xs text-muted-foreground flex-shrink-0">
        {formatTimeAgo(currentEvent.timestamp)}
      </span>
    </div>
  );
}
