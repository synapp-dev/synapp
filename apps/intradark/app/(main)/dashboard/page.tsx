import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { getCurrentUserProfiles } from "@/lib/get-current-user-profiles";
import { User, Gamepad2 } from "lucide-react";

export default async function DashboardPage() {
  const profiles = await getCurrentUserProfiles();

  if (!profiles) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Sign in with Steam to view your profile and stats.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              You are not signed in. Sign in with Steam to continue.
            </p>
            <Button asChild>
              <a
                href="/api/auth/steam"
                className="inline-flex items-center gap-2"
              >
                <Image
                  src="/images/logos/steam-logo-white.svg"
                  alt="Steam"
                  width={20}
                  height={20}
                />
                Sign in with Steam
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { userProfile, steamProfile } = profiles;
  const displayName =
    userProfile.display_name ??
    userProfile.username ??
    userProfile.email ??
    "User";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back. Here is your profile information.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <Avatar className="h-12 w-12">
              {userProfile.avatar_url && (
                <AvatarImage src={userProfile.avatar_url} alt={displayName} />
              )}
              <AvatarFallback>
                <User className="h-6 w-6 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>Your profile</CardTitle>
              <CardDescription>Account and display info</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Display name
              </p>
              <p className="text-sm">{displayName}</p>
            </div>
            {userProfile.email && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Email
                </p>
                <p className="text-sm">{userProfile.email}</p>
              </div>
            )}
            {userProfile.username && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Username
                </p>
                <p className="text-sm">{userProfile.username}</p>
              </div>
            )}
            {userProfile.bio && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bio</p>
                <p className="text-sm">{userProfile.bio}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {userProfile.is_verified && (
                <Badge variant="secondary">Verified</Badge>
              )}
              {userProfile.is_premium && (
                <Badge variant="secondary">Premium</Badge>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Last active
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(userProfile.last_active).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {steamProfile ? (
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <Avatar className="h-12 w-12">
                {(steamProfile.avatarfull ?? steamProfile.avatarmedium ?? steamProfile.avatar) && (
                  <AvatarImage
                    src={
                      steamProfile.avatarfull ??
                      steamProfile.avatarmedium ??
                      steamProfile.avatar ??
                      ""
                    }
                    alt={steamProfile.personaname}
                  />
                )}
                <AvatarFallback>
                  <Gamepad2 className="h-6 w-6 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>Steam profile</CardTitle>
                <CardDescription>Linked Steam account</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Persona name
                </p>
                <p className="text-sm">{steamProfile.personaname}</p>
              </div>
              {steamProfile.realname && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Real name
                  </p>
                  <p className="text-sm">{steamProfile.realname}</p>
                </div>
              )}
              {steamProfile.profileurl && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Profile
                  </p>
                  <a
                    href={steamProfile.profileurl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline break-all"
                  >
                    {steamProfile.profileurl}
                  </a>
                </div>
              )}
              {steamProfile.loccountrycode && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Country
                  </p>
                  <p className="text-sm">{steamProfile.loccountrycode}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Steam ID
                </p>
                <p className="text-sm font-mono text-muted-foreground">
                  {steamProfile.steamid}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Steam profile</CardTitle>
              <CardDescription>No Steam account linked</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your account is not linked to a Steam profile. Sign in with
                Steam to link your profile.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
