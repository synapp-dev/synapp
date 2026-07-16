# Reply to Glenn - capability schedule + audit scope (11 July 2026)

**Send as a reply in the UAT thread**
**To:** glenn@rushtonmanagement.com.au
**Cc:** jeff@bullyproofaustralia.org.au
**Attachments:** Developer Capability & Handover Disposition Schedule (docx); Minimum Content Audit Trail - Technical Scope (docx)

---

Hi Glenn, Jeff,

Thanks Glenn. The St4s demo is set up for exactly the steps you listed, including delivering new lessons to the 2027 class and exporting the prior-year records from the school Reports page, so verify away.

One heads-up before you get there: there is no separate "suspend" switch for administrators. Disabling is done by removing or re-roling their access level, which takes effect immediately. If you want a dedicated suspend control it belongs with the M8 access work, but removal achieves the same outcome today.

Your five questions on the developer role are answered in the attached **Developer Capability and Handover Disposition Schedule**: every capability the role holds, what happens to it at handover, and who holds it afterwards. The short version:

1. Nothing you need to operate, maintain, troubleshoot, migrate, recover or further develop the platform is removed. What goes are convenience consoles; the capability behind each transfers in the repository, migrations, documentation and credentials.

2. Three functions parked with the developer role for safety (the delete user and delete school permissions, ticket closing, and the maintenance switch) are reassigned to whatever access level you nominate at handover, no charge.

3. After settlement you control everything at three layers: the repository, the credentials (rotate them and any prior access dies instantly), and in-platform access levels with no protected role left. Any access Intradark has after that is access you grant, revocable the same way as for any developer you might engage.

The schedule also goes into the handover manifest, so what you check at settlement is what you have already read.

The audit trail scope is attached as the **Minimum Content Audit Trail: Technical Scope**. Sections 1 to 9 answer your nine points in order, including the capture level: logging sits in the server service layer, so API changes are captured, not just changes made through the interface.

On the price: some good news. While scoping the Content Type build I found a decent overlap with this module. M1 already generalises the curriculum and certification services the audit trail hooks into, so a chunk of the groundwork allowed for in the $15,950 estimate does not need doing twice. Itemised task by task in section 9, at the same rates as every other module, the price comes down to **$7,162.50 + GST fixed** (66 hours, $108.52/hr blended). If the rest of M5 is ever commissioned, M5 comes down by the overlap too, so nothing is ever paid twice. Same pattern as M1: 40% deposit ($2,865.00 + GST), balance on delivery against the section 8 acceptance criteria. Only note: that price assumes it is commissioned while M1 is in flight; picked up much later, the instrumentation lines would need a re-look. As with the other modules this is separately commissioned work; nothing in Phase 1 acceptance turns on it.

Noted on reserving your position; mine is the same in reverse. The classifications stand as tabulated unless a line of the SOW or Variation says otherwise, which is what the Teams session is for. Send the consolidated findings whenever suits within the UAT window; the settlement process we confirmed last week keeps running in the meantime, with review through Tuesday 28 July. Happy to jump on a call for any of it.

Respect always,
Aaron

---

**Aaron J. Girton**
Intradark | Founder & Director
agirton@intradark.com
