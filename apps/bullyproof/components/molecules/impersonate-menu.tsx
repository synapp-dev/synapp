import { useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import { Button } from "@workspace/ui/components/button";
import { Drama, VenetianMask } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

// Dummy user data
const dummyUsers = [
  {
    id: "1",
    name: "John Smith",
    email: "john.smith@example.com",
    role: "Teacher",
  },
  {
    id: "2",
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    role: "Principal",
  },
  {
    id: "3",
    name: "Mike Davis",
    email: "mike.davis@example.com",
    role: "Teacher",
  },
  {
    id: "4",
    name: "Emily Wilson",
    email: "emily.wilson@example.com",
    role: "Counselor",
  },
  {
    id: "5",
    name: "David Brown",
    email: "david.brown@example.com",
    role: "Teacher",
  },
  {
    id: "6",
    name: "Lisa Anderson",
    email: "lisa.anderson@example.com",
    role: "Vice Principal",
  },
  {
    id: "7",
    name: "Tom Miller",
    email: "tom.miller@example.com",
    role: "Teacher",
  },
  {
    id: "8",
    name: "Jennifer Taylor",
    email: "jennifer.taylor@example.com",
    role: "Teacher",
  },
];

export function ImpersonateMenu() {
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<
    (typeof dummyUsers)[0] | null
  >(null);

  const handleUserSelect = (user: (typeof dummyUsers)[0]) => {
    console.log("Impersonating user:", user);
    setSelectedUser(user);
    setOpen(false);
    // TODO: Implement actual impersonation logic
  };

  const handleStopImpersonating = () => {
    setSelectedUser(null);
    setOpen(false);
    // TODO: Implement stop impersonation logic
  };

  const handleImpersonatingButtonClick = () => {
    if (selectedUser) {
      setOpen(true);
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      {selectedUser ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={handleImpersonatingButtonClick}
              className={cn(
                "h-9 gap-2 justify-start text-orange-800 transition-all duration-300 animate-pulse-subtle border-orange-200",
                "hover:bg-orange-100"
              )}
            >
              <VenetianMask className="h-5 w-5 animate-float-gentle" />
              <span className="truncate max-w-[120px]">
                {selectedUser.name}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Impersonating user</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setOpen(true)}
              className="h-9 gap-2 justify-center items-center"
            >
              <Drama className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Impersonate User</p>
          </TooltipContent>
        </Tooltip>
      )}
      <CommandDialog open={open} onOpenChange={setOpen}>
        {selectedUser ? (
          // Impersonation Status View
          <>
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <VenetianMask className="h-4 w-4 text-orange-600" />
                <h2 className="text-lg font-semibold">
                  Currently Impersonating
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                You are viewing the platform as this user
              </p>
            </div>
            <div className="px-4 py-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 font-semibold text-sm">
                    {selectedUser.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>
                <div>
                  <h3 className="font-medium">{selectedUser.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.email}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium">Role</span>
                  <Badge variant="secondary">{selectedUser.role}</Badge>
                </div>

                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium">Assigned Schools</span>
                  <span className="text-sm text-muted-foreground">
                    Lincoln Elementary, Roosevelt High
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium">Session Duration</span>
                  <span className="text-sm text-muted-foreground">
                    2 minutes
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium">Started At</span>
                  <span className="text-sm text-muted-foreground">2:34 PM</span>
                </div>
              </div>

              <Button
                variant="destructive"
                onClick={handleStopImpersonating}
                className="w-full mt-4"
              >
                Stop Impersonating
              </Button>
            </div>
          </>
        ) : (
          // User Selection View
          <>
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Drama className="h-4 w-4" />
                <h2 className="text-lg font-semibold">Impersonate User</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Use this tool to see what the selected user sees when browsing
                the platform.
              </p>
            </div>
            <CommandInput placeholder="Search users to impersonate..." />
            <CommandList>
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup heading="Users">
                {dummyUsers.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={`${user.name} ${user.email}`}
                    onSelect={() => handleUserSelect(user)}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{user.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {user.role}
                      </Badge>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </>
        )}
      </CommandDialog>
    </>
  );
}
