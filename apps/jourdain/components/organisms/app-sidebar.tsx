"use client";

import {
  Activity,
  Apple,
  ArrowDownUp,
  ArrowLeftRight,
  BadgeCheck,
  Cake,
  BookOpen,
  BotMessageSquare,
  Briefcase,
  Building2,
  CalendarDays,
  Calculator,
  CircleDollarSign,
  ClipboardCheck,
  Compass,
  Dumbbell,
  Eye,
  FileText,
  Fingerprint,
  FolderKanban,
  FolderOpen,
  Gauge,
  Gem,
  HeartHandshake,
  HeartPulse,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  Library,
  Lightbulb,
  ListChecks,
  ListTodo,
  MessagesSquare,
  Moon,
  Network,
  Sunrise,
  Palette,
  PieChart,
  PiggyBank,
  Pill,
  Receipt,
  Repeat,
  Scale,
  ScrollText,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  VenetianMask,
  Video,
  Waves,
} from "lucide-react";

import { NavMain, type NavMainItem } from "@/components/organisms/nav-main";
import { NavUser } from "@/components/molecules/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@workspace/ui/components/sidebar";
import { Separator } from "@workspace/ui/components/separator";

const platformNavItems: NavMainItem[] = [
  {
    title: "Agent",
    url: "/agent",
    icon: BotMessageSquare,
    exact: true,
  },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    title: "Tasks",
    url: "/tasks",
    icon: ListTodo,
    exact: true,
  },
  {
    title: "Calendar",
    url: "/calendar",
    icon: CalendarDays,
    exact: true,
  },
  {
    title: "Knowledge",
    url: "/knowledge",
    icon: BookOpen,
    exact: true,
  },
  {
    title: "Review",
    url: "/review",
    icon: ClipboardCheck,
    exact: true,
  },
];

const modulesNavItems: NavMainItem[] = [
  {
    title: "Identity",
    url: "/identity",
    icon: Fingerprint,
    items: [
      { title: "Vision", url: "/identity/vision", icon: Eye },
      { title: "Values", url: "/identity/values", icon: Gem },
      { title: "Standards", url: "/identity/standards", icon: BadgeCheck },
      {
        title: "Archetypes",
        url: "/identity/archetypes",
        icon: VenetianMask,
      },
      { title: "Narrative", url: "/identity/narrative", icon: ScrollText },
      {
        title: "Emotional Patterns",
        url: "/identity/emotional-patterns",
        icon: Waves,
      },
      {
        title: "Strengths & Weaknesses",
        url: "/identity/strengths-weaknesses",
        icon: ArrowDownUp,
      },
      { title: "Interests", url: "/identity/interests", icon: Palette },
      { title: "Beliefs", url: "/identity/beliefs", icon: Lightbulb },
      {
        title: "Boundaries",
        url: "/identity/boundaries",
        icon: ShieldAlert,
      },
      {
        title: "Life Domains",
        url: "/identity/life-domains",
        icon: LayoutGrid,
      },
      { title: "Goals", url: "/identity/goals", icon: Target },
    ],
  },
  {
    title: "Health",
    url: "/health",
    icon: HeartPulse,
    items: [
      { title: "Fitness", url: "/health/fitness", icon: Dumbbell },
      { title: "Nutrition", url: "/health/nutrition", icon: Apple },
      { title: "Vitals", url: "/health/vitals", icon: Activity },
      { title: "Sleep", url: "/health/sleep", icon: Moon },
      { title: "Recovery", url: "/health/recovery", icon: Sunrise },
      { title: "Conditions", url: "/health/conditions", icon: Stethoscope },
      {
        title: "Medication & Supplements",
        url: "/health/medication-supplements",
        icon: Pill,
      },
      {
        title: "Preventative Care",
        url: "/health/preventative-care",
        icon: ShieldCheck,
      },
      {
        title: "Medical Records",
        url: "/health/medical-records",
        icon: FileText,
      },
      {
        title: "Research Library",
        url: "/health/research-library",
        icon: Library,
      },
    ],
  },
  {
    title: "Work",
    url: "/work",
    icon: Briefcase,
    items: [
      { title: "Direction", url: "/work/direction", icon: Compass },
      { title: "Projects", url: "/work/projects", icon: FolderKanban },
      { title: "Calendar", url: "/work/calendar", icon: CalendarDays },
      { title: "Knowledge", url: "/work/knowledge", icon: BookOpen },
      { title: "Meetings", url: "/work/meetings", icon: Video },
      {
        title: "Communication",
        url: "/work/communication",
        icon: MessagesSquare,
      },
      { title: "CRM", url: "/work/crm", icon: Building2 },
      { title: "Documents", url: "/work/documents", icon: FolderOpen },
      { title: "Systems", url: "/work/systems", icon: Server },
      { title: "Performance", url: "/work/performance", icon: Gauge },
    ],
  },
  {
    title: "Social",
    url: "/social",
    icon: Users,
    items: [
      {
        title: "Relationships",
        url: "/social/relationships",
        icon: HeartHandshake,
      },
      { title: "Events", url: "/social/events", icon: CalendarDays },
      { title: "Birthdays", url: "/social/birthdays", icon: Cake },
      {
        title: "Conversations",
        url: "/social/conversations",
        icon: MessagesSquare,
      },
      {
        title: "Follow-ups",
        url: "/social/follow-ups",
        icon: ListChecks,
      },
      { title: "Network", url: "/social/network", icon: Network },
    ],
  },
  {
    title: "Finance",
    url: "/finance",
    icon: PiggyBank,
    items: [
      { title: "Accounts", url: "/finance/accounts", icon: Landmark },
      { title: "Cashflow", url: "/finance/cashflow", icon: ArrowLeftRight },
      { title: "Income", url: "/finance/income", icon: CircleDollarSign },
      { title: "Expenses", url: "/finance/expenses", icon: Receipt },
      { title: "Budget", url: "/finance/budget", icon: PieChart },
      { title: "Savings", url: "/finance/savings", icon: PiggyBank },
      { title: "Investments", url: "/finance/investments", icon: TrendingUp },
      {
        title: "Assets & Liabilities",
        url: "/finance/assets-liabilities",
        icon: Scale,
      },
      { title: "Debts", url: "/finance/debts", icon: TrendingDown },
      { title: "Taxes", url: "/finance/taxes", icon: Calculator },
      { title: "Subscriptions", url: "/finance/subscriptions", icon: Repeat },
      { title: "Insurance", url: "/finance/insurance", icon: Shield },
      { title: "Goals", url: "/finance/goals", icon: Target },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="pt-[env(safe-area-inset-top)]">
        <div className="px-2">
          <div className="flex min-h-10 items-start justify-center px-2 py-4 gap-0.5 group-data-[collapsible=icon]:hidden">
            <span className="text-xl font-semibold tracking-tight">
              jourdain
            </span>
            <span className="text-xs font-semibold tracking-tight text-primary/80">
              ai
            </span>
          </div>
          <div className="hidden min-h-10 items-center justify-center group-data-[collapsible=icon]:flex">
            <span className="text-lg font-bold" aria-hidden>
              j
            </span>
            <span className="sr-only">Jourdain</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavMain title="Platform" items={platformNavItems} />
        <Separator className="my-0.5" />
        <NavMain
          title="Modules"
          className="-mt-2"
          items={modulesNavItems}
          enableStaggeredAnimation
          staggerBaseDelay={0.06}
          staggerIncrementDelay={0.06}
        />
      </SidebarContent>
      <SidebarFooter className="pb-[env(safe-area-inset-bottom)]">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
