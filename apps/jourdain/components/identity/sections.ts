import {
  ArrowDownUp,
  BadgeCheck,
  Eye,
  Gem,
  LayoutGrid,
  Lightbulb,
  Palette,
  ScrollText,
  ShieldAlert,
  Target,
  VenetianMask,
  Waves,
  type LucideIcon,
} from "lucide-react";
import {
  IDENTITY_SECTIONS,
  type IdentitySection,
} from "@/entities/identity/model/types";

export type IdentitySectionConfig = {
  slug: IdentitySection;
  title: string;
  guidance: string;
  icon: LucideIcon;
  starters: string[];
};

export const IDENTITY_SECTION_CONFIG: Record<
  IdentitySection,
  IdentitySectionConfig
> = {
  vision: {
    slug: "vision",
    title: "Vision",
    guidance: "Your long-term picture of who you are becoming.",
    icon: Eye,
    starters: ["Who I am in five years", "The life I am building", "My north star"],
  },
  values: {
    slug: "values",
    title: "Values",
    guidance: "The principles you will not trade away.",
    icon: Gem,
    starters: ["Integrity", "Growth", "Courage"],
  },
  standards: {
    slug: "standards",
    title: "Standards",
    guidance: "The bars you hold yourself to daily.",
    icon: BadgeCheck,
    starters: ["Show up on time", "Finish what I start", "No zero days"],
  },
  archetypes: {
    slug: "archetypes",
    title: "Archetypes",
    guidance: "The characters you embody at your best.",
    icon: VenetianMask,
    starters: ["The Builder", "The Explorer", "The Mentor"],
  },
  narrative: {
    slug: "narrative",
    title: "Narrative",
    guidance: "Your story, past chapters and the one being written.",
    icon: ScrollText,
    starters: ["Where I came from", "The turning point", "The chapter being written"],
  },
  "emotional-patterns": {
    slug: "emotional-patterns",
    title: "Emotional Patterns",
    guidance: "Triggers, loops and how you break them.",
    icon: Waves,
    starters: ["What sets me off", "The loop I fall into", "How I reset"],
  },
  "strengths-weaknesses": {
    slug: "strengths-weaknesses",
    title: "Strengths & Weaknesses",
    guidance: "What you lean on and what you guard against.",
    icon: ArrowDownUp,
    starters: ["A strength I lean on", "A weakness I guard against"],
  },
  interests: {
    slug: "interests",
    title: "Interests",
    guidance: "What pulls you in and keeps you curious.",
    icon: Palette,
    starters: ["Current obsession", "Always curious about", "Want to explore"],
  },
  beliefs: {
    slug: "beliefs",
    title: "Beliefs",
    guidance: "What you hold true about yourself and the world.",
    icon: Lightbulb,
    starters: ["About myself", "About people", "About the world"],
  },
  boundaries: {
    slug: "boundaries",
    title: "Boundaries",
    guidance: "Lines that protect your energy and time.",
    icon: ShieldAlert,
    starters: ["My time", "My energy", "My attention"],
  },
  "life-domains": {
    slug: "life-domains",
    title: "Life Domains",
    guidance: "The arenas of your life and what each needs.",
    icon: LayoutGrid,
    starters: ["Health", "Work", "Relationships"],
  },
  goals: {
    slug: "goals",
    title: "Goals",
    guidance: "Concrete outcomes with a date on them.",
    icon: Target,
    starters: ["Run a marathon", "Ship the project", "Save the first 10k"],
  },
};

export const IDENTITY_SECTION_LIST: IdentitySectionConfig[] =
  IDENTITY_SECTIONS.map((slug) => IDENTITY_SECTION_CONFIG[slug]);
