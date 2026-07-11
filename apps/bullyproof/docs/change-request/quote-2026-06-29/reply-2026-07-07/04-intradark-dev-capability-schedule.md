# Developer Capability & Handover Disposition Schedule

*Every capability currently held by the developer access level, its disposition at the clause 6 handover, and who holds it afterwards. Issued in response to Amayda's request of 9 July 2026; this schedule also forms part of the handover manifest.*

## 1. Capability register and disposition

Each row answers, for one capability: what it is, its status today, what happens to it at handover, and who holds it afterwards.

| Capability | What it is | At handover | Held by, after handover |
|---|---|---|---|
| Feature Access Control console (/admin/features) | Per-feature permission switching at global, access-level, school and user levels; creation of new feature entries | Removed (Intradark development tooling). The permission configuration itself transfers as data, exactly as accepted at UAT | Configuration changes are made by whichever developer Amayda engages, or via an owner console if commissioned (M8) |
| Permission template authoring | Creating and editing the template bundles used to activate schools | Removed (development tooling). The existing templates transfer as data and continue to work | Template application remains a Bullyproof Admin function on each school's Activation tab, unchanged |
| Migrations console (/admin/migrations) | Convenience UI for applying database migrations | Removed. The full migration SQL set and runner scripts are deliverable D5 and transfer in the repository | Any developer Amayda engages, using the repository and the database credentials Amayda holds |
| Support tools workspace (/admin/support-tools) | Placeholder workspace; contains no functionality | Removed | Not applicable |
| Audit logs workspace (/admin/audit-logs) | Placeholder workspace; contains no functionality | Removed; reinstated as the delivery surface for the minimum audit module if commissioned | Bullyproof Admin, if the audit module is commissioned |
| Impersonation (view as user) | Read-only troubleshooting view of the platform as another user | Removed (development tooling; also the correct privacy posture for a production system) | Not applicable; can be productionised under owner governance as part of M8 if wanted |
| Delete user / delete school | Destructive operations, enforced server-side as discrete permissions | Retained as platform functions. The permission grants are reassigned to the access level Amayda nominates (recommended: Bullyproof Admin, held by the directors) as part of handover configuration | Amayda |
| Feedback ticket queue and ticket closing (/admin/tickets) | The in-platform feedback ticket workspace; closing tickets is currently reserved to the developer level | Retained. The queue is enabled for Bullyproof Admin and ticket closing is reassigned to Bullyproof Admin as part of handover preparation, at no charge | Amayda |
| Maintenance mode | Platform-wide maintenance switch, with a developer bypass | Retained as a platform function. The switch is reassigned to the access level Amayda nominates; the developer bypass is removed with the developer role | Amayda |
| Content Types workspace (/admin/content-types) | The M1 module work area, restricted while under construction | Enabled for Bullyproof Admin on M1 delivery and acceptance | Amayda |
| Developer role and holder guard | The INTRADARK_DEV access level and the safeguard that only its holders can modify its holders | Removed entirely, including the guard. No protected or privileged role remains in the platform | Not applicable |

## 2. Nothing required to operate, maintain or develop the platform is removed

The removed items above are convenience consoles over standard engineering tooling; the capability behind each of them transfers in full:

- Complete application source code, including every feature the platform runs on.
- The complete database schema and full migration SQL set with runner scripts (deliverable D5).
- Seed and configuration templates, deployment instructions and the System Administrator Guide.
- Every credential and key: repository, hosting, database, storage, email and auth administration.

With those, Amayda or any developer it engages can operate, maintain, troubleshoot, migrate, back up, recover and further develop the platform with no Intradark involvement. The consoles being removed do nothing that cannot be done with the transferred repository, scripts and credentials; they only did it with fewer keystrokes for the developer who built them.

## 3. How Amayda grants, restricts and revokes developer access after handover

Control operates at three layers, all held by Amayda from settlement day:

1. **Repository**: the code lives in a repository under Amayda's account. Amayda adds or removes any developer as a collaborator at any time.
2. **Infrastructure and credentials**: hosting, database, storage and auth administration credentials are transferred to Amayda and can be rotated by Amayda at any time, which revokes all prior access immediately and unilaterally.
3. **In-platform access**: user accounts and access levels are managed by Bullyproof Admin. With the developer role and its guard removed, there is no account or level on the platform that Amayda cannot create, modify or remove.

Intradark's own access after handover exists only where Amayda grants it for M1 and any subsequently commissioned work, through exactly these mechanisms, and is revocable by Amayda in the same way as for any other engaged developer.
