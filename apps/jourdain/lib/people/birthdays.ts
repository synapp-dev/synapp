import {
  differenceInCalendarDays,
  lastDayOfMonth,
  startOfDay,
} from "date-fns";
import type { Person } from "@/entities/people/model/types";

export type UpcomingBirthday = {
  person: Person;
  /** Next occurrence of the birthday, at local midnight. */
  date: Date;
  daysAway: number;
  /** Age they turn on that date, when the birth year is known. */
  turns: number | null;
  isToday: boolean;
};

function occurrenceIn(year: number, month: number, day: number): Date {
  const candidate = new Date(year, month - 1, day);
  // 29 Feb in a non-leap year rolls over; clamp to the month's last day.
  if (candidate.getMonth() !== month - 1) {
    return lastDayOfMonth(new Date(year, month - 1, 1));
  }
  return candidate;
}

export function hasBirthday(person: Person): boolean {
  return person.birthdayMonth !== null && person.birthdayDay !== null;
}

export function nextBirthday(
  person: Person,
  from: Date = new Date(),
): UpcomingBirthday | null {
  if (!person.birthdayMonth || !person.birthdayDay) return null;
  const today = startOfDay(from);
  let date = occurrenceIn(
    today.getFullYear(),
    person.birthdayMonth,
    person.birthdayDay,
  );
  if (date < today) {
    date = occurrenceIn(
      today.getFullYear() + 1,
      person.birthdayMonth,
      person.birthdayDay,
    );
  }
  const daysAway = differenceInCalendarDays(date, today);
  const turns = person.birthdayYear
    ? date.getFullYear() - person.birthdayYear
    : null;
  return { person, date, daysAway, turns, isToday: daysAway === 0 };
}

/** Everyone with a known birthday, soonest first, covering the next 12 months. */
export function upcomingBirthdays(
  people: Person[],
  from: Date = new Date(),
): UpcomingBirthday[] {
  return people
    .map((person) => nextBirthday(person, from))
    .filter((entry): entry is UpcomingBirthday => entry !== null)
    .sort(
      (a, b) =>
        a.daysAway - b.daysAway ||
        a.person.fullName.localeCompare(b.person.fullName),
    );
}
