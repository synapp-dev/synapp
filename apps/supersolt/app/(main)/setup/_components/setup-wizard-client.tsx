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
  Receipt,
  Rocket,
  ShoppingCart,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { SupersoltLogo } from "@/components/branding/supersolt-logo";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { cn } from "@workspace/ui/lib/utils";
import {
  setOnboardingEarlySalesCookie,
  syncOnboardingVenueScope,
} from "@/entities/onboarding/lib/onboarding-cookies";
import type {
  OnboardingOrganisationDto,
  OnboardingVenueDto,
} from "@/entities/onboarding/model/types";
import {
  inferResumeStep,
  useFinalizeOnboardingMutation,
  useInviteOnboardingMutation,
  useOnboardingStateQuery,
  usePatchOnboardingProgressMutation,
  useSaveOnboardingOrganisationMutation,
  useSaveOnboardingVenueMutation,
} from "@/entities/onboarding/model/use-onboarding-setup";
import { squareKeys } from "@/entities/square/model/keys";
import { useVenueSquareConnectionQuery } from "@/entities/square/model/use-venue-square-connection";
import { xeroKeys } from "@/entities/xero/model/keys";
import { useVenueXeroConnectionQuery } from "@/entities/xero/model/use-venue-xero-connection";
import { meApi } from "@/entities/me/api/endpoints";
import { useMeStore } from "@/entities/me/model/store";
import { onboardingKeys } from "@/entities/onboarding/model/keys";
import { venuesKeys } from "@/entities/venues/model/keys";
import { venueReadinessQueryKey } from "@/entities/readiness/model/use-venue-readiness-query";
import {
  buildSetupOAuthAuthorizeHref,
  completeOAuthPopupFromChild,
  openOAuthPopup,
  type OAuthPopupProvider,
} from "@/lib/oauth/oauth-popup";
import { buildScopedPath } from "@/lib/build-scoped-path";

const SETUP_LAST_STEP = 6;

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
    title: "Connect Xero",
    subtitle: "Sync supplier invoices",
    icon: Receipt,
  },
  {
    id: 5,
    title: "Invite Team",
    subtitle: "Bring your team on board",
    icon: Users,
  },
  {
    id: 6,
    title: "Review & Go Live",
    subtitle: "Confirm and launch",
    icon: PartyPopper,
  },
] as const;

const XERO_ERROR_HINTS: Record<string, string> = {
  config:
    "Add XERO_CLIENT_ID, XERO_CLIENT_SECRET, and XERO_OAUTH_REDIRECT_URI to .env.local (see xero.env.example), then restart the dev server.",
  forbidden: "Your account needs org-admin access to connect Xero.",
  venue_not_found: "This venue could not be found. Try saving venues again.",
  missing_params: "Organisation or venue is missing from the connect link.",
  token_exchange:
    "Xero rejected the authorization code. Check that your redirect URI in the Xero developer app exactly matches XERO_OAUTH_REDIRECT_URI.",
  session: "You were signed out before Xero sent you back. Stay logged in, then try Connect again.",
  wrong_user: "You completed Xero as a different user than the one that started Connect.",
  missing_code:
    "Xero did not return an authorization code — usually access was denied (see detail below for scope errors).",
  no_tenant: "No Xero organisation was linked. Authorise at least one organisation in Xero, then try again.",
  save_failed:
    "Could not save tokens. Apply the venue_xero_connections migration to your Supabase project, then try again.",
  connections: "Could not list Xero organisations after connecting.",
  invalid_scope:
    "Xero rejected the requested permissions. In developer.xero.com → your app → Configuration, enable: accounting.invoices, accounting.attachments, accounting.contacts, accounting.settings. Then reconnect.",
};

const AU_TIMEZONES = [
  { value: "Australia/Melbourne", label: "Melbourne (AEST/AEDT)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  { value: "Australia/Brisbane", label: "Brisbane (AEST)" },
  { value: "Australia/Adelaide", label: "Adelaide (ACST/ACDT)" },
  { value: "Australia/Perth", label: "Perth (AWST)" },
];

function defaultDataStartsFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function parseStep(raw: string | null): number {
  const n = Number.parseInt(raw ?? "1", 10);
  if (Number.isNaN(n) || n < 1) {
    return 1;
  }
  if (n > SETUP_LAST_STEP) {
    return SETUP_LAST_STEP;
  }
  return n;
}

/** Furthest step the user may open given persisted onboarding state. */
function maxReachableStep(
  organisation: OnboardingOrganisationDto | null,
  venues: OnboardingVenueDto[],
  squareConnected: boolean,
): number {
  if (!organisation) return 1;
  if (venues.length === 0) return 2;
  if (!squareConnected) return 3;
  return SETUP_LAST_STEP;
}

function canGoToStep(
  targetId: number,
  organisation: OnboardingOrganisationDto | null,
  venues: OnboardingVenueDto[],
  squareConnected: boolean,
): boolean {
  return targetId <= maxReachableStep(organisation, venues, squareConnected);
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
  const patchProgressMutation = usePatchOnboardingProgressMutation();

  const [step, setStep] = useState(() => parseStep(searchParams.get("step")));
  const [skipDialog, setSkipDialog] = useState<"xero" | "team" | null>(null);
  const [oauthPopupProvider, setOauthPopupProvider] =
    useState<OAuthPopupProvider | null>(null);
  const [isGoingLive, setIsGoingLive] = useState(false);
  const [organisation, setOrganisation] =
    useState<OnboardingOrganisationDto | null>(null);
  const [venues, setVenues] = useState<OnboardingVenueDto[]>([]);

  const [orgName, setOrgName] = useState("");
  const [abn, setAbn] = useState("");
  const [gst, setGst] = useState(false);

  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [venueTz, setVenueTz] = useState("Australia/Melbourne");
  const [dataStartsFrom, setDataStartsFrom] = useState(defaultDataStartsFrom);

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
    const loadedVenues = onboardingData.venues ?? [];
    setVenues(loadedVenues);
    const primary = loadedVenues[0];
    if (primary?.dataStartsFrom) {
      setDataStartsFrom(primary.dataStartsFrom);
    }
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

  const setupVenue = venues[0];

  const squareAuthorizeHref = useMemo(() => {
    if (!organisation || !setupVenue) {
      return null;
    }
    return buildSetupOAuthAuthorizeHref(
      "square",
      3,
      organisation.slug,
      setupVenue.slug,
    );
  }, [organisation, setupVenue]);

  const squareConnectionQuery = useVenueSquareConnectionQuery(
    organisation?.slug,
    setupVenue?.slug,
    Boolean(organisation && setupVenue) && step >= 3,
  );
  const squareConnected = Boolean(
    squareConnectionQuery.data?.connected === true ||
      (onboardingData &&
        !onboardingData.completed &&
        onboardingData.squareConnected),
  );

  useEffect(() => {
    if (onboardingLoading) return;
    const urlStep = parseStep(searchParams.get("step"));
    const max = maxReachableStep(organisation, venues, squareConnected);
    if (urlStep > max) {
      const next = Math.max(1, max);
      setStep(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set("step", String(next));
      router.replace(`/setup?${params.toString()}`, { scroll: false });
    }
  }, [onboardingLoading, organisation, venues, squareConnected, searchParams, router]);

  useEffect(() => {
    const orgSlug =
      organisation?.slug ??
      (onboardingData && !onboardingData.completed
        ? onboardingData.organisationSlug
        : null);
    const venueSlug =
      setupVenue?.slug ??
      (onboardingData && !onboardingData.completed
        ? onboardingData.primaryVenueSlug
        : null);
    if (!orgSlug || !venueSlug) {
      return;
    }
    syncOnboardingVenueScope({
      organisationSlug: orgSlug,
      venueSlug,
    });
    if (squareConnected) {
      setOnboardingEarlySalesCookie(true);
    }
  }, [
    organisation?.slug,
    setupVenue?.slug,
    onboardingData,
    squareConnected,
  ]);

  const xeroAuthorizeHref = useMemo(() => {
    if (!organisation || !setupVenue) {
      return null;
    }
    return buildSetupOAuthAuthorizeHref(
      "xero",
      4,
      organisation.slug,
      setupVenue.slug,
    );
  }, [organisation, setupVenue]);

  const handleOAuthConnect = useCallback(
    (provider: OAuthPopupProvider, authorizeHref: string) => {
      setOauthPopupProvider(provider);
      openOAuthPopup(authorizeHref, {
        onResult: (result) => {
          setOauthPopupProvider(null);
          if (!organisation || !setupVenue) {
            return;
          }
          if (result.status === "connected") {
            if (provider === "square") {
              toast.success("Square connected");
              void queryClient.invalidateQueries({
                queryKey: squareKeys.venueConnection(
                  organisation.slug,
                  setupVenue.slug,
                ),
              });
            } else {
              toast.success("Xero connected");
              void queryClient.invalidateQueries({
                queryKey: xeroKeys.venueConnection(
                  organisation.slug,
                  setupVenue.slug,
                ),
              });
            }
            return;
          }
          const hint =
            provider === "xero"
              ? (XERO_ERROR_HINTS[result.code] ??
                result.detail ??
                "Could not connect Xero. Try again or skip for now.")
              : (result.detail ??
                "Could not connect Square. Try again.");
          toast.error(hint);
        },
        onCancel: () => {
          setOauthPopupProvider(null);
        },
        onBlocked: () => {
          setOauthPopupProvider(null);
          toast.info(
            "Allow pop-ups for this site to connect without leaving setup, or we will open a new tab.",
          );
          window.location.assign(authorizeHref);
        },
      });
    },
    [organisation, setupVenue, queryClient],
  );

  const xeroConnectionQuery = useVenueXeroConnectionQuery(
    organisation?.slug,
    setupVenue?.slug,
    step === 4 && Boolean(organisation && setupVenue),
  );
  const xeroConnected = xeroConnectionQuery.data?.connected === true;

  const xeroErrorCode = searchParams.get("xero_error");
  const xeroErrorHint = xeroErrorCode
    ? (XERO_ERROR_HINTS[xeroErrorCode] ??
      "Could not connect Xero. Try again or skip for now.")
    : null;

  useEffect(() => {
    const inOAuthPopup =
      typeof window !== "undefined" && window.name === "supersolt-oauth";

    if (inOAuthPopup && searchParams.get("square") === "connected") {
      completeOAuthPopupFromChild({ status: "connected", provider: "square" });
      return;
    }
    if (inOAuthPopup && searchParams.get("xero") === "connected") {
      completeOAuthPopupFromChild({ status: "connected", provider: "xero" });
      return;
    }
    const squareErr = searchParams.get("square_error");
    if (inOAuthPopup && squareErr) {
      completeOAuthPopupFromChild({
        status: "error",
        provider: "square",
        code: squareErr,
        detail: searchParams.get("square_error_detail") ?? undefined,
      });
      return;
    }
    const xeroErr = searchParams.get("xero_error");
    if (inOAuthPopup && xeroErr) {
      completeOAuthPopupFromChild({
        status: "error",
        provider: "xero",
        code: xeroErr,
        detail: searchParams.get("xero_error_detail") ?? undefined,
      });
      return;
    }

    if (searchParams.get("square") === "connected") {
      toast.success("Square connected");
      if (organisation && setupVenue) {
        void queryClient.invalidateQueries({
          queryKey: squareKeys.venueConnection(organisation.slug, setupVenue.slug),
        });
      }
    }
    if (searchParams.get("xero") === "connected") {
      toast.success("Xero connected");
      if (organisation && setupVenue) {
        void queryClient.invalidateQueries({
          queryKey: xeroKeys.venueConnection(organisation.slug, setupVenue.slug),
        });
      }
    }
    if (xeroErrorCode && xeroErrorHint) {
      toast.error(xeroErrorHint);
    }
  }, [
    searchParams,
    xeroErrorCode,
    xeroErrorHint,
    queryClient,
    organisation,
    setupVenue,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || window.name !== "supersolt-oauth") {
      return;
    }
    if (
      step === 3 &&
      squareConnected &&
      !searchParams.get("square") &&
      !searchParams.get("square_error")
    ) {
      completeOAuthPopupFromChild({ status: "connected", provider: "square" });
    }
    if (
      step === 4 &&
      xeroConnected &&
      !searchParams.get("xero") &&
      !searchParams.get("xero_error")
    ) {
      completeOAuthPopupFromChild({ status: "connected", provider: "xero" });
    }
  }, [step, squareConnected, xeroConnected, searchParams]);

  const goStep = useCallback(
    (next: number, ctx?: GoStepContext) => {
      const org =
        ctx?.organisation !== undefined ? ctx.organisation : organisation;
      const ven = ctx?.venues !== undefined ? ctx.venues : venues;
      const clamped = Math.min(SETUP_LAST_STEP, Math.max(1, next));
      const squareOk = Boolean(
        squareConnectionQuery.data?.connected === true ||
          (onboardingData &&
            !onboardingData.completed &&
            onboardingData.squareConnected),
      );
      if (!canGoToStep(clamped, org, ven, squareOk)) {
        if (clamped > 3 && !squareOk) {
          toast.info("Connect Square before continuing.");
        } else if (clamped >= 3 && ven.length === 0) {
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
    [
      organisation,
      venues,
      router,
      searchParams,
      squareConnectionQuery.data?.connected,
      onboardingData,
    ],
  );

  const anySaving =
    saveOrganisationMutation.isPending ||
    saveVenueMutation.isPending ||
    finalizeMutation.isPending ||
    inviteMutation.isPending ||
    patchProgressMutation.isPending ||
    isGoingLive;

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
        dataStartsFrom,
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

  const confirmSkipXero = async () => {
    setSkipDialog(null);
    try {
      await patchProgressMutation.mutateAsync({ xeroSkipped: true });
      toast.info(
        "You can connect Xero later in Settings → Integrations. Supplier invoice sync will stay off until then.",
      );
      goStep(5);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save progress");
    }
  };

  const confirmSkipTeam = async () => {
    setSkipDialog(null);
    try {
      await patchProgressMutation.mutateAsync({ teamSkipped: true });
      toast.info(
        "You can invite team members later from Settings → Permissions.",
      );
      goStep(6);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save progress");
    }
  };

  const handleFinalize = async () => {
    if (!squareConnected) {
      toast.error("Connect Square before going live.");
      goStep(3);
      return;
    }
    if (!organisation || !setupVenue) {
      toast.error("Complete business details and add a venue first.");
      return;
    }

    const dashboardPath = buildScopedPath(
      organisation.slug,
      setupVenue.slug,
      "dashboard",
    );

    setIsGoingLive(true);
    try {
      await finalizeMutation.mutateAsync();

      const completedAt = new Date().toISOString();
      const existingMe = useMeStore.getState().currentUser;
      if (existingMe) {
        setCurrentUser({
          ...existingMe,
          needsSetup: false,
          setupCompletedAt: completedAt,
        });
      }
      setOnboardingEarlySalesCookie(false);
      syncOnboardingVenueScope({
        organisationSlug: organisation.slug,
        venueSlug: setupVenue.slug,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: onboardingKeys.state() }),
        queryClient.invalidateQueries({ queryKey: venuesKeys.groups() }),
        queryClient.invalidateQueries({
          queryKey: venueReadinessQueryKey(
            organisation.slug,
            setupVenue.slug,
            "full",
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: venueReadinessQueryKey(
            organisation.slug,
            setupVenue.slug,
            "compact",
          ),
        }),
      ]);

      await Promise.all([
        queryClient.refetchQueries({ queryKey: venuesKeys.groups() }),
        queryClient.refetchQueries({ queryKey: onboardingKeys.state() }),
      ]);

      const me = await meApi.get.currentUser();
      if (me.data) {
        setCurrentUser(me.data);
      } else if (me.error) {
        toast.error(me.error.message);
      }

      toast.success("You are all set");
      router.replace(dashboardPath);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Finalize failed");
      setIsGoingLive(false);
    }
  };

  if (onboardingLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
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
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <SidebarProvider
        className="flex min-h-0 flex-1 w-full flex-col [&_[data-slot=sidebar-wrapper]]:min-h-0 [&_[data-slot=sidebar-wrapper]]:h-full [&_[data-slot=sidebar-wrapper]]:flex-1"
        style={
          {
            "--sidebar-width": "min(20%, 16rem)",
            "--sidebar-width-icon": "2.5rem",
          } as CSSProperties
        }
      >
        <div className="flex h-full min-h-0 flex-1 w-full flex-col overflow-hidden rounded-lg border bg-background md:flex-row">
          <div className="border-b bg-sidebar p-3 md:hidden">
            <div className="mb-2 flex items-center gap-2">
              <SidebarGroupLabel className="text-muted-foreground mb-0 flex h-fit w-fit items-center gap-1.5 bg-muted-foreground/10 py-0.5 pl-1.5 pr-2 text-xs font-sans">
                <Rocket className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Setup
              </SidebarGroupLabel>
            </div>
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
                    disabled={!canGoToStep(s.id, organisation, venues, squareConnected)}
                  >
                    {s.id}. {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Sidebar
            collapsible="none"
            className="hidden h-full min-h-0 border-r border-sidebar-border md:flex"
          >
            <SidebarHeader className="border-b border-sidebar-border px-2 py-3">
              <SidebarGroupLabel className="text-muted-foreground mb-0 flex h-fit w-fit items-center gap-1.5 bg-muted-foreground/10 py-0.5 pl-1.5 pr-2 text-xs font-sans">
                <Rocket className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Setup
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
                      squareConnected,
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
            <Card className="flex h-full w-full min-h-0 flex-col rounded-none border-0 shadow-none md:rounded-none md:border-0 md:shadow-none">
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
                              ? "Optional — Connect Xero to pull supplier invoices automatically. You can set this up later from Settings."
                              : step === 5
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
                    <div className="space-y-2">
                      <Label htmlFor="data-starts-from">
                        Sales history starts from{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="data-starts-from"
                        type="date"
                        value={dataStartsFrom}
                        onChange={(e) => setDataStartsFrom(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        We use this date when syncing Square sales into insights.
                      </p>
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
                        Square is required to go live. After connecting, you can
                        open Sales insights while you finish setup.
                      </p>
                    </div>
                    {squareConnectionQuery.isPending && setupVenue ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Checking connection…
                      </div>
                    ) : null}
                    {squareConnected ? (
                      <Card className="w-full max-w-md border-emerald-200 bg-emerald-50/80 text-left dark:border-emerald-900/60 dark:bg-emerald-950/35">
                        <CardHeader className="pb-2">
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <div className="space-y-1">
                              <CardTitle className="text-base text-emerald-900 dark:text-emerald-100">
                                Square is connected
                              </CardTitle>
                              <CardDescription className="text-emerald-900/80 dark:text-emerald-200/80">
                                Sales data can sync from your Square POS for
                                this venue.
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 pt-0 text-sm">
                          {squareConnectionQuery.data?.merchantId ? (
                            <p className="text-muted-foreground">
                              Merchant{" "}
                              <code className="rounded bg-background/80 px-1 py-0.5 text-xs">
                                {squareConnectionQuery.data.merchantId}
                              </code>
                              {squareConnectionQuery.data.environment ? (
                                <>
                                  {" "}
                                  · {squareConnectionQuery.data.environment}
                                </>
                              ) : null}
                            </p>
                          ) : null}
                          {squareConnectionQuery.data?.updatedAt ? (
                            <p className="text-xs text-muted-foreground">
                              Connected{" "}
                              {new Date(
                                squareConnectionQuery.data.updatedAt,
                              ).toLocaleString()}
                            </p>
                          ) : null}
                          {squareAuthorizeHref ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-1"
                              type="button"
                              disabled={oauthPopupProvider === "square"}
                              onClick={() =>
                                handleOAuthConnect("square", squareAuthorizeHref)
                              }
                            >
                              {oauthPopupProvider === "square"
                                ? "Connecting…"
                                : "Reconnect Square"}
                            </Button>
                          ) : null}
                        </CardContent>
                      </Card>
                    ) : null}
                    {!squareConnected && !squareConnectionQuery.isPending ? (
                      squareAuthorizeHref ? (
                        <Button
                          variant="outline"
                          type="button"
                          disabled={oauthPopupProvider === "square"}
                          onClick={() =>
                            handleOAuthConnect("square", squareAuthorizeHref)
                          }
                        >
                          {oauthPopupProvider === "square" ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Connecting…
                            </>
                          ) : (
                            "Connect Square POS"
                          )}
                        </Button>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Complete the venue step first to enable Square.
                        </p>
                      )
                    ) : null}
                  </div>
                ) : null}

                {step === 4 ? (
                  <div className="flex flex-col items-center gap-4 py-6 text-center">
                    <Receipt className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-semibold">Connect Xero</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Sync supplier invoices from your accounting system so
                        they flow into SuperSolt automatically.
                      </p>
                    </div>
                    {xeroConnectionQuery.isPending && setupVenue ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Checking connection…
                      </div>
                    ) : null}
                    {xeroConnected ? (
                      <Card className="w-full max-w-md border-emerald-200 bg-emerald-50/80 text-left dark:border-emerald-900/60 dark:bg-emerald-950/35">
                        <CardHeader className="pb-2">
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <div className="space-y-1">
                              <CardTitle className="text-base text-emerald-900 dark:text-emerald-100">
                                Xero is connected
                              </CardTitle>
                              <CardDescription className="text-emerald-900/80 dark:text-emerald-200/80">
                                Supplier invoices can sync into SuperSolt for
                                this venue.
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 pt-0 text-sm">
                          {xeroConnectionQuery.data?.tenantName ? (
                            <p className="text-muted-foreground">
                              Organisation:{" "}
                              <span className="font-medium text-foreground">
                                {xeroConnectionQuery.data.tenantName}
                              </span>
                            </p>
                          ) : null}
                          {xeroConnectionQuery.data?.updatedAt ? (
                            <p className="text-xs text-muted-foreground">
                              Connected{" "}
                              {new Date(
                                xeroConnectionQuery.data.updatedAt,
                              ).toLocaleString()}
                            </p>
                          ) : null}
                          {xeroAuthorizeHref ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-1"
                              type="button"
                              disabled={oauthPopupProvider === "xero"}
                              onClick={() =>
                                handleOAuthConnect("xero", xeroAuthorizeHref)
                              }
                            >
                              {oauthPopupProvider === "xero"
                                ? "Connecting…"
                                : "Reconnect Xero"}
                            </Button>
                          ) : null}
                        </CardContent>
                      </Card>
                    ) : null}
                    {!xeroConnected && xeroErrorHint ? (
                      <div className="w-full max-w-md rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-left text-sm">
                        <p className="font-medium text-destructive">
                          Xero connection unavailable
                        </p>
                        <p className="text-muted-foreground mt-1">
                          {xeroErrorHint}
                        </p>
                      </div>
                    ) : null}
                    {!xeroConnected && !xeroConnectionQuery.isPending ? (
                      xeroAuthorizeHref ? (
                        <Button
                          variant="outline"
                          type="button"
                          disabled={oauthPopupProvider === "xero"}
                          onClick={() =>
                            handleOAuthConnect("xero", xeroAuthorizeHref)
                          }
                        >
                          {oauthPopupProvider === "xero" ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Connecting…
                            </>
                          ) : (
                            "Connect Xero"
                          )}
                        </Button>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Complete the venue step first to enable Xero.
                        </p>
                      )
                    ) : null}
                  </div>
                ) : null}

                {step === 5 ? (
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

                {step === 6 ? (
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
                        disabled={anySaving || !squareConnected}
                      >
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : null}
                    {step === 4 ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSkipDialog("xero")}
                        disabled={anySaving}
                      >
                        Skip for now
                      </Button>
                    ) : null}
                    {step === 5 ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSkipDialog("team")}
                        disabled={anySaving}
                      >
                        Skip for now
                      </Button>
                    ) : null}
                    {step === 6 ? (
                      <Button
                        type="button"
                        onClick={handleFinalize}
                        disabled={
                          isGoingLive ||
                          finalizeMutation.isPending ||
                          !squareConnected
                        }
                      >
                        {isGoingLive || finalizeMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Going live…
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

      <Dialog
        open={skipDialog === "xero"}
        onOpenChange={(open) => !open && setSkipDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skip Xero for now?</DialogTitle>
            <DialogDescription>
              Supplier invoices will not sync until you connect Xero in Settings
              → Integrations. You can still upload invoices manually.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkipDialog(null)}>
              Cancel
            </Button>
            <Button onClick={() => void confirmSkipXero()}>Skip Xero</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={skipDialog === "team"}
        onOpenChange={(open) => !open && setSkipDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skip team invites?</DialogTitle>
            <DialogDescription>
              You can invite managers and staff later from Settings →
              Permissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkipDialog(null)}>
              Cancel
            </Button>
            <Button onClick={() => void confirmSkipTeam()}>Skip invites</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isGoingLive ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 px-6 backdrop-blur-sm"
          aria-live="polite"
          role="status"
        >
          <div className="max-w-md rounded-lg border bg-card px-8 py-7 text-center shadow-lg">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-lg font-semibold">Going live</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Unlocking your workspace and loading the dashboard. Square sales
              sync continues in the background — you do not need to wait for it
              to finish.
            </p>
          </div>
        </div>
      ) : null}

      {oauthPopupProvider ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 px-6 backdrop-blur-[2px]"
          aria-live="polite"
        >
          <div className="max-w-sm rounded-lg border bg-card px-6 py-5 text-center shadow-lg">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">
              {oauthPopupProvider === "square"
                ? "Connect Square in the popup window"
                : "Connect Xero in the popup window"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              This page stays open. The popup will close when you finish
              signing in.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
