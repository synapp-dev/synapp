import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Link from "next/link";

export default function LessonsPage({
  params,
}: {
  params: { school_id: string };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lessons</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">Lessons</h1>
          <p className="text-sm text-muted-foreground">
            Lessons are a collection of activities that are designed to help
            students learn about bullying and how to prevent it.
          </p>
        </div>
        <div className="flex justify-end">
          <Link href={`/schools/${params.school_id}/lessons/new`}>
            <Button>Add Lesson</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
