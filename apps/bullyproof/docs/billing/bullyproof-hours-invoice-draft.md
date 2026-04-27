# Bullyproof Project Invoice (Multi-Page Detailed Breakdown)

## Cover Page

- Invoice title: Bullyproof Platform Development Services
- Supplier: [Your Business Name]
- Client: [Client Name]
- Invoice number: [INV-XXXX]
- Invoice date: 20 March 2026
- Billing period: [Insert period]
- Currency: AUD

### Commercial Summary

- Total effort billed: **1,380 hours**
- Delivery cadence context: **177 days continuous delivery**
- Total project value (ex GST): **AUD 200,000**
- Effective blended rate: **AUD 144.93/hour**

---

## Methodology Page

This invoice uses an hours method with role-based pricing across a codebase-derived scope in `apps/bullyproof`.

### Codebase weighting references

- `app` and `app/api` route surface for frontend/backend implementation
- `components` and `entities` for UI and interaction systems
- `server` domain services, validation, and data orchestration
- `drizzle` and `scripts` for schema and migration complexity
- `utils/supabase/*`, `supabase/config.toml`, and deployment configuration for hosting scope
- Informally requested functionality has been formalized and commercialized as payable revision scope

---

## Scoping

| Task | Description | Roles | Rate/HR | Time | Subtotal |
|---|---|---|---:|---:|---:|
| Business Discovery Workshops | Facilitate stakeholder workshops to capture requirements and objectives | Business Analyst | 232.81 | 24 | 5,587.42 |
| Stakeholder Alignment Sessions | Run review loops to align commercial and delivery expectations | Product Manager | 232.81 | 20 | 4,656.19 |
| Workflow Mapping and ERD Planning | Map process flows and draft entity relationships for delivery scope | Business Analyst | 232.81 | 26 | 6,053.04 |
| Functional Specification Drafting | Document functional and non-functional requirements baseline | Business Analyst | 232.81 | 18 | 4,190.57 |
| Technical Feasibility and Risk Review | Assess constraints, risks, and architecture feasibility | Technical Lead | 232.81 | 14 | 3,259.33 |
| Project Milestones and Delivery Plan | Define phased milestones, dependencies, and approvals | Product Manager | 232.81 | 10 | 2,328.09 |
| Acceptance Criteria and Scope Lock | Finalize acceptance criteria and scope boundaries | Business Analyst | 232.81 | 8 | 1,862.47 |
| **Section Total** |  |  |  | **120** | **27,937.12** |

---

## UX & Design

| Task | Description | Roles | Rate/HR | Time | Subtotal |
|---|---|---|---:|---:|---:|
| Low-Fidelity Wireframing | Prepare low-fidelity wireframes for primary product journeys | UI/UX Designer | 93.60 | 28 | 2,620.91 |
| High-Fidelity Figma Prototyping | Create high-fidelity interactive prototypes for core workflows | UI/UX Designer | 93.60 | 46 | 4,305.77 |
| Design System and Component Specs | Define typography, spacing, tokens, and reusable components | UI/UX Designer | 93.60 | 34 | 3,182.53 |
| Accessibility and UX Audit | Run accessibility and usability checks against key journeys | UI/UX Designer | 93.60 | 20 | 1,872.08 |
| Iteration and Stakeholder Feedback | Incorporate iterative feedback while preserving UX consistency | UI/UX Designer | 93.60 | 22 | 2,059.28 |
| Design Handoff and Annotated Specs | Deliver annotated handoff specs for engineering implementation | UI/UX Designer | 93.60 | 20 | 1,872.08 |
| **Section Total** |  |  |  | **170** | **15,912.64** |

---

## Frontend

| Task | Description | Roles | Rate/HR | Time | Subtotal |
|---|---|---|---:|---:|---:|
| Core App Shell and Routing | Implement app shell, navigation, and route structure | Frontend Developer | 175.66 | 56 | 9,836.79 |
| Role-Based Dashboard Implementation | Build role-specific dashboards and user experiences | Frontend Developer | 175.66 | 52 | 9,134.17 |
| Lesson Runtime and Presentation UI | Implement lesson runtime views and presentation mode surfaces | Frontend Developer | 175.66 | 68 | 11,944.68 |
| Admin Panels and Content Interfaces | Build admin content, settings, and data-management interfaces | Frontend Developer | 175.66 | 56 | 9,836.79 |
| Shared Component Architecture | Create and harden reusable UI components and patterns | Frontend Developer | 175.66 | 44 | 7,728.91 |
| State Management and Data Integration | Integrate API data flows and state orchestration patterns | Frontend Developer | 175.66 | 28 | 4,918.40 |
| Responsive and Accessibility Compliance | Refine mobile/tablet responsiveness and accessibility standards | Frontend Developer | 175.66 | 16 | 2,810.51 |
| **Section Total** |  |  |  | **320** | **56,210.25** |

---

## Backend

| Task | Description | Roles | Rate/HR | Time | Subtotal |
|---|---|---|---:|---:|---:|
| Domain Schema and Service Initialization | Initialize backend domains, service boundaries, and persistence wiring | Backend Developer | 192.65 | 44 | 8,476.50 |
| API Route Implementation | Implement and secure API routes across product domains | Backend Developer | 192.65 | 92 | 17,723.59 |
| Business Logic and Validation Layers | Build validation, rules engines, and core domain logic | Backend Developer | 192.65 | 70 | 13,485.34 |
| Authentication and RBAC Controls | Implement authentication, authorization, and role permissions | Backend Developer | 192.65 | 42 | 8,091.20 |
| Reporting and Operational Endpoints | Create reporting and operational endpoints for admin workflows | Backend Developer | 192.65 | 28 | 5,394.13 |
| Performance and Query Hardening | Tune backend queries, caching decisions, and endpoint performance | Backend Developer | 192.65 | 24 | 4,623.54 |
| **Section Total** |  |  |  | **300** | **57,794.30** |

---

## DevOps

| Task | Description | Roles | Rate/HR | Time | Subtotal |
|---|---|---|---:|---:|---:|
| CI/CD Pipeline Engineering | Establish automated build, test, and deploy pipelines | DevOps Engineer | 92.80 | 30 | 2,784.11 |
| Environment Strategy (Dev/Staging/Prod) | Configure environment structure and deployment promotion model | DevOps Engineer | 92.80 | 20 | 1,856.07 |
| Secret Management and Access Policies | Implement secrets handling and secure operational access controls | DevOps Engineer | 92.80 | 16 | 1,484.86 |
| Observability and Alerting Baseline | Set up logs, metrics, and alerting for production oversight | DevOps Engineer | 92.80 | 18 | 1,670.47 |
| Backup and Recovery Design | Define backup, restore, and operational resilience procedures | DevOps Engineer | 92.80 | 14 | 1,299.25 |
| Security Hardening and Runtime Policies | Apply platform hardening and runtime security controls | DevOps Engineer | 92.80 | 22 | 2,041.68 |
| **Section Total** |  |  |  | **120** | **11,136.45** |

---

## QA and Testing

| Task | Description | Roles | Rate/HR | Time | Subtotal |
|---|---|---|---:|---:|---:|
| Test Plan and Coverage Matrix | Define test strategy, coverage matrix, and quality gates | QA Tester | 68.00 | 18 | 1,224.05 |
| Cross-Browser and Device Testing | Execute browser and device compatibility testing cycles | QA Tester | 68.00 | 32 | 2,176.09 |
| Regression Testing Cycles | Run regression passes across critical product workflows | QA Tester | 68.00 | 36 | 2,448.10 |
| Integration and API Test Verification | Validate cross-system integrations and API behaviors | QA Tester | 68.00 | 20 | 1,360.05 |
| UAT Facilitation and Defect Triage | Facilitate client UAT and triage/prioritize defects | QA Tester | 68.00 | 22 | 1,496.06 |
| Fix Verification and Sign-Off Testing | Retest fixes and prepare sign-off quality evidence | QA Tester | 68.00 | 12 | 816.03 |
| **Section Total** |  |  |  | **140** | **9,520.38** |

---

## Deployment and Hosting

| Task | Description | Roles | Rate/HR | Time | Subtotal |
|---|---|---|---:|---:|---:|
| Supabase Production Setup | Configure Supabase auth, storage, policies, and production settings | DevOps Engineer | 104.00 | 24 | 2,496.10 |
| Vercel Runtime and Build Configuration | Set up Vercel environments, builds, and runtime constraints | DevOps Engineer | 104.00 | 20 | 2,080.08 |
| GitHub Workflow and Release Controls | Establish branch strategy and release workflow controls | DevOps Engineer | 104.00 | 18 | 1,872.08 |
| Domain, DNS, and SSL Cutover | Configure domains, DNS, certificates, and secure routing | DevOps Engineer | 104.00 | 12 | 1,248.05 |
| Production Release Coordination | Coordinate controlled production releases and verification | DevOps Engineer | 104.00 | 16 | 1,664.07 |
| Post-Release Monitoring and Rollback Readiness | Monitor production stability and rollback readiness plans | DevOps Engineer | 104.00 | 10 | 1,040.04 |
| **Section Total** |  |  |  | **100** | **10,400.42** |

---

## Handover and Support

| Task | Description | Roles | Rate/HR | Time | Subtotal |
|---|---|---|---:|---:|---:|
| Admin and Team Training | Train administrators and key users on platform operations | Product Manager | 100.80 | 16 | 1,612.86 |
| Documentation and Runbook Authoring | Prepare operational documentation and support runbooks | Technical Writer | 100.80 | 24 | 2,419.30 |
| Architecture and Knowledge Transfer | Deliver technical architecture walkthrough and handover | Technical Lead | 100.80 | 16 | 1,612.86 |
| Post-Launch Support Window | Provide structured post-launch issue resolution support | Backend Developer | 100.80 | 20 | 2,016.08 |
| Hypercare Bug Fixes and Stabilization | Resolve early-production issues and stability improvements | Frontend Developer | 100.80 | 18 | 1,814.47 |
| Support Plan and Handover Closure | Formalize support model and close project handover | Product Manager | 100.80 | 16 | 1,612.86 |
| **Section Total** |  |  |  | **110** | **11,088.44** |

---

## Final Totals

| Metric | Value |
|---|---:|
| Scoping subtotal | 27,937.12 |
| UX & Design subtotal | 15,912.64 |
| Frontend subtotal | 56,210.25 |
| Backend subtotal | 57,794.30 |
| DevOps subtotal | 11,136.45 |
| QA and Testing subtotal | 9,520.38 |
| Deployment and Hosting subtotal | 10,400.42 |
| Handover and Support subtotal | 11,088.44 |
| **Total Hours** | **1,380** |
| **Total Project Value (ex GST)** | **200,000.00** |
| Optional GST (10%) | 20,000.00 |
| Optional Total (inc GST) | 220,000.00 |

## Assumptions and Exclusions

- This invoice is scoped to the delivery streams represented in the sections above.
- Any additional out-of-scope functionality should be billed as separate line items or a separate invoice.
- Third-party pass-through costs (platform subscriptions and transaction fees) are excluded unless listed separately.
