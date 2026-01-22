import { redirect } from "next/navigation";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ course_name: string; topic: string }>;
}) {
  const { course_name, topic } = await params;
  redirect(`/courses/${course_name}/${topic}/slides`);
}
