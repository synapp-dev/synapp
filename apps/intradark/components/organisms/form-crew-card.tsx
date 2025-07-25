import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { CrewCard } from "./crew-card";
import { FormCard } from "./form-card";

export function FormCrewCard() {
  return (
    <Card>
      <CardContent className="grid grid-cols-5 p-0">
        <div className="col-span-2">
          <FormCard />
        </div>
        <div className="col-span-3">
          <CrewCard />
        </div>
      </CardContent>
    </Card>
  );
}
