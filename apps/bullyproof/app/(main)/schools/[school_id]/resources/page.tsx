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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments(["schools", "resources"]);
import {
  LibraryBig,
  Upload,
  Search,
  Filter,
  Download,
  Eye,
  BookOpen,
  Video,
  FileText,
  Image,
  Play,
  File,
  Plus,
} from "lucide-react";

export default async function ResourcesPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;
  const { data: school } = await schoolServerApi.get.schoolBySlug(school_id);

  // Mock data for resources
  const resourceCategories = [
    {
      id: 1,
      name: "Videos",
      count: 24,
      icon: Video,
      color: "bg-red-100 text-red-600",
    },
    {
      id: 2,
      name: "Worksheets",
      count: 18,
      icon: FileText,
      color: "bg-blue-100 text-blue-600",
    },
    {
      id: 3,
      name: "Presentations",
      count: 12,
      icon: BookOpen,
      color: "bg-green-100 text-green-600",
    },
    {
      id: 4,
      name: "Images",
      count: 8,
      icon: Image,
      color: "bg-purple-100 text-purple-600",
    },
  ];

  const resources = [
    {
      id: 1,
      title: "Understanding Bullying - Video Series",
      description:
        "A comprehensive 5-part video series explaining different types of bullying and their impact.",
      type: "video",
      category: "Videos",
      duration: "15:30",
      size: "45.2 MB",
      downloads: 1247,
      rating: 4.8,
      tags: ["bullying", "education", "students"],
      uploadDate: "2024-01-10",
      author: "Dr. Sarah Wilson",
    },
    {
      id: 2,
      title: "Anti-Bullying Worksheet Pack",
      description:
        "Printable worksheets for grades 3-6 covering empathy, conflict resolution, and kindness.",
      type: "worksheet",
      category: "Worksheets",
      pages: 12,
      size: "8.7 MB",
      downloads: 892,
      rating: 4.6,
      tags: ["worksheets", "elementary", "activities"],
      uploadDate: "2024-01-08",
      author: "Ms. Emily Davis",
    },
    {
      id: 3,
      title: "Digital Citizenship Presentation",
      description:
        "Interactive presentation about online safety and responsible digital behavior.",
      type: "presentation",
      category: "Presentations",
      slides: 28,
      size: "12.3 MB",
      downloads: 634,
      rating: 4.9,
      tags: ["digital", "safety", "cyberbullying"],
      uploadDate: "2024-01-05",
      author: "Mr. Michael Chen",
    },
    {
      id: 4,
      title: "Kindness Challenge Poster Set",
      description:
        "Visual posters promoting kindness and inclusion for classroom display.",
      type: "image",
      category: "Images",
      format: "PNG",
      size: "2.1 MB",
      downloads: 456,
      rating: 4.7,
      tags: ["posters", "kindness", "display"],
      uploadDate: "2024-01-03",
      author: "Ms. Lisa Wilson",
    },
    {
      id: 5,
      title: "Conflict Resolution Role-Play Scripts",
      description:
        "Ready-to-use scripts for role-playing exercises in conflict resolution.",
      type: "worksheet",
      category: "Worksheets",
      pages: 8,
      size: "3.4 MB",
      downloads: 723,
      rating: 4.5,
      tags: ["conflict", "role-play", "scripts"],
      uploadDate: "2024-01-01",
      author: "Dr. David Brown",
    },
    {
      id: 6,
      title: "Bullying Prevention Training Module",
      description:
        "Comprehensive training module for teachers on recognizing and preventing bullying.",
      type: "video",
      category: "Videos",
      duration: "32:15",
      size: "78.9 MB",
      downloads: 234,
      rating: 4.9,
      tags: ["training", "teachers", "prevention"],
      uploadDate: "2023-12-28",
      author: "Dr. Sarah Wilson",
    },
  ];

  const featuredResources = resources.slice(0, 3);
  const recentUploads = resources.slice(0, 4);

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "video":
        return Video;
      case "worksheet":
        return FileText;
      case "presentation":
        return BookOpen;
      case "image":
        return Image;
      default:
        return File;
    }
  };

  const getResourceColor = (type: string) => {
    switch (type) {
      case "video":
        return "bg-red-100 text-red-600";
      case "worksheet":
        return "bg-blue-100 text-blue-600";
      case "presentation":
        return "bg-green-100 text-green-600";
      case "image":
        return "bg-purple-100 text-purple-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Resources - {school?.name}</h1>
          <p className="text-muted-foreground">
            Educational materials and resources for anti-bullying programs
          </p>
        </div>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Upload Resource
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Resources
            </CardTitle>
            <LibraryBig className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resources.length}</div>
            <p className="text-xs text-muted-foreground">Available materials</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Downloads
            </CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {resources
                .reduce((sum, resource) => sum + resource.downloads, 0)
                .toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {resourceCategories.length}
            </div>
            <p className="text-xs text-muted-foreground">Resource types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Rating</CardTitle>
            <LibraryBig className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(
                resources.reduce((sum, resource) => sum + resource.rating, 0) /
                resources.length
              ).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">Out of 5 stars</p>
          </CardContent>
        </Card>
      </div>

      {/* Resource Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Categories</CardTitle>
          <CardDescription>
            Browse resources by type and category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {resourceCategories.map((category) => {
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
                          {category.count} resources
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button size="sm" variant="outline" className="w-full">
                      Browse
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search resources..." className="pl-10" />
            </div>
            <Select>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="videos">Videos</SelectItem>
                <SelectItem value="worksheets">Worksheets</SelectItem>
                <SelectItem value="presentations">Presentations</SelectItem>
                <SelectItem value="images">Images</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resources Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource) => {
          const Icon = getResourceIcon(resource.type);
          return (
            <Card
              key={resource.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-2 rounded-lg ${getResourceColor(resource.type)}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {resource.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {resource.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline">{resource.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Resource Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Size</p>
                    <p className="font-medium">{resource.size}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Downloads</p>
                    <p className="font-medium">
                      {resource.downloads.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rating</p>
                    <p className="font-medium">{resource.rating}/5</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Author</p>
                    <p className="font-medium text-xs">{resource.author}</p>
                  </div>
                </div>

                {/* Resource Type Specific Info */}
                {resource.type === "video" && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Play className="h-4 w-4 text-muted-foreground" />
                    <span>{resource.duration}</span>
                  </div>
                )}
                {resource.type === "worksheet" && (
                  <div className="flex items-center space-x-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{resource.pages} pages</span>
                  </div>
                )}
                {resource.type === "presentation" && (
                  <div className="flex items-center space-x-2 text-sm">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span>{resource.slides} slides</span>
                  </div>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {resource.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {resource.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{resource.tags.length - 3} more
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Featured Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Featured Resources</CardTitle>
          <CardDescription>
            Most popular and highly-rated materials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {featuredResources.map((resource) => {
              const Icon = getResourceIcon(resource.type);
              return (
                <div
                  key={resource.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div
                    className={`p-2 rounded-lg ${getResourceColor(resource.type)}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {resource.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {resource.downloads.toLocaleString()} downloads •{" "}
                      {resource.rating}/5
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload New Resource</CardTitle>
          <CardDescription>
            Share educational materials with your school community
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Upload a resource</h3>
            <p className="text-muted-foreground mb-4">
              Drag and drop files here, or click to browse
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Choose Files
              </Button>
              <Button variant="outline">
                <Video className="h-4 w-4 mr-2" />
                Record Video
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Supported formats: PDF, DOC, PPT, MP4, PNG, JPG (Max 100MB)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
