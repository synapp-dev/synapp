# CRIS / CRISSP research (2026-07-15)

Deep-research pass on the incumbent Victorian government system our caseworker platform would compete with / complement. 25 claims verified 3-0 (one 2-1) via adversarial fact-checking against primary sources.

## What it is

- **CRIS (Client Relationship Information System)**: DFFH's core client information and case management system. Designed in-house by the then Department of Human Services circa 2004, live since **2005**. Original scope: Child Protection, Disability Services, Juvenile Justice, Early Childhood Intervention. No external vendor identified (in-house build; 2-1 verification vote). CRISSP still runs on a legacy DHS domain (`crissp.webapp.dhs.vic.gov.au`).
- **CRISSP (CRIS for Service Providers)**: externally-facing variant for funded community service organisations (child, youth, disability).
- **CRISSP Youth Case**: youth-sector module for community orgs, covering YJCSS (incl. THM Youth Justice Housing Pathways), Finding Solutions, Adolescent Support, Leaving Care. Page content is stale (YJCSS guides dated May 2015; "reporting tool currently being developed" for a decade).
- Orgs doing **contracted case management** for child protection and/or youth justice use full **CRIS itself** (not just CRISSP) under an e-Business Access Agreement. DFFH still runs CRIS contracted-case-manager training into July 2026.

## Access model

- DFFH **eBusiness portal** (EUSPortal, `hns.dhs.vic.gov.au/EUSPortal/`): eBusiness username/password, then **RSA token 2FA** (4-digit PIN + soft/hard token code). Additional authentication layer added 27 Nov 2023.
- Each agency nominates an **Organisation Authority** who validates its users. Registration is gated, not self-service.
- "CRIS for Funded Agencies" and CRISSP are separate applications with separate access applications. Support: eBusiness Support Service, escalating to the ICCMS (Integrated Client Case Management Systems) helpdesk.

## Audit record (the pain-point catalogue)

**VAGO, "Quality of Child Protection Data", September 2022** ([report](https://www.audit.vic.gov.au/report/quality-child-protection-data)):

- CRIS is "a legacy system that has not kept pace with technology and sector changes"; not fit for its intended purpose.
- Most information recorded in **unstructured free-text case notes**; structured fields too cumbersome, so practitioners dump everything into notes. **CRIS has no search function over case notes.**
- No data dictionary. **19 of 22 data quality controls not implemented effectively.**
- Weak access control: at least **63 accounts still active 75+ days after last login** despite a 60-day auto-deactivation policy; deauthorised staff could still access/edit children's records.
- Practitioners: the data-entry burden "outweighs the hours to complete the work".
- No integration with sibling DFFH systems (e.g. carer payments).

**Victorian Ombudsman, September 2022** (former youth worker's unauthorised access, [report](https://www.ombudsman.vic.gov.au/our-impact/investigation-reports/investigation-into-a-former-youth-workers-unauthorised-access-to-private-information-about-children/)):

- CRISSP's **360 Degree Search** over the **Common Client Layer** lets a worker at one funded agency see basic pre-match details (name, DOB, contact, address) of other agencies' active clients.
- All clients **unrestricted by default**; the only gate is the procedural rule that the user "must be about to enter a new client". Privacy by procedure, found inadequate.

**VAGO, Out-of-Home Care Services, June 2026**: CRIS data still has longstanding accuracy, timeliness and completeness problems limiting DFFH decision-making.

## Modernisation status

- DFFH accepted VAGO's recommendation to determine and advise government on a modern replacement; documented seeking funding for technology reform.
- Ten **"Digital Opportunities"** enhancements to ICCMS committed. Shipped: High-Risk Infants, Client Case Overview, L17 (family violence report) Integration (March 2024); **Compliance Dashboard** (13 July 2024). Remaining six: status unknown.
- **No completed replacement or public tender for a CRIS successor found.** But (below the verification cut): the 2026-27 Victorian budget includes roughly **$106-126M for a three-year DFFH "communities and families" IT transformation**, the largest IT item in that budget; most likely replacement vehicle.
- Parallel: NSW DCJ tendered to replace its Youth Justice CIMS (RFx_1128, Aug-Oct 2025).

## Caveats / open questions

- Youth justice moved from DHHS to **DJCS in 2017**. Verified findings cover community/funded YJ services (CRISSP Youth Case, contracted case management), NOT statutory/custodial YJ casework. Which system DJCS uses for statutory YJ today is unresolved from public sources.
- Did government fund the post-VAGO reform bid, and is procurement underway (check Buying for Victoria)?
- Technology stack (language, platform, DB) never established publicly.

## Demo wedge: each differentiator maps to a citable government finding

1. Searchable, structured case notes (VAGO: no case-note search, free-text dumping ground)
2. Low-friction, workload-aware data entry (VAGO: entry burden exceeds working hours)
3. Per-case compliance visibility (the gap the 2024 Compliance Dashboard belatedly patched)
4. Auditable, permission-based cross-agency sharing, restricted by default (Ombudsman: privacy-by-procedure)
5. Modern auth vs eBusiness portal + RSA token double-login
6. Integration across sibling systems (VAGO: none, even carer payments)

Pitch context: incumbent is a 2005-era system with a $100M+ replacement budget now on the table.
