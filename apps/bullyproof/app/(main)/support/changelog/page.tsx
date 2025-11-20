import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  GitCommit,
  Plus,
  Bug,
  AlertTriangle,
  Star,
  Download,
  Filter,
  Calendar,
} from "lucide-react";

export default function ChangelogPage() {
  const releases = [
    {
      version: "2.4.1",
      date: "2024-01-20",
      type: "Patch",
      highlights: [
        "Fixed email notification delivery issues",
        "Improved analytics dashboard performance",
        "Resolved mobile app crash on iOS 17.0",
      ],
      changes: {
        "Bug Fixes": [
          "Fixed email notifications not being sent to some users",
          "Resolved analytics dashboard timeout for large datasets",
          "Fixed mobile app crash when accessing student profiles",
          "Corrected report generation for schools with 500+ students",
        ],
        Improvements: [
          "Enhanced analytics dashboard loading performance",
          "Improved mobile app stability",
          "Optimized database queries for better response times",
        ],
        Security: [
          "Updated authentication token validation",
          "Enhanced data encryption for sensitive information",
        ],
      },
    },
    {
      version: "2.4.0",
      date: "2024-01-15",
      type: "Minor",
      highlights: [
        "New parent communication dashboard",
        "Enhanced analytics with custom date ranges",
        "Improved mobile app user experience",
      ],
      changes: {
        "New Features": [
          "Added parent communication dashboard with message templates",
          "Implemented custom date range filters for analytics",
          "New bulk student import functionality",
          "Added dark mode theme option",
        ],
        Improvements: [
          "Redesigned mobile app interface",
          "Enhanced teacher dashboard with quick actions",
          "Improved report generation with new templates",
          "Better error handling and user feedback",
        ],
        "API Changes": [
          "New endpoints for parent communication",
          "Enhanced analytics API with filtering options",
          "Updated authentication endpoints",
        ],
      },
    },
    {
      version: "2.3.2",
      date: "2024-01-05",
      type: "Patch",
      highlights: [
        "Critical security patch",
        "Performance improvements",
        "Bug fixes for report generation",
      ],
      changes: {
        Security: [
          "Critical security patch for authentication system",
          "Enhanced data encryption protocols",
          "Updated security headers and CORS policies",
        ],
        "Bug Fixes": [
          "Fixed report generation timeout issues",
          "Resolved login issues for some users",
          "Fixed data export functionality",
        ],
        Performance: [
          "Optimized database queries",
          "Improved page loading times",
          "Enhanced caching mechanisms",
        ],
      },
    },
    {
      version: "2.3.1",
      date: "2023-12-20",
      type: "Patch",
      highlights: [
        "Holiday break fixes",
        "User interface improvements",
        "Mobile app updates",
      ],
      changes: {
        "Bug Fixes": [
          "Fixed calendar display issues",
          "Resolved notification timing problems",
          "Fixed mobile app sync issues",
        ],
        Improvements: [
          "Enhanced user interface responsiveness",
          "Improved mobile app performance",
          "Better error messages and user guidance",
        ],
      },
    },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Major":
        return "bg-red-100 text-red-600";
      case "Minor":
        return "bg-blue-100 text-blue-600";
      case "Patch":
        return "bg-green-100 text-green-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Major":
        return <Star className="h-4 w-4" />;
      case "Minor":
        return <Plus className="h-4 w-4" />;
      case "Patch":
        return <Bug className="h-4 w-4" />;
      default:
        return <GitCommit className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <GitCommit className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Changelog & Release Notes
            </h1>
            <p className="text-muted-foreground">
              Track all updates, new features, and improvements to Bullyproof
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter by Type
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Filter by Date
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Changelog
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Release Notes */}
      <div className="space-y-6">
        {releases.map((release, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    {getTypeIcon(release.type)}
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      Version {release.version}
                    </CardTitle>
                    <CardDescription>
                      Released on{" "}
                      {new Date(release.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={getTypeColor(release.type)}>
                  {release.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Highlights */}
              <div>
                <h4 className="font-medium mb-2">Key Highlights</h4>
                <ul className="space-y-1">
                  {release.highlights.map((highlight, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <Star className="h-3 w-3 text-yellow-500 mt-1 flex-shrink-0" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Detailed Changes */}
              <div className="space-y-4">
                {Object.entries(release.changes).map(([category, items]) => (
                  <div key={category}>
                    <h4 className="font-medium mb-2">{category}</h4>
                    <ul className="space-y-1">
                      {(items as string[]).map((item, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Download Release Notes
                </Button>
                <Button variant="outline" size="sm">
                  View Full Changelog
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Release Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Releases</CardTitle>
          <CardDescription>
            Planned releases and their expected features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="font-medium">
                  Version 2.5.0 - February 15, 2024
                </div>
                <div className="text-sm text-muted-foreground">
                  Major update with advanced analytics, new mobile features, and
                  enhanced security
                </div>
              </div>
              <Badge variant="outline">Planned</Badge>
            </div>
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="font-medium">
                  Version 2.4.2 - January 30, 2024
                </div>
                <div className="text-sm text-muted-foreground">
                  Bug fixes and performance improvements
                </div>
              </div>
              <Badge variant="outline">In Development</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscribe to Updates */}
      <Card>
        <CardHeader>
          <CardTitle>Stay Updated</CardTitle>
          <CardDescription>
            Get notified about new releases and updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full">
            <Star className="h-4 w-4 mr-2" />
            Subscribe to Release Notifications
          </Button>
          <Button variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Download Release Calendar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
