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
import { Label } from "@workspace/ui/components/label";
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
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import { generateMetadataFromSegments } from "@/utils/metadata";
import { redirect } from "next/navigation";

export const metadata = generateMetadataFromSegments(["schools", "settings"]);
import {
  Settings,
  School,
  Bell,
  Shield,
  Users,
  Mail,
  Globe,
  Save,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;
  const { data: school } = await schoolServerApi.get.schoolBySlug(school_id);
  
  // Redirect to home page - this page is disabled
  redirect(`/schools/${school_id}/home`);

  // Mock settings data
  const schoolSettings = {
    name: school?.name || "Example Elementary School",
    email: "admin@example.edu",
    phone: "+1 (555) 123-4567",
    address: "123 Education Street, Learning City, LC 12345",
    website: "https://example.edu",
    timezone: "America/New_York",
    language: "English",
    established: "1995",
    enrollment: 1247,
    grades: "K-8",
    principal: "Dr. Sarah Johnson",
  };

  const notificationSettings = {
    emailNotifications: true,
    incidentAlerts: true,
    weeklyReports: true,
    teacherUpdates: false,
    parentNotifications: true,
    systemMaintenance: true,
    marketingEmails: false,
  };

  const integrationSettings = {
    googleWorkspace: true,
    microsoftTeams: false,
    zoom: true,
    canvas: true,
    parentPortal: true,
    studentInformationSystem: "PowerSchool",
  };

  const securitySettings = {
    twoFactorAuth: true,
    passwordPolicy: "Strong",
    sessionTimeout: "8 hours",
    ipRestrictions: false,
    auditLogging: true,
    dataRetention: "7 years",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Settings - {school?.name}</h1>
          <p className="text-muted-foreground">
            Manage your school's configuration and preferences
          </p>
        </div>
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <School className="h-4 w-4" />
            <span>General</span>
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center space-x-2"
          >
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger
            value="integrations"
            className="flex items-center space-x-2"
          >
            <Globe className="h-4 w-4" />
            <span>Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <School className="h-5 w-5" />
                <span>School Information</span>
              </CardTitle>
              <CardDescription>
                Basic information about your school
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="school-name">School Name</Label>
                  <Input
                    id="school-name"
                    defaultValue={schoolSettings.name}
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-email">Contact Email</Label>
                  <Input
                    id="school-email"
                    defaultValue={schoolSettings.email}
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-phone">Phone Number</Label>
                  <Input
                    id="school-phone"
                    defaultValue={schoolSettings.phone}
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-website">Website</Label>
                  <Input
                    id="school-website"
                    defaultValue={schoolSettings.website}
                    readOnly
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-address">Address</Label>
                <Textarea
                  id="school-address"
                  defaultValue={schoolSettings.address}
                  readOnly
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>School Details</CardTitle>
              <CardDescription>
                Additional information about your institution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="established">Established</Label>
                  <Input
                    id="established"
                    defaultValue={schoolSettings.established}
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enrollment">Enrollment</Label>
                  <Input
                    id="enrollment"
                    defaultValue={schoolSettings.enrollment.toString()}
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grades">Grade Levels</Label>
                  <Input
                    id="grades"
                    defaultValue={schoolSettings.grades}
                    readOnly
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="principal">Principal</Label>
                <Input
                  id="principal"
                  defaultValue={schoolSettings.principal}
                  readOnly
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Regional Settings</CardTitle>
              <CardDescription>
                Configure timezone and language preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue={schoolSettings.timezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">
                        Eastern Time
                      </SelectItem>
                      <SelectItem value="America/Chicago">
                        Central Time
                      </SelectItem>
                      <SelectItem value="America/Denver">
                        Mountain Time
                      </SelectItem>
                      <SelectItem value="America/Los_Angeles">
                        Pacific Time
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select defaultValue={schoolSettings.language}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Email Notifications</span>
              </CardTitle>
              <CardDescription>
                Configure when and how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    defaultChecked={notificationSettings.emailNotifications}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Incident Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when new incidents are reported
                    </p>
                  </div>
                  <Switch
                    defaultChecked={notificationSettings.incidentAlerts}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive weekly summary reports
                    </p>
                  </div>
                  <Switch defaultChecked={notificationSettings.weeklyReports} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Teacher Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications about teacher activities
                    </p>
                  </div>
                  <Switch
                    defaultChecked={notificationSettings.teacherUpdates}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Parent Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send notifications to parents
                    </p>
                  </div>
                  <Switch
                    defaultChecked={notificationSettings.parentNotifications}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>System Maintenance</Label>
                    <p className="text-sm text-muted-foreground">
                      Alerts about system maintenance
                    </p>
                  </div>
                  <Switch
                    defaultChecked={notificationSettings.systemMaintenance}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive product updates and tips
                    </p>
                  </div>
                  <Switch
                    defaultChecked={notificationSettings.marketingEmails}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Settings */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Third-Party Integrations</span>
              </CardTitle>
              <CardDescription>
                Connect with external services and platforms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Google Workspace</Label>
                    <p className="text-sm text-muted-foreground">
                      Sync with Google Classroom and Drive
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        integrationSettings.googleWorkspace
                          ? "default"
                          : "secondary"
                      }
                    >
                      {integrationSettings.googleWorkspace
                        ? "Connected"
                        : "Not Connected"}
                    </Badge>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Microsoft Teams</Label>
                    <p className="text-sm text-muted-foreground">
                      Integration with Microsoft Teams
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        integrationSettings.microsoftTeams
                          ? "default"
                          : "secondary"
                      }
                    >
                      {integrationSettings.microsoftTeams
                        ? "Connected"
                        : "Not Connected"}
                    </Badge>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Zoom</Label>
                    <p className="text-sm text-muted-foreground">
                      Video conferencing integration
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        integrationSettings.zoom ? "default" : "secondary"
                      }
                    >
                      {integrationSettings.zoom ? "Connected" : "Not Connected"}
                    </Badge>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Canvas LMS</Label>
                    <p className="text-sm text-muted-foreground">
                      Learning management system integration
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        integrationSettings.canvas ? "default" : "secondary"
                      }
                    >
                      {integrationSettings.canvas
                        ? "Connected"
                        : "Not Connected"}
                    </Badge>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Parent Portal</Label>
                    <p className="text-sm text-muted-foreground">
                      Parent communication portal
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        integrationSettings.parentPortal
                          ? "default"
                          : "secondary"
                      }
                    >
                      {integrationSettings.parentPortal
                        ? "Connected"
                        : "Not Connected"}
                    </Badge>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Security & Privacy</span>
              </CardTitle>
              <CardDescription>
                Configure security settings and data protection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require 2FA for all user accounts
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        securitySettings.twoFactorAuth ? "default" : "secondary"
                      }
                    >
                      {securitySettings.twoFactorAuth ? "Enabled" : "Disabled"}
                    </Badge>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Password Policy</Label>
                    <p className="text-sm text-muted-foreground">
                      Current policy: {securitySettings.passwordPolicy}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Edit Policy
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Session Timeout</Label>
                    <p className="text-sm text-muted-foreground">
                      Auto-logout after: {securitySettings.sessionTimeout}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Change
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>IP Restrictions</Label>
                    <p className="text-sm text-muted-foreground">
                      Restrict access to specific IP addresses
                    </p>
                  </div>
                  <Switch defaultChecked={securitySettings.ipRestrictions} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Audit Logging</Label>
                    <p className="text-sm text-muted-foreground">
                      Log all system activities
                    </p>
                  </div>
                  <Switch defaultChecked={securitySettings.auditLogging} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Data Retention</Label>
                    <p className="text-sm text-muted-foreground">
                      Keep data for: {securitySettings.dataRetention}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <span>Danger Zone</span>
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Reset All Settings</Label>
                  <p className="text-sm text-muted-foreground">
                    Reset all settings to default values
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Reset Settings
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Delete School Account</Label>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this school account and all data
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
