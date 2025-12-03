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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import {
  HelpCircle,
  Search,
  MessageCircle,
  BookOpen,
  Users,
  Shield,
  TrendingUp,
  Star,
} from "lucide-react";
import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments(["schools", "faq"]);

export default async function FaqPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;
  const { data: school } = await schoolServerApi.get.schoolBySlug(school_id);

  // Mock FAQ data
  const faqCategories = [
    {
      id: 1,
      name: "Getting Started",
      count: 8,
      icon: BookOpen,
      color: "bg-blue-100 text-blue-600",
    },
    {
      id: 2,
      name: "User Management",
      count: 12,
      icon: Users,
      color: "bg-green-100 text-green-600",
    },
    {
      id: 3,
      name: "Safety & Security",
      count: 6,
      icon: Shield,
      color: "bg-red-100 text-red-600",
    },
    {
      id: 4,
      name: "Reports & Analytics",
      count: 10,
      icon: TrendingUp,
      color: "bg-purple-100 text-purple-600",
    },
  ];

  const faqItems = [
    {
      id: 1,
      question: "How do I add new teachers to my school?",
      answer:
        "To add new teachers, go to the Teachers page and click 'Invite Teacher'. Enter their email address and they will receive an invitation to join your school. You can also bulk import teachers using our CSV template.",
      category: "User Management",
      helpful: 24,
      tags: ["teachers", "invitations", "user-management"],
    },
    {
      id: 2,
      question: "What should I do when a bullying incident is reported?",
      answer:
        "When an incident is reported, follow these steps: 1) Review the incident details immediately, 2) Contact the involved parties if necessary, 3) Document the incident with photos/evidence, 4) Assign appropriate disciplinary actions, 5) Follow up with all parties involved, 6) Update the incident status in the system.",
      category: "Safety & Security",
      helpful: 18,
      tags: ["incidents", "safety", "procedures"],
    },
    {
      id: 3,
      question:
        "How can I track my school's anti-bullying program effectiveness?",
      answer:
        "Use the Performance dashboard to monitor key metrics like incident rates, student engagement, and lesson completion. Generate monthly reports to track trends over time. The system provides automated insights and recommendations for improvement.",
      category: "Reports & Analytics",
      helpful: 31,
      tags: ["performance", "analytics", "tracking"],
    },
    {
      id: 4,
      question: "How do I set up classes and assign students?",
      answer:
        "Navigate to the Classes page and click 'Add Class'. Enter class details like name, grade level, and teacher. Students can be added individually or imported via CSV. You can also sync with your existing student information system.",
      category: "Getting Started",
      helpful: 22,
      tags: ["classes", "students", "setup"],
    },
    {
      id: 5,
      question: "What resources are available for anti-bullying education?",
      answer:
        "The Resources section contains videos, worksheets, presentations, and interactive materials. Filter by grade level, subject, or type. All resources are curriculum-aligned and include teacher guides. You can also upload your own materials.",
      category: "Getting Started",
      helpful: 27,
      tags: ["resources", "education", "materials"],
    },
    {
      id: 6,
      question: "How do I generate reports for administrators?",
      answer:
        "Go to the Reports page and select your desired report type (bullying trends, engagement, teacher performance). Choose date ranges and filters, then click 'Generate Report'. Reports can be exported as PDF or shared via email.",
      category: "Reports & Analytics",
      helpful: 19,
      tags: ["reports", "export", "administration"],
    },
    {
      id: 7,
      question: "Can parents access the system?",
      answer:
        "Yes, parents can be given limited access to view their child's progress and receive notifications about incidents. You can control what information parents can see in the Settings page under Parent Portal configuration.",
      category: "User Management",
      helpful: 15,
      tags: ["parents", "access", "notifications"],
    },
    {
      id: 8,
      question: "How do I customize notification settings?",
      answer:
        "Go to Settings > Notifications to configure email alerts, incident notifications, and weekly reports. You can set different notification preferences for teachers, administrators, and parents.",
      category: "User Management",
      helpful: 21,
      tags: ["notifications", "settings", "alerts"],
    },
  ];

  const popularQuestions = faqItems
    .sort((a, b) => b.helpful - a.helpful)
    .slice(0, 5);

  const getCategoryIcon = (category: string) => {
    const categoryData = faqCategories.find((cat) => cat.name === category);
    return categoryData?.icon || HelpCircle;
  };

  const getCategoryColor = (category: string) => {
    const categoryData = faqCategories.find((cat) => cat.name === category);
    return categoryData?.color || "bg-gray-100 text-gray-600";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">FAQ - {school?.name}</h1>
          <p className="text-muted-foreground">
            Find answers to common questions about the platform
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
              placeholder="Search frequently asked questions..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Browse by Category</CardTitle>
          <CardDescription>Find answers organized by topic</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {faqCategories.map((category) => {
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
                          {category.count} questions
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

      {/* Popular Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5" />
            <span>Most Helpful Questions</span>
          </CardTitle>
          <CardDescription>
            Questions that have helped other users the most
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {popularQuestions.map((item) => {
              const Icon = getCategoryIcon(item.category);
              return (
                <div
                  key={item.id}
                  className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div
                    className={`p-2 rounded-lg ${getCategoryColor(item.category)}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h4 className="font-medium">{item.question}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.answer}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>{item.helpful} found helpful</span>
                      <Badge variant="outline">{item.category}</Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* FAQ Accordion */}
      <Card>
        <CardHeader>
          <CardTitle>All Questions</CardTitle>
          <CardDescription>
            Complete list of frequently asked questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item) => {
              const Icon = getCategoryIcon(item.category);
              return (
                <AccordionItem key={item.id} value={`item-${item.id}`}>
                  <AccordionTrigger className="text-left">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-1 rounded ${getCategoryColor(item.category)}`}
                      >
                        <Icon className="h-3 w-3" />
                      </div>
                      <span>{item.question}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {item.answer}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">
                          Was this helpful?
                        </span>
                        <Button variant="outline" size="sm">
                          Yes
                        </Button>
                        <Button variant="outline" size="sm">
                          No
                        </Button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">
                          {item.helpful} found helpful
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Still Need Help?</span>
          </CardTitle>
          <CardDescription>
            Can't find what you're looking for? Our support team is here to
            help.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center space-y-2">
              <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-medium">Live Chat</h4>
              <p className="text-sm text-muted-foreground">
                Get instant help from our support team
              </p>
              <Button size="sm" className="w-full">
                Start Chat
              </Button>
            </div>

            <div className="text-center space-y-2">
              <div className="p-3 bg-green-100 rounded-full w-fit mx-auto">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-medium">Documentation</h4>
              <p className="text-sm text-muted-foreground">
                Browse our comprehensive guides
              </p>
              <Button size="sm" variant="outline" className="w-full">
                View Docs
              </Button>
            </div>

            <div className="text-center space-y-2">
              <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-medium">Community</h4>
              <p className="text-sm text-muted-foreground">
                Connect with other school administrators
              </p>
              <Button size="sm" variant="outline" className="w-full">
                Join Community
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
