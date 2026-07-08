# Reply to Glenn - three UAT matters (8 July 2026)

**Send as a reply in his UAT thread** (the 3:43pm "three critical operational matters" email)
**To:** glenn@rushtonmanagement.com.au
**Cc:** jeff@bullyproofaustralia.org.au
**Attachments:** none (everything is demonstrable live on the platform)

---

Hi Glenn, Jeff,

Thank you for the clear write-up; all three are answered below, and two of them you can verify live on the platform right now. I have set up the exact demonstration you asked for on the St4s Test School so you can click through it during UAT rather than take my word for anything.

**1. Annual school-year rollover: demonstrated, live now**

The demonstration you requested is already loaded on the St4s Test School:

- Class "5/6 Crocodiles" ran the Program in 2026: three completed lessons with dates, the delivering teacher, ratings and comments.
- That class has been archived for year end (Settings > Classes > open the class > set Active off). Every record stays attached to it.
- A new "5/6 Crocodiles" has been created for the 2027 running year, same name, starting at zero lessons.
- Where to verify: School portal > Settings > Classes shows both classes side by side (the 2027 class Active, the 2026 class Inactive with its student numbers); School portal > Reports shows both rows with their delivered and completed lesson counts and last-lesson date, exportable.

So the end-to-end process for an existing school commencing a new year is: archive the outgoing classes, then create or bulk-import the new year's class list (the existing CSV import handles same-name classes for the new year), assign teachers, and start at zero. No renaming, no overwriting, no deletion of historical data. Prior-year records remain preserved and retrievable per class, exactly as your letter specifies.

Two related protections worth knowing about, both live: a class that has delivered lesson history can no longer be deleted by anyone (the platform directs you to archive it instead, so a year of records cannot be destroyed from the UI), and class names are only reserved among active classes, so archived years never block the new year.

For the boundary, as your letter itself distinguishes: the year-selection dropdowns, per-state term calendars, the schedule engine and year-scoped reporting views from the 22 June document remain M2/M3 as tabulated. The underlying rollover process above is delivered.

**2. Highest-level administration: you already hold it, and handover completes it**

Two factual corrections first, then the practical path.

First, Bullyproof Admin user management is already independent of Intradark. A Bullyproof Admin can create, manage, re-role and remove other Bullyproof Admin users today: Admin > Users > Add New User > Bullyproof > Bullyproof Admin, and the same screens manage and remove them. This was covered in my last letter and is verifiable in UAT in two minutes. The only account operation reserved to the developer role is modifying holders of the developer role itself, which is a safety guard, not a dependency.

Second, destructive actions (delete user, delete school) are not hardcoded to Intradark. They are configurable permissions in the feature-access system, currently granted to the developer role as a safety default. Who holds them is data, not code, which matters for what follows.

On ultimate control: at handover under clause 6 you receive the repository, the database, the hosting and every credential. From that day, ultimate administrative control of the platform is yours structurally, not by role naming: you can grant or revoke anything, including developer access, and Intradark's access exists only to the extent you grant it for M1 and any commissioned work. The concern your letter describes resolves itself at settlement, by design.

On the specific proposal: there is no technical barrier to an AMAYDA_OWNER top tier with you and Jeff as the initial holders and a separate, revocable developer/support level below it. But it is not a rename or a configuration toggle. The developer role's identifier is wired through the platform's permission guards, maintenance controls, seed data and administrative UI, and separating the developer tooling from an owner role, with the owner able to grant and revoke developer access safely, is precisely the access-tier work module M8 prices. What your letter describes is a slimmer version of what was quoted, and I am happy to descope and reprice M8 downward accordingly at the Teams session. In the meantime, nothing about Phase 1 acceptance turns on this: admin self-management is delivered, and full control transfers at handover.

**3. Content audit logging and ST4S: the record, then the split you asked for**

What exists today: the platform keeps authentication event logs (every sign-in and token event, retained by the auth layer), creation and update timestamps across content, and the operational activity feed. What it does not keep is a per-edit attribution trail for lesson and course content, and I will not pretend otherwise in UAT: the Audit Logs workspace is prepared, and the guide says exactly that.

On the compliance question, I want to be precise, because the record matters:

- The SOW references ST4S in one context only: the OTP and session-expiry authentication posture (SOW 5.1.1 / 7.1.3). That item is delivered, and the full position is documented in the handover pack.
- The ST4S Supplier Guide (2025.1) itself imposes mandatory audit-log requirements only for specific product functionality: chat and instant messaging (control PF9D), commenting and community forums (PF10D), and session recordings (PF6). The platform has none of those features, which places it well on those criteria, not poorly. Its authentication-event logging question (PF55) is answered yes today. The remaining logging controls (L1, L2) are organisational policy and procedure documents, not product features, and I will include a logging policy and an event-log auditing procedure in the handover documentation set at no charge so an ST4S assessment finds them ready.
- Content-change audit logging appears nowhere in the ST4S framework, and nowhere in the SOW or Variation. It enters the record for the first time as item 24 of your 22 June document, which is why it is tabulated D and quoted in M5.

That said, your letter draws a sensible line between a minimum compliance trail and the enhanced M5 functionality, and you asked what the minimum would take separately. Here it is: an audit record on every create, edit and delete of lesson and course content, capturing the user, the timestamp, the record affected and the action, retained and reviewable in the existing Audit Logs workspace with basic filtering. Carved out of M5 as its own deliverable: $15,950 + GST, roughly five and a half days of work, and it can be commissioned independently of the rest of M5 (version comparison, rollback, visual histories and the other enhanced items remain optional). Say the word and I will issue it in the same format as M1.

**On process**

None of the three items above is a defect in the delivered scope, so I have treated them as UAT clarifications rather than clause 7.2 notices, and answered each with either a live demonstration or a factual position plus a commercial path. If you and Jeff would like to walk any of them through on a call or at the Teams session, happy to. And since your review is ongoing, it may save us both time if further queries come across as a consolidated list; I will turn them around the same way.

Respect always,
Aaron

---

**Aaron J. Girton**
Intradark | Founder & Director
agirton@intradark.com
