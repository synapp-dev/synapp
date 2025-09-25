import { User } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { useDemoUserSwitcherStore } from "@/stores/demo-user-switcher-store";

export function DemoUserSwitcher() {
  const selectedUser = useDemoUserSwitcherStore((s) => s.selectedUser);
  const setSelectedUser = useDemoUserSwitcherStore((s) => s.setSelectedUser);
  const open = useDemoUserSwitcherStore((s) => s.isOpen);
  const setOpen = useDemoUserSwitcherStore((s) => s.setOpen);
  return (
    <div className="flex items-center gap-2">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="lg">
            <User className="w-4 h-4" /> {selectedUser}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => setSelectedUser("Bullyproof Admin")}>
            <User className="w-4 h-4" />
            Bullyproof Admin
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSelectedUser("Bullyproof Staff")}>
            <User className="w-4 h-4" />
            Bullyproof Staff
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSelectedUser("School Admin")}>
            <User className="w-4 h-4" />
            School Admin
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSelectedUser("Teacher")}>
            <User className="w-4 h-4" />
            Teacher
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSelectedUser("Roaming Teacher")}>
            <User className="w-4 h-4" />
            Roaming Teacher
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setSelectedUser("Government Official")}
          >
            <User className="w-4 h-4" />
            Government Official
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
