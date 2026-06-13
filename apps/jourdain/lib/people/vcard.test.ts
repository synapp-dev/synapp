import { describe, expect, it } from "vitest";
import { parseVcards } from "./vcard";

const SAMPLE = `BEGIN:VCARD
VERSION:3.0
PRODID:-//Apple Inc.//iOS 17.5//EN
N:Henderson;Jake;;;
FN:Jake Henderson
ORG:Atlassian;Data Platform
TITLE:Data Engineer
item1.EMAIL;type=INTERNET;type=pref:jake.henderson@gmail.com
item2.EMAIL;type=INTERNET:jhenderson@atlassian.com
TEL;type=CELL;type=VOICE;type=pref:+61 400 123 456
TEL;type=HOME:+61 2 9999 8888
BDAY:1992-03-09
PHOTO;ENCODING=b;TYPE=JPEG:/9j/4AAQSkZJRgABAQAAkACQAAD/4QCMRXhpZgAATU0AKgAA
 AAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgEoAAMAAAABAAIAAAITAAM
 AAAABAAEAAAAAAABAAAAkAAAAAQAAAJAAAAAB
END:VCARD
BEGIN:VCARD
VERSION:3.0
N:;Mum;;;
FN:Mum
TEL;type=CELL:+61 411 222 333
BDAY;X-APPLE-OMIT-YEAR=1604:1604-11-22
END:VCARD
BEGIN:VCARD
VERSION:3.0
N:Plumber;Dave;;;
FN:Dave Plumber
TEL:+61 422 555 666
BDAY:--07-15
END:VCARD
BEGIN:VCARD
VERSION:3.0
N:;;;;
FN:
TEL:+61 400 000 000
END:VCARD`;

describe("parseVcards", () => {
  it("parses a full iCloud-style card with folding and photo noise", () => {
    const contacts = parseVcards(SAMPLE);
    const jake = contacts.find((c) => c.fullName === "Jake Henderson");
    expect(jake).toBeDefined();
    expect(jake?.emails).toEqual([
      "jake.henderson@gmail.com",
      "jhenderson@atlassian.com",
    ]);
    expect(jake?.phone).toBe("+61 400 123 456");
    expect(jake?.company).toBe("Atlassian");
    expect(jake?.role).toBe("Data Engineer");
    expect(jake?.birthdayMonth).toBe(3);
    expect(jake?.birthdayDay).toBe(9);
    expect(jake?.birthdayYear).toBe(1992);
  });

  it("treats Apple's 1604 sentinel year as unknown", () => {
    const mum = parseVcards(SAMPLE).find((c) => c.fullName === "Mum");
    expect(mum?.birthdayMonth).toBe(11);
    expect(mum?.birthdayDay).toBe(22);
    expect(mum?.birthdayYear).toBeNull();
  });

  it("parses year-less --MM-DD birthdays", () => {
    const dave = parseVcards(SAMPLE).find((c) => c.fullName === "Dave Plumber");
    expect(dave?.birthdayMonth).toBe(7);
    expect(dave?.birthdayDay).toBe(15);
    expect(dave?.birthdayYear).toBeNull();
  });

  it("skips cards with no usable name", () => {
    const contacts = parseVcards(SAMPLE);
    expect(contacts).toHaveLength(3);
  });

  it("falls back to N when FN is missing", () => {
    const text = `BEGIN:VCARD\nVERSION:3.0\nN:Girton;Aaron;;;\nTEL:+61 1 1\nEND:VCARD`;
    expect(parseVcards(text)[0]?.fullName).toBe("Aaron Girton");
  });

  it("handles escaped characters and empty input", () => {
    const text = `BEGIN:VCARD\nVERSION:3.0\nFN:Smith\\, John\nORG:Acme\\, Inc;\nEND:VCARD`;
    const [john] = parseVcards(text);
    expect(john?.fullName).toBe("Smith, John");
    expect(john?.company).toBe("Acme, Inc");
    expect(parseVcards("")).toEqual([]);
  });
});
