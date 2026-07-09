import { schoolServerApi } from "@/entities/school/api/server-endpoints";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  HelpCircle,
  Search,
  MessageCircle,
  BookOpen,
  Video,
  Phone,
  Mail,
  Clock,
  Star,
  Play,
  Download,
  ExternalLink,
} from "lucide-react";
import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments(["schools", "help"]);

export default async function HelpPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;
  const { data: school } = await schoolServerApi.get.schoolBySlug(school_id);

  // Mock help data
  const helpCategories = [
    {
      id: 1,
      name: "Getting Started",
      description: "Learn the basics of the platform",
      icon: BookOpen,
      color: "bg-blue-100 text-blue-600",
      articles: 12,
    },
    {
      id: 2,
      name: "Video Tutorials",
      description: "Watch step-by-step guides",
      icon: Video,
      color: "bg-red-100 text-red-600",
      articles: 8,
    },
    {
      id: 3,
      name: "Best Practices",
      description: "Tips for effective implementation",
      icon: Star,
      color: "bg-yellow-100 text-yellow-600",
      articles: 15,
    },
    {
      id: 4,
      name: "Troubleshooting",
      description: "Common issues and solutions",
      icon: HelpCircle,
      color: "bg-orange-100 text-orange-600",
      articles: 20,
    },
  ];

  const helpArticles = [
    {
      id: 1,
      title: "Setting Up Your School Profile",
      description:
        "Complete guide to configuring your school's information and settings",
      category: "Getting Started",
      type: "article",
      readTime: "5 min",
      difficulty: "beginner",
      rating: 4.8,
      views: 1247,
    },
    {
      id: 2,
      title: "How to Add Teachers and Students",
      description:
        "Step-by-step instructions for managing your school's user accounts",
      category: "Getting Started",
      type: "video",
      readTime: "8 min",
      difficulty: "beginner",
      rating: 4.9,
      views: 892,
    },
    {
      id: 3,
      title: "Creating Effective Anti-Bullying Lessons",
      description:
        "Best practices for designing engaging and impactful lessons",
      category: "Best Practices",
      type: "article",
      readTime: "12 min",
      difficulty: "intermediate",
      rating: 4.7,
      views: 634,
    },
    {
      id: 4,
      title: "Understanding Incident Reports",
      description: "How to properly document and manage bullying incidents",
      category: "Getting Started",
      type: "video",
      readTime: "6 min",
      difficulty: "beginner",
      rating: 4.6,
      views: 723,
    },
    {
      id: 5,
      title: "Generating Performance Reports",
      description:
        "Creating comprehensive reports for administrators and stakeholders",
      category: "Best Practices",
      type: "article",
      readTime: "10 min",
      difficulty: "intermediate",
      rating: 4.5,
      views: 456,
    },
    {
      id: 6,
      title: "Troubleshooting Login Issues",
      description: "Common login problems and how to resolve them",
      category: "Troubleshooting",
      type: "article",
      readTime: "3 min",
      difficulty: "beginner",
      rating: 4.3,
      views: 234,
    },
  ];

  const videoTutorials = [
    {
      id: 1,
      title: "Platform Overview",
      duration: "15:30",
      thumbnail: "/api/placeholder/300/200",
      description: "Complete walkthrough of the platform's main features",
      views: 2847,
      rating: 4.9,
    },
    {
      id: 2,
      title: "Setting Up Classes",
      duration: "8:45",
      thumbnail: "/api/placeholder/300/200",
      description: "How to create and manage classes in your school",
      views: 1923,
      rating: 4.8,
    },
    {
      id: 3,
      title: "Incident Management",
      duration: "12:15",
      thumbnail: "/api/placeholder/300/200",
      description: "Best practices for handling bullying incidents",
      views: 1456,
      rating: 4.7,
    },
  ];

  const supportOptions = [
    {
      id: 1,
      name: "Live Chat",
      description: "Get instant help from our support team",
      icon: MessageCircle,
      availability: "24/7",
      responseTime: "< 2 minutes",
      color: "bg-green-100 text-green-600",
    },
    {
      id: 2,
      name: "Email Support",
      description: "Send us a detailed message and we'll respond",
      icon: Mail,
      availability: "Mon-Fri 9AM-6PM",
      responseTime: "< 4 hours",
      color: "bg-blue-100 text-blue-600",
    },
    {
      id: 3,
      name: "Phone Support",
      description: "Speak directly with our support specialists",
      icon: Phone,
      availability: "Mon-Fri 9AM-5PM",
      responseTime: "Immediate",
      color: "bg-purple-100 text-purple-600",
    },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryIcon = (category: string) => {
    const categoryData = helpCategories.find((cat) => cat.name === category);
    return categoryData?.icon || HelpCircle;
  };

  const getCategoryColor = (category: string) => {
    const categoryData = helpCategories.find((cat) => cat.name === category);
    return categoryData?.color || "bg-gray-100 text-gray-600";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Help Center - {school?.name}</h1>
          <p className="text-muted-foreground">
            Find tutorials, guides, and get support for your school
          </p>
        </div>
        <Button>
          <MessageCircle className="h-4 w-4 mr-2" />
          Contact Support
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search help articles, tutorials, and guides..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Help Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Browse Help Topics</CardTitle>
          <CardDescription>Find help organized by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {helpCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Card
                  key={category.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${category.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-sm">
                          {category.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {category.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {category.articles} articles
                      </span>
                      <Button size="sm" variant="outline">
                        Browse
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Video Tutorials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Video className="h-5 w-5" />
            <span>Video Tutorials</span>
          </CardTitle>
          <CardDescription>Watch step-by-step video guides</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {videoTutorials.map((tutorial) => (
              <Card
                key={tutorial.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="relative">
                  <div className="aspect-video bg-gray-100 rounded-t-lg flex items-center justify-center">
                    <Play className="h-12 w-12 text-gray-400" />
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {tutorial.duration}
                  </div>
                </div>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">{tutorial.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {tutorial.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{tutorial.views.toLocaleString()} views</span>
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{tutorial.rating}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Help Articles */}
      <Card>
        <CardHeader>
          <CardTitle>Help Articles</CardTitle>
          <CardDescription>
            Comprehensive guides and documentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {helpArticles.map((article) => {
              const Icon = getCategoryIcon(article.category);
              return (
                <div
                  key={article.id}
                  className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div
                    className={`p-2 rounded-lg ${getCategoryColor(article.category)}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{article.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {article.description}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {article.type === "video" && (
                          <Play className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Button variant="outline" size="sm">
                          {article.type === "video" ? "Watch" : "Read"}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>{article.readTime}</span>
                      <Badge className={getDifficultyColor(article.difficulty)}>
                        {article.difficulty}
                      </Badge>
                      <span>{article.views.toLocaleString()} views</span>
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{article.rating}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Get Support</span>
          </CardTitle>
          <CardDescription>Choose how you&apos;d like to get help</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {supportOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Card
                  key={option.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${option.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-sm">{option.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Availability
                      </span>
                      <span>{option.availability}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Response Time
                      </span>
                      <span>{option.responseTime}</span>
                    </div>
                    <Button size="sm" className="w-full mt-2">
                      {option.name === "Live Chat"
                        ? "Start Chat"
                        : option.name === "Email Support"
                          ? "Send Email"
                          : "Call Now"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Contact Form */}
      <Card>
        <CardHeader>
          <CardTitle>Send us a Message</CardTitle>
          <CardDescription>
            Can&apos;t find what you&apos;re looking for? Send us a detailed message
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Input placeholder="Brief description of your issue" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <select className="w-full p-2 border rounded-md">
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Urgent</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Please describe your issue in detail..."
                rows={4}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" />
                <label className="text-sm text-muted-foreground">
                  I agree to the terms of service
                </label>
              </div>
              <Button>
                <Mail className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Popular resources and downloads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center space-y-2">
              <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto">
                <Download className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-medium">User Manual</h4>
              <p className="text-sm text-muted-foreground">
                Complete platform guide
              </p>
              <Button size="sm" variant="outline" className="w-full">
                Download PDF
              </Button>
            </div>

            <div className="text-center space-y-2">
              <div className="p-3 bg-green-100 rounded-full w-fit mx-auto">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-medium">API Documentation</h4>
              <p className="text-sm text-muted-foreground">
                Developer resources
              </p>
              <Button size="sm" variant="outline" className="w-full">
                View Docs
              </Button>
            </div>

            <div className="text-center space-y-2">
              <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto">
                <ExternalLink className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-medium">Community Forum</h4>
              <p className="text-sm text-muted-foreground">
                Connect with users
              </p>
              <Button size="sm" variant="outline" className="w-full">
                Visit Forum
              </Button>
            </div>

            <div className="text-center space-y-2">
              <div className="p-3 bg-orange-100 rounded-full w-fit mx-auto">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <h4 className="font-medium">Status Page</h4>
              <p className="text-sm text-muted-foreground">
                System status updates
              </p>
              <Button size="sm" variant="outline" className="w-full">
                Check Status
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
