import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";
import {
  Mail,
  MessageCircle,
  Phone,
  Clock,
  Send,
  CheckCircle,
  AlertTriangle,
  Users,
  BookOpen,
  Settings,
} from "lucide-react";
import { generateMetadataFromSegments } from "@/utils/metadata";

export const metadata = generateMetadataFromSegments(["support", "contact"]);

export default function ContactPage() {
  const contactMethods = [
    {
      title: "Email Support",
      description: "Get help via email with detailed responses",
      icon: Mail,
      responseTime: "Within 24 hours",
      availability: "24/7",
      color: "bg-blue-100 text-blue-600",
    },
    {
      title: "Live Chat",
      description: "Chat with our support team in real-time",
      icon: MessageCircle,
      responseTime: "Immediate",
      availability: "Mon-Fri 9AM-6PM EST",
      color: "bg-green-100 text-green-600",
    },
    {
      title: "Phone Support",
      description: "Speak directly with our support team",
      icon: Phone,
      responseTime: "Immediate",
      availability: "Mon-Fri 9AM-6PM EST",
      color: "bg-purple-100 text-purple-600",
    },
  ];

  const supportTopics = [
    { value: "technical", label: "Technical Support" },
    { value: "billing", label: "Billing & Account" },
    { value: "feature", label: "Feature Request" },
    { value: "bug", label: "Bug Report" },
    { value: "training", label: "Training & Onboarding" },
    { value: "other", label: "Other" },
  ];

  const priorityLevels = [
    {
      value: "low",
      label: "Low",
      description: "General questions or minor issues",
    },
    {
      value: "medium",
      label: "Medium",
      description: "Important issues affecting workflow",
    },
    {
      value: "high",
      label: "High",
      description: "Critical issues affecting system usage",
    },
    {
      value: "urgent",
      label: "Urgent",
      description: "System down or data loss",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Contact Support
            </h1>
            <p className="text-muted-foreground">
              Get help from our support team through multiple channels
            </p>
          </div>
        </div>
      </div>

      {/* Contact Methods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {contactMethods.map((method, index) => {
          const Icon = method.icon;
          return (
            <Card
              key={index}
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${method.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{method.title}</CardTitle>
                    <CardDescription>{method.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Response Time:
                    </span>
                    <span className="font-medium">{method.responseTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Availability:</span>
                    <span className="font-medium">{method.availability}</span>
                  </div>
                </div>
                <Button className="w-full mt-3">
                  {method.title === "Email Support"
                    ? "Send Email"
                    : method.title === "Live Chat"
                      ? "Start Chat"
                      : "Call Now"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Contact Form */}
      <Card>
        <CardHeader>
          <CardTitle>Send us a Message</CardTitle>
          <CardDescription>
            Fill out the form below and we&apos;ll get back to you as soon as
            possible
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" placeholder="Enter your full name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Support Topic *</Label>
              <select className="w-full p-2 border rounded-md">
                <option value="">Select a topic</option>
                {supportTopics.map((topic) => (
                  <option key={topic.value} value={topic.value}>
                    {topic.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority Level *</Label>
              <select className="w-full p-2 border rounded-md">
                <option value="">Select priority</option>
                {priorityLevels.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label} - {priority.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              placeholder="Brief description of your issue or question"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              placeholder="Please provide as much detail as possible about your issue or question..."
              rows={6}
            />
          </div>

          <div className="flex gap-3">
            <Button className="flex-1">
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
            <Button variant="outline">Save Draft</Button>
          </div>
        </CardContent>
      </Card>

      {/* Support Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Before You Contact Us</CardTitle>
            <CardDescription>
              Try these resources first to get quick answers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <BookOpen className="mr-2 h-4 w-4" />
              Check FAQ
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              Community Forum
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Settings className="mr-2 h-4 w-4" />
              System Status
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response Times</CardTitle>
            <CardDescription>
              Expected response times by priority level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-1 bg-red-100 text-red-600 rounded">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium">Urgent</div>
                <div className="text-sm text-muted-foreground">
                  Within 2 hours
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-1 bg-yellow-100 text-yellow-600 rounded">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium">High</div>
                <div className="text-sm text-muted-foreground">
                  Within 4 hours
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-1 bg-blue-100 text-blue-600 rounded">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium">Medium/Low</div>
                <div className="text-sm text-muted-foreground">
                  Within 24 hours
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Emergency Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Support</CardTitle>
          <CardDescription>
            For critical issues that require immediate attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <div className="font-medium text-red-900">
                  Critical System Issues
                </div>
                <div className="text-sm text-red-700 mt-1">
                  For system outages, data loss, or security incidents, contact
                  our emergency support line.
                </div>
                <div className="text-sm font-medium text-red-900 mt-2">
                  Emergency Line: 1-800-BULLYPROOF (24/7)
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
