"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@workspace/ui/components/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { AlertCircle, Target, Trophy, Users, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";

interface LeetifyProfile {
  meta: {
    name: string;
    steamAvatarUrl: string;
    steam64Id: string;
    faceitNickname?: string;
    isProPlan: boolean;
    isLeetifyStaff: boolean;
  };
  recentGameRatings: {
    aim: number;
    positioning: number;
    utility: number;
    clutch: number;
    leetify: number;
    gamesPlayed: number;
  };
  teammates: Array<{
    steamNickname: string;
    steamAvatarUrl: string;
    matchesPlayedTogether: number;
    winRateTogether: number;
    teammateLeetifyRating: number;
  }>;
}

interface FaceitProfile {
  result: string;
  payload: {
    id: string;
    nickname: string;
    avatar: string;
    country: string;
    games: {
      cs2?: {
        faceit_elo: number;
        skill_level: number;
        skill_level_label: string;
        region: string;
      };
      csgo?: {
        faceit_elo: number;
        skill_level: number;
        skill_level_label: string;
        region: string;
      };
    };
  };
}

export default function ProfilePage() {
  const params = useParams();
  const steamId = params.id as string;
  
  const [leetifyProfile, setLeetifyProfile] = useState<LeetifyProfile | null>(null);
  const [faceitProfile, setFaceitProfile] = useState<FaceitProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [faceitLoading, setFaceitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faceitError, setFaceitError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeetifyProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/profile/${steamId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch profile');
        }
        
        const data = await response.json();
        setLeetifyProfile(data);

        // If faceit nickname exists, fetch faceit data
        if (data?.meta?.faceitNickname) {
          fetchFaceitProfile(data.meta.faceitNickname);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    const fetchFaceitProfile = async (nickname: string) => {
      try {
        setFaceitLoading(true);
        setFaceitError(null);
        
        const response = await fetch(`/api/faceit/${nickname}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch Faceit profile');
        }
        
        const data = await response.json();
        setFaceitProfile(data);
      } catch (err) {
        setFaceitError(err instanceof Error ? err.message : 'Failed to load Faceit data');
        console.warn('Faceit profile fetch failed:', err);
      } finally {
        setFaceitLoading(false);
      }
    };

    if (steamId) {
      fetchLeetifyProfile();
    }
  }, [steamId]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold">CS2 Profile</h1>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader className="text-center">
              <Skeleton className="w-24 h-24 rounded-full mx-auto mb-4" />
              <Skeleton className="h-6 w-32 mx-auto mb-2" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </CardHeader>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="text-center">
                    <Skeleton className="h-8 w-16 mx-auto mb-2" />
                    <Skeleton className="h-4 w-12 mx-auto" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold">CS2 Profile</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!leetifyProfile) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold">CS2 Profile</h1>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Profile not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">CS2 Profile</h1>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={leetifyProfile.meta.steamAvatarUrl} />
                <AvatarFallback>
                  {leetifyProfile.meta.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle>{leetifyProfile.meta.name}</CardTitle>
            {leetifyProfile.meta.faceitNickname && (
              <p className="text-muted-foreground">
                FACEIT: {leetifyProfile.meta.faceitNickname}
              </p>
            )}
            <div className="flex justify-center gap-2 mt-2">
              {leetifyProfile.meta.isProPlan && (
                <Badge variant="default">Pro Plan</Badge>
              )}
              {leetifyProfile.meta.isLeetifyStaff && (
                <Badge variant="secondary">Leetify Staff</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Steam ID</p>
              <p className="font-mono text-sm">{leetifyProfile.meta.steam64Id}</p>
            </div>
          </CardContent>
        </Card>

        {/* Leetify Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Leetify Stats
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {leetifyProfile.recentGameRatings.gamesPlayed} recent games
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {leetifyProfile.recentGameRatings.aim.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Target className="w-3 h-3" />
                  Aim
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {leetifyProfile.recentGameRatings.positioning.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Positioning</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">
                  {leetifyProfile.recentGameRatings.utility.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Utility</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {(leetifyProfile.recentGameRatings.leetify * 100).toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <Trophy className="w-3 h-3" />
                  Leetify Rating
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Faceit Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              FACEIT Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!leetifyProfile.meta.faceitNickname ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No FACEIT nickname linked
                </p>
              </div>
            ) : faceitLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              </div>
            ) : faceitError ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{faceitError}</AlertDescription>
              </Alert>
            ) : faceitProfile ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={faceitProfile.payload.avatar} />
                    <AvatarFallback>
                      {faceitProfile.payload.nickname.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{faceitProfile.payload.nickname}</p>
                    <p className="text-sm text-muted-foreground">
                      {faceitProfile.payload.country.toUpperCase()}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {faceitProfile.payload.games.cs2 && (
                    <div className="space-y-2">
                      <div className="text-center">
                        <Badge variant="outline" className="mb-2">
                          {faceitProfile.payload.games.cs2.skill_level_label}
                        </Badge>
                        <div className="text-xl font-bold">
                          {faceitProfile.payload.games.cs2.faceit_elo}
                        </div>
                        <div className="text-sm text-muted-foreground">CS2 ELO</div>
                        <div className="text-xs text-muted-foreground">
                          {faceitProfile.payload.games.cs2.region.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  )}
                  {faceitProfile.payload.games.csgo && (
                    <div className="space-y-2">
                      <div className="text-center">
                        <Badge variant="secondary" className="mb-2">
                          {faceitProfile.payload.games.csgo.skill_level_label}
                        </Badge>
                        <div className="text-lg font-bold">
                          {faceitProfile.payload.games.csgo.faceit_elo}
                        </div>
                        <div className="text-sm text-muted-foreground">CS:GO ELO</div>
                        <div className="text-xs text-muted-foreground">
                          {faceitProfile.payload.games.csgo.region.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No FACEIT data found
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Teammates */}
      {leetifyProfile.teammates && leetifyProfile.teammates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Recent Teammates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {leetifyProfile.teammates.slice(0, 6).map((teammate, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={teammate.steamAvatarUrl} />
                    <AvatarFallback>
                      {teammate.steamNickname.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {teammate.steamNickname}
                    </p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>{teammate.matchesPlayedTogether} games</span>
                      <span>•</span>
                      <span className={teammate.winRateTogether >= 0.5 ? 'text-green-500' : 'text-red-500'}>
                        {(teammate.winRateTogether * 100).toFixed(0)}% WR
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 