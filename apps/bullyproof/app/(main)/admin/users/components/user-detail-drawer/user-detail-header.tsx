import Image from "next/image";
import { getDisplayName } from "./utils";
import type { UserWithRolesAndSchools } from "@/entities/me/api/endpoints";

interface UserDetailHeaderProps {
  user: UserWithRolesAndSchools | null;
}

export function UserDetailHeader({ user }: UserDetailHeaderProps) {
  if (!user) return null;

  return (
    <div className="p-4 bg-muted shrink-0">
      <div className="flex items-center gap-4">
        {/* Bullyproof Logo */}
        <Image
          src="/images/bullyproof-logo.svg"
          alt="Bullyproof Logo"
          width={120}
          height={32}
          className="h-8 w-auto"
        />

        {/* Vertical Separator */}
        <div className="h-6 w-px bg-border" />

        {/* Name and Email in Flex Column */}
        <div className="flex flex-col">
          <h2 className="font-semibold text-xl truncate">
            {getDisplayName(user)}
          </h2>
          <p className="text-xs text-muted-foreground truncate">
            {user.email}
          </p>
        </div>
      </div>
    </div>
  );
}
