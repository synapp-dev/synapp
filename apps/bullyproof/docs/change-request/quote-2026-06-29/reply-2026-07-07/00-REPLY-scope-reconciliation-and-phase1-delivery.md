# Reply to Glenn - scope reconciliation and Phase 1 delivery (7 July 2026)

**To:** glenn@rushtonmanagement.com.au
**Cc:** jeff@bullyproofaustralia.org.au
**Subject:** Re: M2-M8 reconciliation - agreed, and Phase 1 is complete and delivered for UAT

**Attachments:**
- Bullyproof-SOW-Completion-Register-FINAL.docx
- Final acceptance letter (clause 7.1 delivery)
- Administrator User Guide (Word)
- Bill of Materials (CSV)
- Variation deliverables verification register
- Phase 1 UAT checklist
- M2-M8 scope classification (A, B, C, D, per your categories)
- Tax invoices: Phase 1 completion; M1 deposit

*(The System Administrator Guide, covering configuration, deployment and credentials, is complete and is delivered with the clause 6 handover set on payment, together with the source code and repository control.)*

---

Hi Glenn, Jeff,

Thank you for the considered reply, and for the clear yes on M1 and on completing Phase 1 plus the goodwill items. All accepted, and the M1 deposit arrangement works: the deposit invoice is attached ($7,645 + GST = $8,409.50). M1 starts the day it lands.

Your classification framework is also agreed. A, B, C, D is exactly the right way to look at it, and I will not ask you to pay twice for anything. The best news in this email is that the reconciliation you are asking for is not a negotiation ahead of us: most of it completed itself this week, in code.

## Phase 1 is complete, and delivered for UAT today

Since your 22 June document I have been closing out every remaining Phase 1 obligation, every Variation item, and every defect, and re-testing all of it end to end. That work finished today. The attached FINAL Completion Register shows every deliverable at Delivered with the implementing evidence, and the attached acceptance letter constitutes delivery for UAT under clause 7.1, with the 15 business day window under clause 7.2 running from today.

This matters for your letter because every example you listed as incomplete or not working is already done. Point by point:

| Your example | Status today | Where to verify |
|---|---|---|
| Admin Reports page requiring completion | Complete: four report tabs with live data, CSV and PDF export on every tab, plus the full export pack (schools register, per school classes, staff, lesson history, culture periods) | Admin > Reports > Export |
| Culture Rating inputs, formulas, rules, comparative periods | Complete and verified live, including the zero-input weighting from your document (a zero entry re-weights across the remaining inputs; verified against hand-computed values). A worked example is loaded on the St4s Test School | Admin > Culture ratings > St4s Test School; School portal > Performance and Reports |
| School address and email domain not saving | Reproduced, root-caused and fixed this week. The save was persisting; the admin drawer then failed to display the saved values, which reads exactly as "did not save". Fixed and verified on your exact flow: edit, save, reload | Admin > Schools > any school > Details |
| Activation status not displayed | Complete: on the school's Activation tab the applied template shows a green card with a "Template active" badge and the button changes to "Re-apply template" | Admin > Schools > school > Activation |
| Lesson selection producing blank screens | Fixed: a blank screen is no longer possible. Mismatched selections show the guidance panel built from the wording in your document, with a per-class pick, Back, and a compromise option | Teach Lessons > select two classes at different levels |
| Incorrect recommendations, list capped at three, ordering | Fixed: composite classes resolve correctly, every lesson in a level lists (all ten), and levels order by year from 1/2 up to 12 | Teach Lessons > Choose another lesson |
| Lesson takeover not working | Working and verified: takeover is available to teachers at the school on preparing, ready and in progress lessons. What you hit in June was the permission gate doing its job on an account without access at that school | Teachers page > a teacher's unfinished lesson |
| Navigation controls not working | Fixed: Back to lesson routes by lesson status (completed lessons return to Feedback, not Prepare), and the welcome redirect loop is gone | Any completed lesson > run lesson > Back to lesson |
| Support not working | Working: the Support button opens a pre-addressed email to support@bullyproofaustralia.org.au with you and Jeff on copy | Sidebar > Support |
| Feature Access not working | Working and verified: the panel renders the permission hierarchy with per-feature visibility and access toggles per school | Admin > Schools > school > Feature Access |
| User and access-control limitations | Delivered: Access Levels naming throughout, only the highest level shown per user, working column sorting, school-scoped filters, and platform user creation (see M8 below) | Admin > Users; school portal Teachers and Settings |

Two corrections from your M8 section, because they change the reconciliation:

- **Adding Bullyproof Admin users.** The facility exists today: Admin > Users > Add New User > choose Bullyproof > Bullyproof Admin (or Bullyproof Staff), and the same screens manage and remove those users. A fault that could interrupt platform-scoped user creation was found and fixed during my completion testing this week, which may be what you ran into. You can verify by creating a staff member in two minutes; a test Government viewer account created through this exact flow is already in the system (gov.viewer.test@bullyproofaustralia.org.au). So this is not outstanding Phase 1 work and it is not in M2-M8 as new work either: it is delivered.
- **The Amayda access level** above Bullyproof Admin: agreed, that is new work (it is priced in M8), and we can assess it separately as you suggest.

## The A, B, C, D classification

Applying your categories to the M2-M8 proposal as of today:

- **Category C (defect, warranty, incomplete) is empty.** Every genuine defect from your 22 June document is fixed at no charge, plus seven more I found in my own testing and fixed the same way (they are listed in the register). There is no defect work left to classify.
- **Categories A and B (SOW and Variation scope) are delivered, not pending.** Reporting with CSV and PDF export, the government view-only dashboard, culture rating in full, the downloadable certificate, documentation and the bill of materials: all Delivered in the attached register with evidence. Nothing in M2-M8 is needed to complete them.
- **Category D is what M2-M8 contains.** Each module quote already closes with an appendix quoting the exact passages of your 22 June document it responds to, which is the line-by-line tracing you asked for. The boundary principle is the one in our signed agreement: where the SOW stated a requirement in general terms, the delivered implementation discharges it, and later, more detailed specification of the same area is additional work (Variation clause 11(2)).

On your specific module notes: M2 agreed as new. M3 presents data the platform already holds, but a program-health home page, term calendars, a schedule calculation engine and nine drill-downs are new construction, not display changes; the register's Section 4 maps each item. M4: the baseline reports and exports you describe are delivered (verify above); M4 prices only the four renamed report types with percentage builds, filter panels, Excel and export scopes. M5: ST4S security posture is documented in the handover pack; content audit logs, versioning and step-up MFA were never in the SOW and are quoted. M6: the Variation culture scope is delivered and live-verified; M6 prices the signed speedometer and the expanded page. M7: the defect list you cite is fixed free (above); M7 prices the new scheduling flows and redesigned pages only. M8: platform user management is delivered (above); M8 prices the Amayda tier, onboarding checklist extensions and getting-started video management.

The tabulated line-by-line is attached: every numbered item from your 22 June document tagged A, B, C or D, with where each one stands today. Then let us do the Teams session you proposed with the SOW open. Any line where you show me the SOW or Variation already says it, I will re-tag it without argument. Once the tags are agreed, I will reissue the Category D quotes in exactly the format you asked for: deliverable, estimated hours, rate, personnel, commencement and completion dates, acceptance criteria, and the payment milestone for each item.

## The Phase 1 account

We are aligned on the frame, which is the one from my proposal's Section 7: $250,000 total, being the $150,000 + GST fixed fee under the Variation plus the $100,000 salary component, with super and leave counting toward the component as you advised.

Three things to pin down so the numbers close cleanly:

1. **Salary figure.** Your $96,482.57 reconciles closely against my payslips on the agreed basis (gross plus super, with accrued leave counting): gross to 10 June was $72,348.50 with $8,681.82 super, and adding the 10 July run (gross $8,333.33 plus super) and the accrued annual leave balance paid out on cessation lands within a few hundred dollars of your figure. Could you send the short schedule (gross, super and leave per run) so we adopt one exact number? Naturally the 10 July run and the leave payout count toward the component only once actually paid; if either does not proceed, the completion balance adjusts up by the same amount, so we are both whole either way.
2. **Cessation date.** Let us fix the salary arrangement as ending with the 10 July run, in writing, so the component stops moving and the completion balance is a fixed number for both of us.
3. **GST and settlement channels.** The salary component carries no GST, but the fee balance and M1 do. So on your own figures the position is: fee balance $100,000 + GST = $110,000 (invoiced by Intradark, attached), plus the salary component remainder of $100,000 less the verified salary figure (on your number, $3,517.43, settled through payroll with the final run, no GST), plus M1 at $19,112.50 + GST. Your $122,629.93 is the ex-GST arithmetic of the same position, so we are agreeing on substance; the paperwork just needs to carry the GST correctly.

The Phase 1 completion invoice is attached and is payable on Acceptance under clause 7 (including deemed acceptance under 7.4), exactly as clause 4(b) provides. It is not contingent on the M2-M8 reconciliation, and your letter reads the same way, so I do not think we disagree: Phase 1 completes on its own contractual track while we agree the new work in parallel.

## Source code, repositories and what transfers

Clause 6 of the Variation governs the sequence: full source code, documentation, credentials and repository control are delivered on completion and receipt of final payment, and until then you have full access to the running platform for review and validation. That is exactly what will happen, and here is the concrete shape so there are no surprises on the day:

- **What you receive on payment, same day it clears:** a dedicated Bullyproof repository under Amayda's control containing the complete platform: application source, the shared component packages the build requires, database schema and the full migration set, seed and configuration templates, deployment instructions, and the System Administrator Guide, together with all credentials and keys delivered securely. It builds and deploys as documented, independently of me.
- **What it does not include:** Intradark's internal development environment sits in a company monorepo alongside unrelated Intradark projects and internal tooling; those are not part of the Bullyproof platform and do not transfer. The delivered repository is the platform, complete and self-sufficient.
- **Clause 5 boundaries, marked in the code:** as the Variation records, the platform embeds Intradark's Underlying Systems (reusable architecture, libraries and non-client-specific components), which remain Intradark's property. They are delivered with the platform so it runs and can be maintained, and the repository will include a short schedule identifying them, mirroring clause 5: they are for use within the Bullyproof platform, and not for extraction, isolation or repurposing into other products, just as I am bound not to replicate Bullyproof for anyone else.
- **Ongoing work:** from transfer day I am glad to keep working in the Amayda-controlled repository for M1 and any commissioned modules, exactly as you proposed.

In the meantime the Administrator User Guide is attached now because your team needs it for UAT; the System Administrator Guide travels with the handover set, since deployment instructions and credentials are part of what clause 6 delivers on payment.

## To keep everything moving

1. M1 deposit invoice attached; build starts on receipt. The two goodwill items from my June email, the BA rebrand and the uploadable certificate template, remain committed at no charge and are unaffected by the M2-M8 reconciliation.
2. Phase 1 UAT starts today: the checklist walks every item, the register maps every deliverable to evidence, and the test school (St4s Test School) is loaded with worked examples including culture data and the government viewer account.
3. The A, B, C, D tabulation is attached; Teams whenever suits you both to work through any line where we read the SOW differently.
4. Payroll schedule and the 10 July cessation confirmation from your side close the account maths.
5. Two small confirmations still open from my June email: the ACT Term 3 dates in your table duplicate Term 2, and please confirm the 25 April email is the final culture rating weighting (the engine is live with the interim constants and I will apply yours the day they arrive; it does not hold up acceptance).

Thank you both for the way this is being handled. The platform is finished, tested and documented; the new work is scoped and priced; and the path you have proposed is the same one I want.

Respect always,
Aaron

---

**Aaron J. Girton**
Intradark | Founder & Director
agirton@intradark.com
