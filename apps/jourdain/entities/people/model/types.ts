export const PERSON_CIRCLES = ["work", "friends", "family"] as const;

export type PersonCircle = (typeof PERSON_CIRCLES)[number];

export type Person = {
  id: string;
  fullName: string;
  nickname: string | null;
  circles: PersonCircle[];
  birthdayMonth: number | null;
  birthdayDay: number | null;
  birthdayYear: number | null;
  emails: string[];
  phone: string | null;
  company: string | null;
  role: string | null;
  interests: string[];
  bio: string | null;
  facts: string[];
  touchBaseDays: number | null;
  lastTouchAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePersonInput = {
  fullName: string;
  nickname?: string | null;
  circles?: PersonCircle[];
  birthdayMonth?: number | null;
  birthdayDay?: number | null;
  birthdayYear?: number | null;
  emails?: string[];
  phone?: string | null;
  company?: string | null;
  role?: string | null;
  interests?: string[];
  bio?: string | null;
};

export type UpdatePersonInput = Partial<CreatePersonInput> & {
  facts?: string[];
  touchBaseDays?: number | null;
  lastTouchAt?: string | null;
};

/** One Gmail thread involving a person, summarised from its latest message. */
export type PersonEmailThread = {
  threadId: string;
  messageId: string;
  subject: string;
  /** Display name of the latest message's sender (falls back to the address). */
  fromName: string;
  /** ISO timestamp of the latest message in the thread. */
  date: string;
  snippet: string;
  unread: boolean;
  /** true when the latest message was sent by the user, not the person. */
  outbound: boolean;
  /** Deep link to the thread in the Gmail web client. */
  link: string;
};

export type PersonEmailStatus =
  | "ok"
  | "not_connected" // no Google connection at all
  | "needs_scope" // connected, but Gmail read access not granted yet
  | "no_emails"; // person has no email addresses on file

export type PersonEmailResult = {
  status: PersonEmailStatus;
  threads: PersonEmailThread[];
};
