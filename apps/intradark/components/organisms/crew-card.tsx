import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { ChevronsRight } from "lucide-react";
import Image from "next/image";

export function CrewCard() {
  return (
    <Card className="h-full gap-3">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <h1 className="text-xs font-bold text-muted-foreground">Crew</h1>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-0 h-full max-h-10">
        <Image
          src={`https://avatars.steamstatic.com/89223472366b237e9678f98e8636c591f6c91d16_full.jpg`}
          alt="form"
          width={400}
          height={400}
          className="rounded-full w-11 object-cover"
        />

        <ChevronsRight className="w-9 h-9 mx-6 text-muted-foreground" />
        <div className="flex items-center justify-between w-full gap-0 h-full max-h-10">
          {Array.from({ length: 4 }).map((_, index) => {
            return (
              <Image
                key={index}
                src={`https://avatars.steamstatic.com/89223472366b237e9678f98e8636c591f6c91d16_full.jpg`}
                alt="form"
                width={400}
                height={400}
                className="rounded-full w-11 object-cover"
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
