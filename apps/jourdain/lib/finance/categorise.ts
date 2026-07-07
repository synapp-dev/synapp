export const CATEGORIES = [
  "groceries",
  "dining",
  "transport",
  "shopping",
  "utilities",
  "subscriptions",
  "entertainment",
  "health",
  "fees",
  "debt",
  "taxes",
  "income",
  "transfer",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type CategoryRule = {
  pattern: string;
  category: string;
};

type DefaultRule = {
  test: RegExp;
  category: Category;
};

// Ordered: first match wins. Specific overrides (salary before transfer,
// Uber Eats before Uber, memberships before brands) rely on this ordering.
const DEFAULT_RULES: DefaultRule[] = [
  // Income
  { test: /salary|payroll|pay ?run|\bwages\b/, category: "income" },
  { test: /^direct credit/, category: "income" },
  { test: /\bdividend|distribution payment|centrelink/, category: "income" },

  // Transfers (own accounts, PayID, person-to-person)
  { test: /^(fast )?transfer (to|from)\b/, category: "transfer" },
  { test: /^wdl atm|^atm withdrawal|^cash deposit/, category: "transfer" },

  // Debt repayments
  {
    test: /loan repayment|latitude gem visa|afterpay|zip ?pay|credit card payment|payin4|pay in 4/,
    category: "debt",
  },

  // Taxes
  { test: /tax office|\bato\b payment|activity statement/, category: "taxes" },

  // Bank fees and interest charges
  {
    test: /international transaction fee|overdraw fee|unpaid payment fee|excess interest|account fee|dishonour|late payment fee|monthly fee/,
    category: "fees",
  },

  // Dining first so Uber Eats never falls through to transport
  {
    test: /uber\s?\*?\s?eats|doordash|menulog|deliveroo|easi\b/,
    category: "dining",
  },

  // Subscriptions and SaaS
  {
    test: /netflix|spotify|youtube ?premium|apple\.com|itunes|disney ?plus|binge|kayo|stan\b|paramount\+|crunchyroll|audible|amzn ?prime|prime vide/,
    category: "subscriptions",
  },
  {
    test: /openai|chatgpt|anthropic|claude|cursor|midjourney|github|supabase|vercel|figma|canva|adobe|notion\b|dropbox|google.?workspace|google ?one|googleaustr|google synapti|xero\b|twilio|sendgrid|codecademy|runway|revisionfx|pdf\.net|virtualdj/,
    category: "subscriptions",
  },
  {
    test: /patreon|substack|soundcloud|discord|twitch|onlyfans|ancestry|membership|subscription|subscr\b/,
    category: "subscriptions",
  },
  // PayPal direct debits are almost always recurring services
  { test: /^direct debit .*paypal/, category: "subscriptions" },

  // Groceries
  {
    test: /woolworths|\bcoles\b(?! express)|\baldi\b|\biga\b|foodworks|harris farm|foodland|drakes|costco|spudshed/,
    category: "groceries",
  },

  // Transport: rideshare, public transport, fuel, tolls, parking
  {
    test: /uber\s?\*?\s?(trip|one)|\buber\b(?!.*eats)|\btaxi\b|didi\b|shebah|\bopal\b|translink|myki|\bptv\b|transperth|metro trains/,
    category: "transport",
  },
  {
    test: /\bbp\b|caltex|ampol|\bshell\b|7-?eleven|seven eleven|united petroleum|\bmobil\b|liberty fuel|speedway|\bfuel\b/,
    category: "transport",
  },
  {
    test: /parking|linkt|citylink|eastlink|e-?toll|\bracv\b|\bnrma\b|\braa\b|\bracq\b|rego\b|vicroads/,
    category: "transport",
  },

  // Utilities and telco
  {
    test: /telstra|optus|vodafone|iinet|\btpg\b|aussie broadband|belong\b|boost mobile|amaysim|felix mobile/,
    category: "utilities",
  },
  {
    test: /origin energy|\bagl\b|energyaustralia|red energy|alinta|ergon|synergy|water corp|yarra valley water|south east water|sydney water|council rates|city of |shire of /,
    category: "utilities",
  },

  // Health
  {
    test: /chemist|pharmacy|priceline|medibank|\bbupa\b|\bhcf\b|\bnib\b|medicare|doctor|medical|dental|dentist|physio|radiology|pathology|optometr|specsavers|\bomd\b/,
    category: "health",
  },
  {
    test: /\bgym\b|anytime fitness|f45|goodlife|jetts|fitness first|snap fitness|fernwood|plus fitness/,
    category: "health",
  },

  // Entertainment and gaming
  {
    test: /steam ?games|steampowered|xsolla|faceit|csfloat|xplaygg|refrag|playstation|\bxbox\b|nintendo|epic ?games|riot ?games|blizzard|\bea swiss\b|\bea\b play/,
    category: "entertainment",
  },
  {
    test: /bet ?365|sportsbet|ladbrokes|pointsbet|\btab\b touch|ticketek|ticketmaster|hoyts|village cinema|event cinema|imax|luna park|entertainm/,
    category: "entertainment",
  },

  // Dining: fast food, restaurants, cafes, bars
  {
    test: /mcdonald|\bkfc\b|hungry jack|red rooster|guzman|nando|domino|pizza hut|subway\b|grill'?d|zambrero|oporto|schnitz|betty'?s burgers|taco bell/,
    category: "dining",
  },
  {
    test: /sushi|kebab|thai\b|ramen|pho\b|dumpling|bubble tea|sharetea|gong cha|chatime|boost juice|starbucks|gloria jean|coffee|\bcafe\b|caffe|espresso|bakery|bakers delight|donut|gelat|restaurant|bistro|tavern|\bhotel\b|public house|\bbar\b|brewing|brewery/,
    category: "dining",
  },

  // Shopping and retail
  {
    test: /amazon|\bebay\b|\bmyer\b|kmart|big w\b|target\b|bunnings|officeworks|jb hi-?fi|harvey norman|the good guys|foot locker|rebel\b|uniqlo|cotton on|h&m\b|zara\b|the iconic|david jones|chadstone|westfield|ple\.com|temu|shein|aliexpress|catch\.com|clothi|scents|fragrance|perfume/,
    category: "shopping",
  },
];

function matchesPattern(description: string, pattern: string): boolean {
  const p = pattern.trim().toLowerCase();
  if (!p) return false;
  return description.includes(p);
}

function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

/** Categorise a transaction description. User rules (substring match,
 *  case-insensitive) take priority over the default keyword ruleset. */
export function categoriseDescription(
  description: string,
  userRules: CategoryRule[] = []
): Category {
  const haystack = description.toLowerCase();

  for (const rule of userRules) {
    if (isCategory(rule.category) && matchesPattern(haystack, rule.pattern)) {
      return rule.category;
    }
  }

  for (const rule of DEFAULT_RULES) {
    if (rule.test.test(haystack)) return rule.category;
  }

  return "other";
}
