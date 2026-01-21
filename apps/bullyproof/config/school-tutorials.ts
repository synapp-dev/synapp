/**
 * Configuration for school page tutorials.
 * Maps route patterns to tutorial keys and content.
 */

export type TutorialConfig = {
  tutorialKey: string;
  title: string;
  description: string;
  routePattern: RegExp;
};

/**
 * Get the tutorial configuration for a given pathname.
 * Returns null if no tutorial is configured for the route.
 */
export function getTutorialForPathname(
  pathname: string
): TutorialConfig | null {
  for (const config of SCHOOL_TUTORIALS) {
    if (config.routePattern.test(pathname)) {
      return config;
    }
  }
  return null;
}

/**
 * Tutorial configurations for school pages.
 * Routes are matched in order, so more specific patterns should come first.
 */
export const SCHOOL_TUTORIALS: TutorialConfig[] = [
  {
    tutorialKey: "school-home",
    title: "Welcome to Your School Home",
    description:
      "This is your school's home page. Here you can see an overview of recent activity, upcoming lessons, and quick access to key features.",
    routePattern: /^\/schools\/[^/]+\/home\/?$/,
  },
  {
    tutorialKey: "school-teachers",
    title: "Teachers Page",
    description:
      "Browse and manage teachers in your school. View teacher profiles, their classes, and lesson history.",
    routePattern: /^\/schools\/[^/]+\/teachers(\/.*)?$/,
  },
  {
    tutorialKey: "school-classes",
    title: "Classes Page",
    description:
      "View and manage all classes in your school. Star your frequently used classes for quick access, or browse all available classes.",
    routePattern: /^\/schools\/[^/]+\/classes(\/.*)?$/,
  },
  {
    tutorialKey: "school-lessons",
    title: "Lessons Page",
    description:
      "Create, manage, and track your lessons. Start a new lesson, view lesson history, and see the status of scheduled lessons.",
    routePattern: /^\/schools\/[^/]+\/lessons(\/.*)?$/,
  },
  {
    tutorialKey: "school-resources",
    title: "Resources Page",
    description:
      "Access educational resources including content packs, videos, and information materials. Browse by topic or search for specific resources.",
    routePattern: /^\/schools\/[^/]+\/resources(\/.*)?$/,
  },
  {
    tutorialKey: "ap-certification",
    title: "Welcome to the AP Certification",
    description:
      "Welcome to the AP certification. This course will better equip you with the knowledge and skills needed to effectively address and prevent bullying in educational settings. Through comprehensive modules and interactive content, you'll learn evidence-based strategies and best practices.",
    routePattern: /^\/courses\/[^/]+(\/.*)?$/,
  },
];
