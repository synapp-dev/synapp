# Reply to Glenn - settlement process confirmation (8 July 2026)

**To:** glenn@rushtonmanagement.com.au
**Cc:** jeff@bullyproofaustralia.org.au
**Subject:** Re: M2-M8 reconciliation - agreed, and Phase 1 is complete and delivered for UAT

---

Hi Glenn, Jeff,

Thank you, and yes: I am comfortable proceeding on exactly the basis you propose. The coordinated settlement process is a sensible way to give both sides certainty, and it matches the sequence I described: no access to the handover materials before payment, everything in your hands the moment it clears.

Confirming the mechanics, with dates attached so neither of us is waiting on an undefined step:

1. **Trigger.** The process runs once Final Acceptance is achieved in accordance with clause 7, which includes deemed acceptance under clause 7.4 if the UAT period passes without a notice of material defect. Same process either way, so the pathway is fixed today regardless of how acceptance lands.
2. **Amount.** For the purposes of this process, the final Phase 1 payment is the invoiced clause 4(b) amount of $110,000 including GST (invoice ITRDRK-AMYD-A03, already issued). The salary component remainder settles through payroll with the final run as we discussed and sits outside this process; your payroll schedule is the only input still needed to close that number.
3. **Package and manifest.** Within three business days of Final Acceptance, I deliver the handover manifest and the complete package as an AES-256 encrypted archive with its SHA-256 hash, via a mutually agreed location (Google Drive or OneDrive both work for me). The package contains everything listed in my last email: application source and required shared packages, database schema and full migration set, seed and configuration templates, deployment instructions, the System Administrator Guide, and the clause 5 schedule identifying the Underlying Systems.
4. **Verification and payment.** You confirm receipt and that your computed SHA-256 matches the hash provided, and make the final Phase 1 payment within two business days of that confirmation.
5. **Key and credentials.** The same business day the payment clears, I provide the decryption key and securely transfer the credentials and keys that properly travel outside the archive.
6. **Transfer and continuity.** You decrypt, confirm the contents against the manifest, and we move the repository into your Amayda-controlled environment, with my access retained for M1 and anything else you commission.

Agreed also that none of this changes the payment obligations, acceptance requirements, IP arrangements or the clause 5 provisions for the Underlying Systems. It is sequencing, not new terms.

Thank you for arranging the M1 deposit; the build starts the day it lands, and I will begin preparing the handover package and manifest during the UAT window so there is no delay on my side once acceptance is reached.

If anything comes up while you and Jeff work through the UAT materials, send it over as you find it; happy to walk through anything on a call.

Respect always,
Aaron

---

**Aaron J. Girton**
Intradark | Founder & Director
agirton@intradark.com
