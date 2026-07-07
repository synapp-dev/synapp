export const PAGE_TITLES: Record<string, string> = {
  "/home": "Home",
  "/dashboard": "Dashboard",
  "/agent": "Agent",
  "/tasks": "Tasks",
  "/routines": "Routines",
  "/calendar": "Calendar",
  "/health": "Health",
  "/health/sleep": "Sleep",
  "/health/vitals": "Vitals",
  "/health/fitness": "Fitness",
  "/health/nutrition": "Nutrition",
  "/health/conditions": "Conditions",
  "/health/medical-records": "Medical records",
  "/health/medication-supplements": "Medication and supplements",
  "/health/preventative-care": "Preventative care",
  "/health/recovery": "Recovery",
  "/health/research-library": "Research library",
  "/health/gym": "Gym",
  "/health/gym/exercises": "Exercises",
  "/health/gym/programs": "Programs",
  "/health/gym/progress": "Progress",
  "/health/gym/schedule": "Schedule",
  "/health/gym/session": "Session",
  "/finance": "Finance",
  "/finance/accounts": "Accounts",
  "/finance/assets-liabilities": "Assets and liabilities",
  "/finance/budget": "Budget",
  "/finance/cashflow": "Cashflow",
  "/finance/debts": "Debts",
  "/finance/expenses": "Expenses",
  "/finance/goals": "Goals",
  "/finance/income": "Income",
  "/finance/insurance": "Insurance",
  "/finance/investments": "Investments",
  "/finance/savings": "Savings",
  "/finance/subscriptions": "Subscriptions",
  "/finance/taxes": "Taxes",
  "/identity": "Identity",
  "/work": "Work",
  "/work/projects": "Projects",
  "/social": "Social",
  "/social/relationships": "Relationships",
  "/social/birthdays": "Birthdays",
  "/social/conversations": "Conversations",
  "/social/events": "Events",
  "/social/follow-ups": "Follow-ups",
  "/social/network": "Network",
  "/knowledge": "Knowledge",
  "/review": "Review",
  "/settings": "Settings",
  "/profile": "Profile",
};

/** Longest-prefix match against PAGE_TITLES; null when nothing matches. */
export function pageTitle(pathname: string): string | null {
  let match: string | null = null;
  for (const prefix of Object.keys(PAGE_TITLES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      if (match === null || prefix.length > match.length) match = prefix;
    }
  }
  return match === null ? null : (PAGE_TITLES[match] ?? null);
}
