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
