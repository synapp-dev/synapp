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
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Input } from "@workspace/ui/components/input";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Users, UserPlus, Mail, Phone, Calendar, Search } from "lucide-react";
import Link from "next/link";

export default async function TeachersPage({
  params,
}: {
  params: Promise<{ school_id: string }>;
}) {
  const { school_id } = await params;
  const { data: school } = await schoolServerApi.get.schoolBySlug(school_id);

  // Helper function to convert teacher names to URL-friendly slugs
  const getTeacherSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-');

  // Mock data for teachers
  const teachers = [
    {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah.johnson@school.edu",
      phone: "+1 (555) 123-4567",
      avatar: "/api/placeholder/40/40",
      role: "Lead Teacher",
      department: "Elementary",
      classes: ["Grade 5A", "Grade 5B"],
      students: 56,
      joinDate: "2022-08-15",
      status: "active",
      lastLogin: "2 hours ago",
      completionRate: 94,
    },
    {
      id: 2,
      name: "Michael Chen",
      email: "michael.chen@school.edu",
      phone: "+1 (555) 234-5678",
      avatar: "/api/placeholder/40/40",
      role: "Teacher",
      department: "Elementary",
      classes: ["Grade 3B"],
      students: 24,
      joinDate: "2023-01-10",
      status: "active",
      lastLogin: "1 day ago",
      completionRate: 87,
    },
    {
      id: 3,
      name: "Emily Davis",
      email: "emily.davis@school.edu",
      phone: "+1 (555) 345-6789",
      avatar: "/api/placeholder/40/40",
      role: "Senior Teacher",
      department: "Middle School",
      classes: ["Grade 7C", "Grade 7D"],
      students: 62,
      joinDate: "2021-09-01",
      status: "active",
      lastLogin: "3 hours ago",
      completionRate: 91,
    },
    {
      id: 4,
      name: "Lisa Wilson",
      email: "lisa.wilson@school.edu",
      phone: "+1 (555) 456-7890",
      avatar: "/api/placeholder/40/40",
      role: "Teacher",
      department: "Elementary",
      classes: ["Grade 2A"],
      students: 22,
      joinDate: "2023-03-15",
      status: "on_leave",
      lastLogin: "1 week ago",
      completionRate: 78,
    },
    {
      id: 5,
      name: "David Brown",
      email: "david.brown@school.edu",
      phone: "+1 (555) 567-8901",
      avatar: "/api/placeholder/40/40",
      role: "Teacher",
      department: "Middle School",
      classes: ["Grade 6B"],
      students: 29,
      joinDate: "2022-11-20",
      status: "active",
      lastLogin: "30 minutes ago",
      completionRate: 96,
    },
  ];

  const activeTeachers = teachers.filter(t => t.status === "active").length;
  const totalStudents = teachers.reduce((sum, teacher) => sum + teacher.students, 0);
  const averageCompletion = Math.round(
    teachers.reduce((sum, teacher) => sum + teacher.completionRate, 0) / teachers.length
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Teachers at {school?.name}</h1>
          <p className="text-muted-foreground">
            Manage your school's teaching staff
          </p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Teacher
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachers.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeTeachers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Across all classes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageCompletion}%</div>
            <p className="text-xs text-muted-foreground">
              Lesson completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teachers.filter(t => t.status === "on_leave").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently unavailable
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teachers..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">Filter</Button>
            <Button variant="outline">Sort</Button>
          </div>
        </CardContent>
      </Card>

      {/* Teachers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Teachers</CardTitle>
          <CardDescription>
            Complete list of teaching staff
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={teacher.avatar} />
                        <AvatarFallback>
                          {teacher.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link 
                          href={`/schools/${school_id}/teachers/${getTeacherSlug(teacher.name)}`}
                          className="font-medium hover:text-blue-600 hover:underline"
                        >
                          {teacher.name}
                        </Link>
                        <div className="text-sm text-muted-foreground">
                          {teacher.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{teacher.role}</div>
                      <div className="text-sm text-muted-foreground">
                        {teacher.department}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {teacher.classes.map((className, index) => (
                        <Badge key={index} variant="secondary" className="mr-1">
                          {className}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{teacher.students}</div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{teacher.completionRate}%</div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full"
                          style={{ width: `${teacher.completionRate}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={teacher.status === "active" ? "default" : "secondary"}
                    >
                      {teacher.status === "active" ? "Active" : "On Leave"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {teacher.lastLogin}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Mail className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Phone className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Teacher Cards View (Alternative) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teachers.map((teacher) => (
          <Card key={teacher.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={teacher.avatar} />
                  <AvatarFallback>
                    {teacher.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Link 
                    href={`/schools/${school_id}/teachers/${getTeacherSlug(teacher.name)}`}
                    className="text-lg font-semibold hover:text-blue-600 hover:underline"
                  >
                    {teacher.name}
                  </Link>
                  <CardDescription>{teacher.role}</CardDescription>
                </div>
                <Badge 
                  variant={teacher.status === "active" ? "default" : "secondary"}
                >
                  {teacher.status === "active" ? "Active" : "On Leave"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{teacher.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{teacher.phone}</span>
                </div>
              </div>

              {/* Classes */}
              <div>
                <p className="text-sm font-medium mb-2">Classes</p>
                <div className="flex flex-wrap gap-1">
                  {teacher.classes.map((className, index) => (
                    <Badge key={index} variant="outline">
                      {className}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Students</p>
                  <p className="font-medium">{teacher.students}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Completion</p>
                  <p className="font-medium">{teacher.completionRate}%</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Lesson Progress</span>
                  <span>{teacher.completionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${teacher.completionRate}%` }}
                  />
                </div>
              </div>

              {/* Last Login */}
              <p className="text-xs text-muted-foreground">
                Last login: {teacher.lastLogin}
              </p>

              {/* Actions */}
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Mail className="h-3 w-3 mr-1" />
                  Email
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
