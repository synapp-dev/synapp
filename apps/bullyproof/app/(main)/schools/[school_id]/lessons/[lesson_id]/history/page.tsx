import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { 
  Clock, 
  User, 
  Plus, 
  Edit, 
  Play, 
  Square, 
  Download, 
  Calendar,
  MessageSquare,
  CheckCircle2,
  XCircle
} from "lucide-react";

export default async function LessonHistoryPage({
  params,
}: {
  params: Promise<{ school_id: string; lesson_id: string }>;
}) {
  const { school_id, lesson_id } = await params;

  // Dummy audit log data - most recent at the top
  const auditLog = [
    {
      id: 1,
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      event: "lesson_completed",
      title: "Lesson Completed",
      description: "All classes have completed the lesson",
      initiator: { name: "Sarah Johnson", initials: "SJ", email: "sarah.johnson@school.edu" },
      metadata: { classesCompleted: 3, totalClasses: 3 }
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      event: "lesson_stopped",
      title: "Lesson Stopped",
      description: "Lesson delivery stopped for Class A",
      initiator: { name: "Michael Chen", initials: "MC", email: "michael.chen@school.edu" },
      metadata: { className: "Class A", duration: "32 minutes" }
    },
    {
      id: 3,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
      event: "lesson_started",
      title: "Lesson Started",
      description: "Started delivery for Class A",
      initiator: { name: "Michael Chen", initials: "MC", email: "michael.chen@school.edu" },
      metadata: { className: "Class A" }
    },
    {
      id: 4,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      event: "lesson_exported",
      title: "Lesson Data Exported",
      description: "Exported lesson data and analytics",
      initiator: { name: "Sarah Johnson", initials: "SJ", email: "sarah.johnson@school.edu" },
      metadata: { format: "CSV", fileName: "lesson-analytics-2024.csv" }
    },
    {
      id: 5,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36), // 36 hours ago
      event: "lesson_updated",
      title: "Lesson Updated",
      description: "Updated class roster and added supplementary materials",
      initiator: { name: "Sarah Johnson", initials: "SJ", email: "sarah.johnson@school.edu" },
      metadata: { changes: ["class_roster", "materials"] }
    },
    {
      id: 6,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
      event: "lesson_scheduled",
      title: "Lesson Scheduled",
      description: "Scheduled lesson for delivery",
      initiator: { name: "Michael Chen", initials: "MC", email: "michael.chen@school.edu" },
      metadata: { scheduledDate: "2024-01-15", classes: 3 }
    },
    {
      id: 7,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72), // 3 days ago
      event: "lesson_created",
      title: "Lesson Created",
      description: "Initial lesson creation",
      initiator: { name: "Sarah Johnson", initials: "SJ", email: "sarah.johnson@school.edu" },
      metadata: { lessonTitle: "Understanding Bullying Behaviors" }
    }
  ];

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "lesson_created":
        return <Plus className="h-4 w-4" />;
      case "lesson_updated":
        return <Edit className="h-4 w-4" />;
      case "lesson_started":
        return <Play className="h-4 w-4" />;
      case "lesson_stopped":
        return <Square className="h-4 w-4" />;
      case "lesson_completed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "lesson_scheduled":
        return <Calendar className="h-4 w-4" />;
      case "lesson_exported":
        return <Download className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventBadgeVariant = (eventType: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (eventType) {
      case "lesson_completed":
        return "default";
      case "lesson_started":
        return "default";
      case "lesson_stopped":
        return "outline";
      case "lesson_exported":
        return "secondary";
      case "lesson_updated":
        return "secondary";
      case "lesson_scheduled":
        return "secondary";
      case "lesson_created":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">History</h1>
        <p className="text-muted-foreground">
          Complete audit trail of all lesson activity
        </p>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent transition-colors text-sm">
          <Download className="h-4 w-4" />
          Export History
        </button>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border"></div>
            
            {/* Timeline Items */}
            <div className="space-y-6">
              {auditLog.map((item, index) => (
                <div key={item.id} className="relative flex gap-4">
                  {/* Timeline Dot */}
                  <div className="relative z-10">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-background border-2 border-primary">
                      <div className="text-primary">
                        {getEventIcon(item.event)}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-3 pb-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{item.title}</h3>
                          <Badge variant={getEventBadgeVariant(item.event)} className="text-xs">
                            {item.event.replace('lesson_', '').replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {item.description}
                        </p>
                        
                        {/* Initiator */}
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {item.initiator.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{item.initiator.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.initiator.email}
                          </span>
                        </div>

                        {/* Metadata */}
                        {item.metadata && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {Object.entries(item.metadata).map(([key, value]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {key}: {String(value)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="text-right whitespace-nowrap">
                        <div className="text-sm font-medium mb-1">
                          {formatTimestamp(item.timestamp)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(item.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

