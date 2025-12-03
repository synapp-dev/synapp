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

export const metadata = generateMetadataFromSegments(["support", "faq"]);

export default function FaqPage() {
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
      name: "Security & Privacy",
      count: 6,
      icon: Shield,
      color: "bg-red-100 text-red-600",
    },
    {
      id: 4,
      name: "Analytics & Reports",
      count: 9,
      icon: TrendingUp,
      color: "bg-purple-100 text-purple-600",
    },
  ];

  const faqItems = [
    {
      id: 1,
      question: "How do I get started with Bullyproof?",
      answer:
        "Getting started is easy! First, create your account, then follow our onboarding wizard to set up your school profile and invite teachers.",
      category: "Getting Started",
      helpful: 24,
    },
    {
      id: 2,
      question: "How do I invite teachers to my school?",
      answer:
        "You can invite teachers by going to the Teachers section and clicking 'Invite Teacher'. Enter their email address and they'll receive an invitation.",
      category: "User Management",
      helpful: 18,
    },
    {
      id: 3,
      question: "Is my data secure?",
      answer:
        "Yes, we take security seriously. All data is encrypted in transit and at rest, and we comply with educational data privacy standards.",
      category: "Security & Privacy",
      helpful: 31,
    },
    {
      id: 4,
      question: "How do I generate reports?",
      answer:
        "Navigate to the Reports section where you can generate various reports including performance analytics, incident summaries, and more.",
      category: "Analytics & Reports",
      helpful: 15,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-muted-foreground">
          Find answers to common questions about using Bullyproof.
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search FAQs..." className="pl-10" />
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {faqCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Card
              key={category.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${category.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <CardDescription>{category.count} articles</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* FAQ Items */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Questions</CardTitle>
          <CardDescription>
            Most frequently asked questions from our community
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item) => (
              <AccordionItem key={item.id} value={`item-${item.id}`}>
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    <span>{item.question}</span>
                    <Badge variant="secondary" className="ml-2">
                      {item.category}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <p className="text-muted-foreground">{item.answer}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        <span>{item.helpful} found this helpful</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-auto p-0">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Was this helpful?
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
