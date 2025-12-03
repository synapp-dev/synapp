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
  BookOpen,
  Play,
  Clock,
  Users,
  Star,
  Download,
  ExternalLink,
} from "lucide-react";
import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments(["support", "tutorials"]);

export default function TutorialsPage() {
  const tutorials = [
    {
      id: 1,
      title: "Getting Started with Bullyproof",
      description:
        "Learn the basics of setting up your school and managing users",
      duration: "15 min",
      difficulty: "Beginner",
      rating: 4.8,
      views: 1240,
      type: "Video",
      thumbnail: "/images/tutorial-1.jpg",
    },
    {
      id: 2,
      title: "Setting Up Classes and Students",
      description:
        "Step-by-step guide to organizing your classes and student data",
      duration: "12 min",
      difficulty: "Beginner",
      rating: 4.6,
      views: 892,
      type: "Interactive",
      thumbnail: "/images/tutorial-2.jpg",
    },
    {
      id: 3,
      title: "Understanding Analytics and Reports",
      description: "Master the reporting features to track school performance",
      duration: "20 min",
      difficulty: "Intermediate",
      rating: 4.9,
      views: 756,
      type: "Video",
      thumbnail: "/images/tutorial-3.jpg",
    },
    {
      id: 4,
      title: "Advanced Security Settings",
      description:
        "Configure advanced security and privacy settings for your school",
      duration: "18 min",
      difficulty: "Advanced",
      rating: 4.7,
      views: 423,
      type: "Guide",
      thumbnail: "/images/tutorial-4.jpg",
    },
  ];

  const categories = [
    { name: "All", count: 24 },
    { name: "Getting Started", count: 8 },
    { name: "User Management", count: 6 },
    { name: "Analytics", count: 5 },
    { name: "Security", count: 3 },
    { name: "Advanced", count: 2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Tutorials & Guides
        </h1>
        <p className="text-muted-foreground">
          Learn how to use Bullyproof with our comprehensive tutorials and
          guides.
        </p>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category.name}
            variant={category.name === "All" ? "default" : "outline"}
            size="sm"
          >
            {category.name} ({category.count})
          </Button>
        ))}
      </div>

      {/* Tutorials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tutorials.map((tutorial) => (
          <Card
            key={tutorial.id}
            className="overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="aspect-video bg-muted relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <Play className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="absolute top-2 right-2">
                <Badge variant="secondary">{tutorial.type}</Badge>
              </div>
            </div>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{tutorial.title}</CardTitle>
                  <CardDescription>{tutorial.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{tutorial.duration}</span>
                </div>
                <Badge variant="outline">{tutorial.difficulty}</Badge>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{tutorial.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{tutorial.views}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  Start Tutorial
                </Button>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Popular resources and documentation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">User Manual</div>
                  <div className="text-sm text-muted-foreground">
                    Complete reference guide
                  </div>
                </div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Download Center</div>
                  <div className="text-sm text-muted-foreground">
                    Templates and resources
                  </div>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
