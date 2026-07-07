# INTRADARK

Intradark Pty Ltd  ·  ABN 38 696 182 457

## Final Delivery and Request for Acceptance

| | |
|---|---|
| To: | Glenn Rushton, Director, Amayda Pty Ltd |
| From: | Aaron J. Girton, Director, Intradark Pty Ltd |
| Date: | 7 July 2026 |
| Re: | Final delivery of the Bullyproof platform under the Formal Variation Agreement; delivery for UAT under clause 7.1 and request for written acceptance |

Glenn,

This letter gives formal notice of Final Delivery of the Bullyproof platform under the Formal Variation Agreement and the Statement of Work it attaches as Schedule 1. Every deliverable defined by the Agreement is complete. The enclosed FINAL issue of the Completion and Deliverables Register records each deliverable, its status (all Delivered), and the implementing evidence in the build.

### 1. What accompanies this letter

1. Completion and Deliverables Register, FINAL issue dated 7 July 2026 (all items Delivered).
2. Administrator User Guide (Word), deliverable D6, enclosed now for use during UAT.
3. Bill of Materials of open-source components and licences (CSV and Markdown, 640 packages generated from the production dependency tree), deliverable D7 under SDA 4.4.
4. UAT checklist covering the completed items, with the checks already verified during my own testing marked as such.
5. Tax invoice for the clause 4(b) completion and handover payment, payable on acceptance and handover.

The System Administrator Guide (deliverable D6, complete), covering configuration, deployment and credentials, is delivered with the clause 6 handover set on receipt of final payment, together with the source code and repository control.

### 2. Delivery for User Acceptance Testing (clause 7.1)

The platform is available for your testing at [production URL, e.g. https://app.bullyproofaustralia.org.au] using your existing administrator account. For test purposes:

- **St4s Test School** is populated with classes and data, including a worked culture-rating example (benchmark plus two comparative periods) so you can see the calculation behaviour end to end without touching a real school.
- A **Government viewer account** exists: gov.viewer.test@bullyproofaustralia.org.au. It signs in with the normal email one-time code sent to that mailbox, which your organisation controls. It demonstrates the view-only government reporting dashboard.
- The UAT checklist enclosed walks each completed item with steps to verify it.

This letter, together with that access and the enclosed instructions and test accounts, constitutes delivery for UAT under clause 7.1.

### 3. The acceptance window (clauses 7.2 and 7.4)

Under clause 7.2 you have 15 Business Days from the date of this letter to either issue written Acceptance or provide a defect list. A defect for this purpose is a fault in functionality the Agreement required and I delivered (SDA Warranty clause 8.1(b); Variation clause 7.3); I will remedy any material defect at no cost and re-submit. Under clause 7.4, if no response is received within the UAT Period and no material defect prevents testing, the deliverables are deemed Accepted.

### 4. The one open input: Woodford weighting

The culture-rating calculation engine is delivered, unit-tested, and verified live, including the re-weighting behaviour when a metric has no measurable change. The final Woodford weighting constants are applied the day you supply the official mapping from the 25 April workbook; until then the register documents the interim constants in use. This is an input owed by Amayda, not an outstanding deliverable, and it does not affect acceptance of the delivered system.

### 5. Handover (clauses 6 and 7.5)

Clause 6 provides that full source code, documentation, credentials and repository control are delivered upon completion of the project and receipt of final payment. Accordingly, the handover set is prepared and ready:

- a dedicated Bullyproof repository under your control containing the complete platform (application source, required shared packages, database schema and migrations, configuration templates and build scripts);
- configuration and deployment instructions (the System Administrator Guide);
- administrator and user documentation (the Administrator User Guide is enclosed now for UAT);
- all credentials and keys, delivered securely.

The source code, System Administrator Guide, credentials and repository control transfer are executed on the day final payment is received, per clause 6. The delivered repository also carries a short schedule identifying the Underlying Systems that remain Intradark property under clause 5, embedded for use within the Bullyproof platform. In the meantime you have, as clause 6 also requires, full access to the running platform for review and validation.

### 6. Payment (clause 4(b))

Clause 4(b) provides that $100,000 plus GST is payable on completion of all deliverables, handover, and acceptance under clause 7. All deliverables are complete, and the handover set is prepared for same-day transfer against payment as clause 6 provides. The enclosed tax invoice for $110,000 (inclusive of GST) is payable on your written Acceptance (or deemed Acceptance under clause 7.4).

I am glad to walk you and Jeff through any part of the delivered platform before or during the UAT window. Please send written acceptance, or any defect list, to agirton@intradark.com.

Respect always,

Aaron J. Girton
Director, Intradark Pty Ltd
agirton@intradark.com
