"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  PartyPopper,
  Rocket,
  ShoppingCart,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { SupersoltLogo } from "@/components/atoms/supersolt-logo";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { Switch } from "@workspace/ui/components/switch";
import { cn } from "@workspace/ui/lib/utils";
import type {
  OnboardingOrganisationDto,
  OnboardingVenueDto,
} from "@/entities/onboarding/model/types";
import {
  inferResumeStep,
  useFinalizeOnboardingMutation,
  useInviteOnboardingMutation,
  useOnboardingStateQuery,
  useSaveOnboardingOrganisationMutation,
  useSaveOnboardingVenueMutation,
} from "@/entities/onboarding/model/use-onboarding-setup";
import { meApi } from "@/entities/me/api/endpoints";
import { useMeStore } from "@/entities/me/model/store";
import { venuesKeys } from "@/entities/venues/model/keys";

const STEPS = [
  {
    id: 1,
    title: "Business Details",
    subtitle: "Your organisation info",
    icon: Building2,
  },
  {
    id: 2,
    title: "Add Venues",
    subtitle: "Set up your locations",
    icon: MapPin,
  },
  {
    id: 3,
    title: "Connect POS",
    subtitle: "Link your point of sale",
    icon: ShoppingCart,
  },
  {
    id: 4,
    title: "Invite Team",
    subtitle: "Bring your team on board",
    icon: Users,
  },
  {
    id: 5,
    title: "Review & Go Live",
    subtitle: "Confirm and launch",
    icon: PartyPopper,
  },
] as const;

const AU_TIMEZONES = [
  { value: "Australia/Melbourne", label: "Melbourne (AEST/AEDT)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  { value: "Australia/Brisbane", label: "Brisbane (AEST)" },
  { value: "Australia/Adelaide", label: "Adelaide (ACST/ACDT)" },
  { value: "Australia/Perth", label: "Perth (AWST)" },
];

function parseStep(raw: string | null): number {
  const n = Number.parseInt(raw ?? "1", 10);
  if (Number.isNaN(n) || n < 1) {
    return 1;
  }
  if (n > 5) {
    return 5;
  }
  return n;
}

/** Furthest step the user may open given persisted onboarding state. */
function maxReachableStep(
  organisation: OnboardingOrganisationDto | null,
  venues: OnboardingVenueDto[],
): number {
  if (!organisation) return 1;
  if (venues.length === 0) return 2;
  return 5;
}

function canGoToStep(
  targetId: number,
  organisation: OnboardingOrganisationDto | null,
  venues: OnboardingVenueDto[],
): boolean {
  return targetId <= maxReachableStep(organisation, venues);
}

type GoStepContext = {
  organisation?: OnboardingOrganisationDto | null;
  venues?: OnboardingVenueDto[];
};

export function SetupWizardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const setCurrentUser = useMeStore((s) => s.setCurrentUser);

  const {
    data: onboardingData,
    isPending: onboardingLoading,
    isError: onboardingIsError,
    error: onboardingError,
  } = useOnboardingStateQuery();
  const saveOrganisationMutation = useSaveOnboardingOrganisationMutation();
  const saveVenueMutation = useSaveOnboardingVenueMutation();
  const finalizeMutation = useFinalizeOnboardingMutation();
  const inviteMutation = useInviteOnboardingMutation();

  const [step, setStep] = useState(() => parseStep(searchParams.get("step")));
  const [organisation, setOrganisation] =
    useState<OnboardingOrganisationDto | null>(null);
  const [venues, setVenues] = useState<OnboardingVenueDto[]>([]);

  const [orgName, setOrgName] = useState("");
  const [abn, setAbn] = useState("");
  const [gst, setGst] = useState(false);

  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [venueTz, setVenueTz] = useState("Australia/Melbourne");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("crew");

  /** Splash first; wizard after “Get started” or when URL already has `?step=` (e.g. OAuth return). */
  const [wizardStarted, setWizardStarted] = useState(false);

  const syncStepUrl = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", String(next));
    router.replace(`/setup?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (onboardingIsError && onboardingError) {
      toast.error(onboardingError.message);
    }
  }, [onboardingIsError, onboardingError]);

  useEffect(() => {
    if (!onboardingData?.completed) {
      return;
    }
    router.replace("/dashboard");
  }, [onboardingData?.completed, router]);

  useEffect(() => {
    if (!onboardingData || onboardingData.completed) {
      return;
    }
    if (onboardingData.organisation) {
      setOrganisation(onboardingData.organisation);
      setOrgName(onboardingData.organisation.name);
      setAbn(onboardingData.organisation.abn ?? "");
      setGst(onboardingData.organisation.isGstRegistered);
    } else {
      setOrganisation(null);
      setOrgName("");
      setAbn("");
      setGst(false);
    }
    setVenues(onboardingData.venues ?? []);
  }, [onboardingData]);

  /** Skip splash when user already has saved progress; open wizard on the right step when URL has no `step`. */
  useLayoutEffect(() => {
    if (onboardingLoading || !onboardingData || onboardingData.completed) {
      return;
    }
    const org = onboardingData.organisation ?? null;
    const ven = onboardingData.venues ?? [];
    if (inferResumeStep(org, ven) > 1) {
      setWizardStarted(true);
    }
    if (searchParams.has("step")) {
      return;
    }
    const resume = inferResumeStep(org, ven);
    if (resume > 1) {
      setStep(resume);
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", String(resume));
      router.replace(`/setup?${params.toString()}`, { scroll: false });
    }
  }, [onboardingLoading, onboardingData, searchParams, router]);

  useEffect(() => {
    setStep(parseStep(searchParams.get("step")));
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.has("step")) {
      setWizardStarted(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (onboardingLoading) return;
    const urlStep = parseStep(searchParams.get("step"));
    const max = maxReachableStep(organisation, venues);
    if (urlStep > max) {
      const next = Math.max(1, max);
      setStep(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", String(next));
      router.replace(`/setup?${params.toString()}`, { scroll: false });
    }
  }, [onboardingLoading, organisation, venues, searchParams, router]);

  const squareAuthorizeHref = useMemo(() => {
    const v = venues[0];
    if (!organisation || !v) {
      return null;
    }
    const next = encodeURIComponent("/setup?step=4");
    return `/api/square/oauth/authorize?organisation=${encodeURIComponent(organisation.slug)}&venue=${encodeURIComponent(v.slug)}&next=${next}`;
  }, [organisation, venues]);

  const goStep = useCallback(
    (next: number, ctx?: GoStepContext) => {
      const org =
        ctx?.organisation !== undefined ? ctx.organisation : organisation;
      const ven = ctx?.venues !== undefined ? ctx.venues : venues;
      const clamped = Math.min(5, Math.max(1, next));
      if (!canGoToStep(clamped, org, ven)) {
        if (clamped >= 3 && ven.length === 0) {
          toast.info("Add at least one venue before continuing.");
        } else if (clamped >= 2 && !org) {
          toast.info("Complete business details first.");
        } else {
          toast.info("Complete the previous steps first.");
        }
        return;
      }
      setStep(clamped);
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", String(clamped));
      router.replace(`/setup?${params.toString()}`, { scroll: false });
    },
    [organisation, venues, router, searchParams],
  );

  const anySaving =
    saveOrganisationMutation.isPending ||
    saveVenueMutation.isPending ||
    finalizeMutation.isPending ||
    inviteMutation.isPending;

  const handleGetStarted = () => {
    setWizardStarted(true);
    const resume = inferResumeStep(organisation, venues);
    syncStepUrl(resume);
  };

  const handleNextFromBusiness = async () => {
    const name = orgName.trim();
    if (!name) {
      toast.error("Organisation name is required");
      return;
    }
    try {
      const org = await saveOrganisationMutation.mutateAsync({
        name,
        abn: abn.trim() || null,
        isGstRegistered: gst,
        organisationId: organisation?.id,
      });
      setOrganisation(org);
      goStep(2, { organisation: org });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleNextFromVenue = async () => {
    if (!organisation) {
      toast.error("Save business details first");
      return;
    }
    const name = venueName.trim();
    if (!name) {
      if (venues.length > 0) {
        goStep(3);
        return;
      }
      toast.error("Venue name is required");
      return;
    }
    try {
      const venue = await saveVenueMutation.mutateAsync({
        organisationId: organisation.id,
        name,
        addressLine1: venueAddress.trim() || null,
        timezone: venueTz,
      });
      const nextVenues = [...venues, venue];
      setVenues(nextVenues);
      setVenueName("");
      setVenueAddress("");
      goStep(3, { venues: nextVenues, organisation });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleSendInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    try {
      const data = await inviteMutation.mutateAsync({
        email,
        roleSlug: inviteRole,
      });
      if (data?.skipped) {
        toast.info(data.reason ?? "Invite skipped");
      } else {
        toast.success("Invitation sent");
      }
      setInviteEmail("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invite failed");
    }
  };

  const handleFinalize = async () => {
    try {
      await finalizeMutation.mutateAsync();
      const me = await meApi.get.currentUser();
      if (me.data) {
        setCurrentUser(me.data);
      }
      await queryClient.invalidateQueries({ queryKey: venuesKeys.groups() });
      toast.success("You are all set");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Finalize failed");
    }
  };

  if (onboardingLoading) {
    return (
      <div className="flex min-h-[24rem] items-center justify-center text-muted-foreground">
        Loading setup…
      </div>
    );
  }

  if (!wizardStarted) {
    return (
      <div className="flex min-h-[calc(100dvh-12rem)] w-full flex-col items-center justify-center bg-background px-6 py-16">
        <SupersoltLogo
          variant="wordmark"
          className="h-24 w-auto md:h-32"
          priority
        />
        <h1 className="mt-10 text-center text-3xl font-semibold tracking-tight md:text-4xl">
          Welcome to SuperSolt
        </h1>
        <p className="mt-4 max-w-lg text-center text-base text-muted-foreground md:text-lg">
          Let&apos;s get your restaurant operations running smoothly
        </p>
        <Button
          type="button"
          size="lg"
          className="mt-10 min-w-[12rem]"
          onClick={handleGetStarted}
        >
          Get started
        </Button>
      </div>
    );
  }

  const current = STEPS[step - 1];

  return (
    <div className="mx-auto flex h-[min(40rem,calc(100dvh-14rem))] min-h-0 w-full max-w-5xl flex-col gap-3 pb-8">
      <div className="flex shrink-0 items-center gap-2 px-0.5">
        <Rocket className="h-5 w-5 shrink-0" aria-hidden />
        <h2 className="text-lg font-semibold tracking-tight">Setup</h2>
      </div>

      <SidebarProvider
        className="flex min-h-0 flex-1 w-full [&_[data-slot=sidebar-wrapper]]:min-h-0"
        style={
          {
            "--sidebar-width": "min(20%, 16rem)",
            "--sidebar-width-icon": "2.5rem",
          } as CSSProperties
        }
      >
        <div className="flex min-h-0 flex-1 w-full flex-col overflow-hidden rounded-lg border bg-background md:flex-row">
          <div className="border-b bg-sidebar p-3 md:hidden">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Step
            </label>
            <Select
              value={String(step)}
              onValueChange={(v) => goStep(Number.parseInt(v, 10))}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STEPS.map((s) => (
                  <SelectItem
                    key={s.id}
                    value={String(s.id)}
                    disabled={!canGoToStep(s.id, organisation, venues)}
                  >
                    {s.id}. {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Sidebar
            collapsible="none"
            className="hidden min-h-0 border-r border-sidebar-border md:flex"
          >
            <SidebarHeader className="border-b border-sidebar-border px-2 py-3">
              <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Steps
              </SidebarGroupLabel>
            </SidebarHeader>
            <SidebarContent className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
              <SidebarGroup>
                <SidebarMenu>
                  {STEPS.map((s) => {
                    const active = s.id === step;
                    const done = s.id < step;
                    const unlocked = canGoToStep(
                      s.id,
                      organisation,
                      venues,
                    );
                    return (
                      <SidebarMenuItem key={s.id}>
                        <SidebarMenuButton
                          isActive={active}
                          type="button"
                          disabled={!unlocked}
                          onClick={() => goStep(s.id)}
                          className={cn(
                            "h-auto min-h-10 w-full items-start gap-2 py-2 text-left",
                            !unlocked && "opacity-50",
                          )}
                        >
                          <div
                            className={cn(
                              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                              active && "bg-primary text-primary-foreground",
                              done &&
                                !active &&
                                "bg-primary/25 text-foreground",
                              !active &&
                                !done &&
                                "bg-muted text-muted-foreground",
                            )}
                          >
                            {done ? (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            ) : (
                              s.id
                            )}
                          </div>
                          <span className="flex min-w-0 flex-col items-start gap-0.5">
                            <span className="truncate text-sm font-medium leading-tight">
                              {s.title}
                            </span>
                            <span className="truncate text-xs text-muted-foreground leading-tight">
                              {s.subtitle}
                            </span>
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <Card className="flex h-full min-h-0 flex-col rounded-none border-0 shadow-none md:rounded-none md:border-0 md:shadow-none">
              <CardHeader className="shrink-0 space-y-1">
                <div className="flex items-start gap-3">
                  {current ? (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <current.icon className="h-5 w-5" />
                    </div>
                  ) : null}
                  <div>
                    <CardTitle className="text-xl">{current?.title}</CardTitle>
                    <CardDescription className="mt-1 text-base">
                      {step === 1
                        ? "Tell us about your organisation. This information helps us customize SuperSolt for your business needs."
                        : step === 2
                          ? "Add one or more locations where your business operates. You can always add more venues later."
                          : step === 3
                            ? "Optional — You can connect your POS later from Settings."
                            : step === 4
                              ? "Optional — You can invite team members later from People & Rostering."
                              : "Confirm your details and unlock the full app."}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 space-y-6 overflow-y-auto">
                {step === 1 ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="org-name">
                        Organisation name{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="org-name"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="e.g. Piccolo Panini Bar Pty Ltd"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="abn">
                        Australian Business Number (ABN)
                      </Label>
                      <Input
                        id="abn"
                        value={abn}
                        onChange={(e) => setAbn(e.target.value)}
                        placeholder="12345678901"
                        inputMode="numeric"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter your 11-digit ABN without spaces (optional).
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold">GST registered</p>
                        <p className="text-xs text-muted-foreground">
                          Turn this on if your business is registered for GST.
                        </p>
                      </div>
                      <Switch checked={gst} onCheckedChange={setGst} />
                    </div>
                  </>
                ) : null}

                {step === 2 ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="venue-name">
                        Venue name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="venue-name"
                        value={venueName}
                        onChange={(e) => setVenueName(e.target.value)}
                        placeholder="e.g. Main Street Store"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="venue-address">Address</Label>
                      <Input
                        id="venue-address"
                        value={venueAddress}
                        onChange={(e) => setVenueAddress(e.target.value)}
                        placeholder="123 Main St, Melbourne VIC 3000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Timezone <span className="text-destructive">*</span>
                      </Label>
                      <Select value={venueTz} onValueChange={setVenueTz}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {AU_TIMEZONES.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {venues.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        You already have {venues.length} venue(s). Add another
                        or continue.
                      </p>
                    ) : null}
                  </>
                ) : null}

                {step === 3 ? (
                  <div className="flex flex-col items-center gap-4 py-6 text-center">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-semibold">
                        Connect your Point of Sale
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Sync sales data automatically from Square POS.
                      </p>
                    </div>
                    {squareAuthorizeHref ? (
                      <Button variant="outline" asChild>
                        <a href={squareAuthorizeHref}>Connect Square POS</a>
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Complete the venue step first to enable Square.
                      </p>
                    )}
                  </div>
                ) : null}

                {step === 4 ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">
                        Email address{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="invite-email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="team@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="crew">Staff (crew)</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleSendInvite}
                      disabled={inviteMutation.isPending}
                    >
                      {inviteMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="mr-2 h-4 w-4" />
                      )}
                      {inviteMutation.isPending ? "Sending…" : "Send invite"}
                    </Button>
                  </div>
                ) : null}

                {step === 5 ? (
                  <div className="space-y-4 text-sm">
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <p className="font-semibold">Organisation</p>
                      <p className="text-muted-foreground">
                        {organisation?.name ?? "—"} ({organisation?.slug ?? "—"}
                        )
                      </p>
                      {organisation?.abn ? (
                        <p className="text-muted-foreground">
                          ABN {organisation.abn}
                        </p>
                      ) : null}
                      <p className="text-muted-foreground">
                        GST: {organisation?.isGstRegistered ? "Yes" : "No"}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <p className="font-semibold">Venues</p>
                      <ul className="list-inside list-disc text-muted-foreground">
                        {venues.length === 0 ? <li>None yet</li> : null}
                        {venues.map((v) => (
                          <li key={v.id}>
                            {v.name} ({v.slug}) — {v.timezone}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}
              </CardContent>
              <Separator className="shrink-0" />
              <CardFooter className="shrink-0 flex flex-col gap-4 pt-6">
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {step > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => goStep(step - 1)}
                        disabled={anySaving}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    {step === 1 ? (
                      <Button
                        type="button"
                        onClick={handleNextFromBusiness}
                        disabled={saveOrganisationMutation.isPending}
                      >
                        {saveOrganisationMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          <>
                            Next step
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    ) : null}
                    {step === 2 ? (
                      <Button
                        type="button"
                        onClick={handleNextFromVenue}
                        disabled={saveVenueMutation.isPending}
                      >
                        {saveVenueMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving…
                          </>
                        ) : venues.length > 0 && !venueName.trim() ? (
                          <>
                            Continue
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        ) : (
                          <>
                            Next step
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    ) : null}
                    {step === 3 ? (
                      <Button
                        type="button"
                        onClick={() => goStep(4)}
                        disabled={anySaving}
                      >
                        Skip for now
                      </Button>
                    ) : null}
                    {step === 4 ? (
                      <Button
                        type="button"
                        onClick={() => goStep(5)}
                        disabled={anySaving}
                      >
                        Skip for now
                      </Button>
                    ) : null}
                    {step === 5 ? (
                      <Button
                        type="button"
                        onClick={handleFinalize}
                        disabled={finalizeMutation.isPending}
                      >
                        {finalizeMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Finishing…
                          </>
                        ) : (
                          "Confirm and go live"
                        )}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardFooter>
            </Card>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}
