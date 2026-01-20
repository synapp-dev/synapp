import { Card } from "@workspace/ui/components/card";

export const TeacherOverviewSection = () => {
  return (
    <div className="grid grid-cols-10 gap-4 h-full">
      <Card className="col-span-2 h-full" />
      <Card className="col-span-3 h-full" />
      <Card className="col-span-5 h-full" />
    </div>
  );
};