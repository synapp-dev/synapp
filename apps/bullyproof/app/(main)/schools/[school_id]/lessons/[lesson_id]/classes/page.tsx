"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { User, AlertCircle, StickyNote, Users } from "lucide-react";
import { Label } from "@workspace/ui/components/label";
import { usePageTitle } from "@/hooks/use-page-title";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  attendance?: boolean;
  accommodations: string[];
  notes: string;
}

export default function LessonClassesPage() {
  usePageTitle(["schools", "lessons", "classes"]);
  const [useAttendance, setUseAttendance] = useState(true);
  const [students, setStudents] = useState<Student[]>([
    {
      id: "1",
      firstName: "Emma",
      lastName: "Watson",
      attendance: true,
      accommodations: ["Preferred seating near front"],
      notes: "",
    },
    {
      id: "2",
      firstName: "Jacob",
      lastName: "Martinez",
      attendance: true,
      accommodations: [],
      notes: "Extra time needed for activities",
    },
    {
      id: "3",
      firstName: "Olivia",
      lastName: "Brown",
      attendance: false,
      accommodations: ["No group work"],
      notes: "",
    },
    {
      id: "4",
      firstName: "Noah",
      lastName: "Taylor",
      attendance: true,
      accommodations: [],
      notes: "",
    },
    {
      id: "5",
      firstName: "Isabella",
      lastName: "Anderson",
      attendance: true,
      accommodations: ["Visual supports needed"],
      notes: "",
    },
    {
      id: "6",
      firstName: "Liam",
      lastName: "Garcia",
      attendance: true,
      accommodations: [],
      notes: "Parent requested to be notified about participation",
    },
    {
      id: "7",
      firstName: "Sophia",
      lastName: "Rodriguez",
      attendance: true,
      accommodations: ["Frequent breaks"],
      notes: "",
    },
    {
      id: "8",
      firstName: "Mason",
      lastName: "Lee",
      attendance: true,
      accommodations: [],
      notes: "",
    },
  ]);

  const updateStudentAttendance = (studentId: string, attendance: boolean) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId ? { ...student, attendance } : student
      )
    );
  };

  const updateStudentNotes = (studentId: string, notes: string) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId ? { ...student, notes } : student
      )
    );
  };

  const presentCount = students.filter((s) => s.attendance).length;
  const totalCount = students.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Class Roster & Attendance</h1>
          <p className="text-muted-foreground">
            Manage your class roster, track attendance, and add student notes.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={useAttendance}
              onCheckedChange={setUseAttendance}
              id="attendance-toggle"
            />
            <Label htmlFor="attendance-toggle" className="cursor-pointer">
              Track attendance
            </Label>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-3xl font-bold">{totalCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-green-600" />
              <span className="text-3xl font-bold text-green-600">
                {presentCount}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <span className="text-3xl font-bold text-muted-foreground">
                {totalCount - presentCount}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roster Table */}
      <Card>
        <CardHeader>
          <CardTitle>Class Roster</CardTitle>
          <CardDescription>
            Review accommodations, track attendance, and add quick notes for
            each student
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Avatar</TableHead>
                <TableHead>Name</TableHead>
                {useAttendance && (
                  <TableHead className="w-[150px]">Attendance</TableHead>
                )}
                <TableHead className="w-[300px]">Accommodations</TableHead>
                <TableHead className="min-w-[300px]">Quick Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {student.firstName[0]}
                        {student.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {student.firstName} {student.lastName}
                    </div>
                  </TableCell>
                  {useAttendance && (
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={student.attendance ?? false}
                          onCheckedChange={(checked) =>
                            updateStudentAttendance(student.id, checked)
                          }
                        />
                        {student.attendance ? (
                          <Badge
                            variant="outline"
                            className="border-green-200 text-green-700 bg-green-50"
                          >
                            Present
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-orange-200 text-orange-700 bg-orange-50"
                          >
                            Absent
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {student.accommodations.length > 0 ? (
                        student.accommodations.map((acc, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="bg-blue-50 text-blue-700 border-blue-200"
                          >
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {acc}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          None
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Textarea
                      placeholder="Add quick notes about this student..."
                      value={student.notes}
                      onChange={(e) =>
                        updateStudentNotes(student.id, e.target.value)
                      }
                      className="min-h-[60px] resize-none"
                      rows={2}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Preparation Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>
              Review each student's accommodations before starting the lesson
            </li>
            <li>Use quick notes to track specific behaviors or observations</li>
            <li>Mark attendance to keep accurate records</li>
            <li>
              Notes are saved automatically and will be visible in lesson
              history
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
