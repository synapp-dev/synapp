# Administrator User Guide

> Handover documentation for Bullyproof Australia (deliverable D6), version 1.1. This guide covers day-to-day administration of the Bullyproof platform. A companion System Administrator Guide covers hosting, configuration, and technical operations. Version 1.1 clarifies section 8: feature access is presented for oversight, with configuration managed at the platform engineering level.

## 1. Introduction

### 1.1 What Bullyproof is

Bullyproof is a web platform that delivers the Bullyproof anti-bullying program to Australian schools. It gives schools a curriculum of ready-to-teach lessons, an accreditation program for teachers (the AMAYDA Program, also called AP Certification), culture rating analytics, resource libraries, and reporting. Schools are the tenants of the platform: each school has its own users, classes, lessons, licence, and settings.

As a platform administrator you manage everything that sits above the individual schools: creating school accounts, adding users, maintaining curriculum and certification content, controlling which features each school can use, entering culture rating data, and producing reports.

### 1.2 Who this guide is for

This guide is written for the Bullyproof Australia administration team. It assumes you can use a web browser and email but does not assume any technical background. Wherever the guide names a screen, it also gives the address (URL path) so you can navigate directly. Sections 2 to 4 cover signing in, access levels, and navigation; sections 5 to 14 walk through each administration area, the teacher-facing AP Certification experience, and support.

## 2. Signing in

Bullyproof uses email codes rather than passwords as the standard sign-in method.

1. Open the platform in your browser and you will land on the sign-in page.
2. Enter your email address and continue. The platform emails you a 6 digit verification code. You will see the message "Code Sent: We've sent a verification code to your email. Please check your inbox!"
3. Enter the code on the sign-in screen. You are signed in and taken to your dashboard.


Points to note:

- Codes are valid for 1 hour. If a code expires, request a new one from the sign-in screen.
- Once signed in, your session persists in the background; in practice you stay signed in until you sign out.
- To sign out, use your account menu in the sidebar footer, or visit the /logout page.
- Code requests are rate limited, so after several requests in a short period you may need to wait before trying again.
- A password sign-in mode exists for accounts with a password set, but the emailed code is the standard method.

There is no self-service sign-up. Accounts are created by an administrator (section 6), after which the person can sign in with their email address straight away. No invitation email is sent, so let new users know to go to the site and request a code.

## 3. Roles and access levels

The platform calls roles "Access Levels" in the interface. Every user holds one or more access levels, and these control which parts of the platform they can see.

### 3.1 Platform access levels

Platform access levels apply across the whole platform and are not tied to any school.

| Access level | Internal key | What it is for |
|---|---|---|
| Platform Admin | PLATFORM_ADMIN | Full Bullyproof administration: schools, users, content, features, reports |
| Platform Staff | PLATFORM_STAFF | Bullyproof staff access to the admin area with a narrower set of permissions |
| Government Viewer | GOVERNMENT_VIEWER | View-only aggregate reporting for government stakeholders (section 12) |

A developer access level (Intradark Dev) also exists for the technical team; some destructive actions such as deleting users and schools are restricted to it by default.

### 3.2 School access levels

School access levels are tied to a specific school. A user can belong to more than one school.

| Access level | Internal key | What it is for |
|---|---|---|
| Staff | SCHOOL_STAFF | Basic school access. Automatically included for every user assigned to a school |
| School Admin | SCHOOL_ADMIN | Full school management: teachers, classes, settings for their school |
| AP Teacher | TEACHER | Teach and manage lessons; take the AP Certification course |
| School Licence | SCHOOL_LICENCE | The school's licence account, tied to the main school email. It cannot hold any other access level |

Two rules to remember:

- A user with a platform access level cannot also hold school access levels, and vice versa.
- Every user assigned to a school always has Staff as a minimum; the interface adds it automatically.

On top of access levels, the platform has a fine-grained feature permission system that can switch individual features on or off globally, per access level, per school, or per user. The system is configured at the platform engineering level; section 8 explains how it works, how to view what each school can access, and how to activate schools with permission templates.

## 4. Finding your way around

The left sidebar is the main navigation. What you see depends on your access level and feature permissions; items you do not have access to are hidden.

- Platform section: Admin, AP Certification, Dashboard, Support (and a Welcome tour if enabled).
- School section (when a school is selected in the school switcher): Home, Teachers, Classes.
- Curriculum section: Teach Lessons, Preview Lessons, Resources.
- Data section: Performance, Reports, Settings.

As a platform administrator you can open any school through Admin > Schools, or switch into a school context with the school switcher at the top of the sidebar.

Platform administrators also have a quick-navigation command menu: press Ctrl+K (Cmd+K on Mac) or click the search button in the header to jump straight to any admin area. School users do not see this menu.

The Admin entry takes you to the admin home at /admin, a grid of cards, one per administration area:

| Card | Address | Purpose |
|---|---|---|
| Content | /admin/content | Curriculum and certification content |
| Schools | /admin/schools | School accounts |
| Users | /admin/users | User accounts and access levels |
| Features | /admin/features | Feature access control console (platform engineering level; day-to-day school activation is on each school's Activation tab) |
| Resources | /admin/resources | Folder-based resource documents |
| Reports | /admin/reports | Platform reporting dashboards |
| Ratings | /admin/ratings | Teacher lesson ratings by curriculum stage |
| Culture Ratings | /admin/culture-ratings | Culture rating data entry and reports |
| Audit Logs | /admin/audit-logs | Activity review (workspace prepared, tooling to come) |
| Support Tools | /admin/support-tools | Internal support workspace (prepared, tooling to come) |
| Tickets | /admin/tickets | User feedback tickets |
| Migrations | /admin/migrations | One-off database maintenance jobs (technical team only) |


## 5. Managing schools

Open Admin > Schools (/admin/schools).

### 5.1 The schools list

The schools table shows Status, School Name, School Level, State, Sector, and counts of Staff, Teachers, Admins, and Licences. You can:

- Search by name ("Search schools...").
- Filter by State (NSW, VIC, QLD, SA, WA, TAS, NT, ACT), Sector (Government, Catholic, Independent), and Status (Active, Pending, Inactive).
- Click a school name to open its detail drawer.

### 5.2 Creating a school

Click the add button to open the "Add New School" dialog and complete the four fields:

1. School Name.
2. Level: Primary, Secondary, or the combined options P-10 and P-12.
3. State: the Australian state or territory.
4. Sector: Government, Catholic, or Independent.

All four fields are required before the "Add School" button becomes available. The new school then appears in the list, ready for onboarding.


### 5.3 The school detail drawer

Clicking a school opens a drawer with a tab per management area:

| Tab | What it does |
|---|---|
| Onboarding | Setup checklist for getting the school live (section 5.4) |
| Activation | Apply permission templates to unlock features for the school (section 5.6) |
| Details | School details: address, email domain, banner and avatar images |
| Users | The school's users: view, add, and manage their school access levels |
| Classes | The school's classes (year level and name) |
| Activity | Activity feed (currently disabled) |
| Culture | The school's culture rating data (same data as section 9) |
| License | The school's licence (section 5.5) |
| Feature Access | Read-only view of the school's feature access (editing is a platform engineering function) |

### 5.4 The onboarding checklist

The Onboarding tab tracks what a new school still needs. Essential steps:

1. Add School Licence: an active licence exists.
2. Add School Admin: at least one School Admin user.
3. Add Staff and AP Teachers: at least one teacher or staff member.
4. Add Classes: at least one class.

Optional steps: Add Email Domain, Add Address, Add Banner, Add Avatar. Each item shows a green "Completed" badge once done, so you can see a school's readiness at a glance.


### 5.5 Licences

On the License tab, click through to the "Add School Licence" dialog:

- Duration: 1 Year through 5 Years.
- Main School Email: the email address the licence is tied to. This address becomes the School Licence account and cannot hold any other access level. If the school already has a licence email on record, the field is locked to it.

An active licence shows as a card with an ACTIVE badge (or PENDING while being set up), the licence email, start date, expiry date, and duration. Behind the scenes a licence can be in one of these states: Draft, Pending, Active, Suspended, Expired, or Cancelled. The reporting screens count a school as licensed when its licence is ACTIVE.

### 5.6 Activation: unlocking features for a school

The Activation tab lists the available permission templates as cards. A template is a saved bundle of feature permissions (section 8.3). Each card shows the template name, description, rule count, and a status badge: "Template active" when the template already matches the school's current permissions, otherwise "Not active". Click "Apply template" (or "Re-apply template") and confirm. This is the normal way to activate a school once onboarding is complete: applying the standard school template unlocks the school-facing features in one step.

### 5.7 Deleting a school

A Delete option exists in the drawer but is restricted by the "Delete School" feature permission, which by default is limited to the developer access level. Treat school deletion as a technical-team action.

## 6. Managing users

Open Admin > Users (/admin/users).

### 6.1 The users list

The table shows each user's name and email, their Access Levels as coloured badges, and the date created. You can search by name or email, filter by Access Level, filter by School, and clear all filters with one button. Rows can be multi-selected; bulk delete is available (restricted), and bulk email is present but currently disabled.

### 6.2 Adding a user

Click the add button to start the four step wizard: Details, User Type, Access Level, Confirm.

1. Details: enter Email, First Name, Last Name. If the email already belongs to an account, the names prefill and you will see "Existing user: Profile details are prefilled. Continue to assign a role or school." This lets you give an existing user an additional school or access level instead of creating a duplicate.
2. User Type: choose one of three:
   - Bullyproof: platform admin or staff.
   - Government: government viewer.
   - School Member: school admin, teacher, or staff.
3. Access Level:
   - For a School Member, first pick the school (searchable list), then tick the access levels: Staff is always included automatically; add School Admin and/or AP Teacher as needed.
   - For Bullyproof or Government users, pick the single platform access level.
4. Confirm: review the name, email, access level badge, and school, then click "Create User".


The account is created immediately. Remember there is no invitation email: tell the person to go to the platform and sign in with their email address (section 2).

### 6.3 The user detail drawer

Click any user to open their drawer. The side tabs are:

| Tab | What it shows |
|---|---|
| Details | Name, email, and profile details |
| Access Levels | The user's platform or school access levels, with actions to change them |
| Positions | Positions held at their schools |
| Classes | Classes they are linked to |
| History | Account history |
| Feature Access | Per-user feature permission overrides (platform engineering level) |

From the Access Levels tab you can:

- Add or edit a school assignment. The dialog lets you pick the school and tick roles (Staff auto-included, School Admin, AP Teacher).
- Remove the user from a school entirely. You will be asked to confirm: "This user will be completely removed from the school. They will no longer have any access to this school. The user will remain in the database. Continue?"
- Change a platform user's role with the "Change Platform Role" dialog (choose between Platform Admin, Platform Staff, and Government Viewer, then "Swap Role").

A "Delete user" button exists at the bottom of the drawer but is feature-restricted (developer access level by default). Prefer removing a user from their school, which keeps the account but removes access.

## 7. Content management

Open Admin > Content (/admin/content). The page splits into two areas: Curriculum (the lesson content schools teach) and Certification (the AP course content teachers study).

### 7.1 Curriculum: stages, topics, and slides

The curriculum is organised as Stages > Topics > Slides:

- A Stage is a curriculum band (for example a primary or junior secondary band) linked to school year levels. The year levels on a stage drive which topics are recommended to which classes.
- A Topic is a unit of teaching content within a stage.
- Slides are the content of a topic. Slides can be text, image, or video.

At /admin/content/curriculum you can add a stage ("Add new stage": Code, Name, and the applicable Year Levels) and click into a stage to manage its topics. Within a stage:

- "Add new topic" creates a topic with a Title and optional Official Notes.
- Each topic card shows a thumbnail, its slide counts by type, and edit and delete controls.
- Topics and slides can be reordered by dragging; the new order saves automatically.

Opening a topic's slides lets you add, edit, delete, and reorder individual slides, including uploading slide images. What you publish here is exactly what teachers see when previewing and delivering lessons.


### 7.2 Certification content: courses, topics, and quizzes

At /admin/content/certification you manage the accreditation content, structured as Courses > Course Topics > Slides and Quizzes. The main course is the AMAYDA Program.

- Add a course with a Code (used in the web address), Name, and Sort Index.
- Inside a course, the sidebar offers Information (course settings), Topics (the main editor), Ratings, and Results.
- Topics work like curriculum topics: title, official notes, slides, drag to reorder. A topic can additionally have a Quiz, shown as a "Quiz" badge on the topic card.
- Quiz settings include the Passing Score Percentage (70 percent unless changed), optional time limits, and attempt limits. Questions can be single choice, multiple choice, or true or false, each with its answer options and an optional explanation.

Changes here directly affect the course teachers are working through, so take care when editing a live course: reordering topics or changing quizzes changes what learners see next.

## 8. Feature permissions and permission templates

Feature permissions determine what every user can see and do. As a Bullyproof administrator you work with them in two ways: viewing each school's feature access from the school drawer, and activating schools by applying permission templates. The configuration console itself (Admin > Features, titled "Feature Access Control") sits at the platform engineering level.

### 8.1 How permissions work

Every feature in the platform (a page, an action, or a system behaviour) has a key, for example "/admin/schools" or "school:create-lesson". For each feature you can set two switches:

- Access: whether the feature actually works for the person.
- Visible: whether the feature's button or menu entry is shown. A feature can be visible but locked (people see it greyed out), or hidden entirely. Turning Access on turns Visible on as well.

Permissions can be set at five levels, and the most specific level wins:

1. User (overrides everything)
2. School Role (a role within one school)
3. School
4. Role (a platform or school access level, platform-wide)
5. Global (the default for everyone)

If nothing is set at any level, the feature is off: the platform is deny-by-default.

### 8.2 Viewing feature access

Each school's drawer has a Feature Access tab (Admin > Schools > open a school > Feature Access). It shows, at a glance, what the school can currently use ("Available to this school") and anything shown to its users but locked ("Visible but locked"). The view is read-only for administrators: changes to feature permissions, the creation of new feature entries, and configuration at the global, access-level or per-user layers are platform engineering functions. If a school's feature access needs to change beyond what a template provides, raise it with the platform team.

### 8.3 Permission templates

Setting dozens of switches per school would be tedious, so the platform ships with Permission Templates: pre-built bundles of Access and Visible settings (for example the standard school activation bundle, certification-only, and locked states). Templates are built and maintained at the platform engineering level; as a Bullyproof administrator you select and apply them rather than author them.

You work with templates on each school's Activation tab (section 5.6):

- The tab lists the available templates as cards with name, description and rule count.
- A green "Template active" badge shows when the school's current permissions already match that template; otherwise the card reads "Not active".
- Click "Apply template" (or "Re-apply template" on an already-active card) and confirm. The card turns green once applied.


The everyday workflow is: onboard the school (section 5.4), then apply the standard school template from the Activation tab, and use the Feature Access view (section 8.2) to confirm the result. If a one-off adjustment, a new template or a change to an existing bundle is needed, raise it with the platform team.

## 9. Culture ratings

Open Admin > Culture Ratings (/admin/culture-ratings). This is where you enter the school data behind the Bullyproof culture rating, following the AP Culture Rating template.

Start by choosing the school in the "Search or select a school..." box. The page then shows three tabs: Benchmark, Comparative periods, and Trends.

### 9.1 The eight inputs

Both the benchmark and every comparative period capture a date range (Period start, Period end) and the same eight numbers:

| # | Input |
|---|---|
| 1 | School days in period |
| 2 | Attendance (FTE student-days attended) |
| 3 | Absences (FTE student-days absent) |
| 4 | Minor behaviour incidents |
| 5 | Major behaviour incidents |
| 6 | Short suspensions (1-10 days) |
| 7 | Long suspensions (11-20 days) |
| 8 | Exclusions |

There is also an optional "Source notes" field, useful for recording where the school's figures came from (for example "received from school via email").

### 9.2 Benchmark and comparative periods

- Benchmark: each school has exactly one benchmark period, entered on the Benchmark tab and saved with "Save benchmark". This is the school's starting point, typically the period before the Bullyproof program began.
- Comparative periods: later periods you compare against the benchmark. Add them on the Comparative periods tab; a comparative period must fall entirely outside the benchmark date range (no overlapping days). Existing periods are listed in a table with their dates, Culture %, report status, and actions to Edit, Request report, upload a PDF, Download, or delete.


### 9.3 How the headline rating works

The platform does all the calculation. For each comparative period it derives four rates and compares them to the benchmark:

- Attendance rate (higher is better)
- Behaviour incidents per student-day (lower is better)
- Suspensions per student-day (lower is better)
- Exclusions per student-day (lower is better)

Each of the four is turned into a percentage improvement versus the benchmark, then combined into the headline Culture % using the currently configured weighting: attendance 47 percent, behaviour 16.5 percent, suspensions 16.5 percent, exclusions 20 percent. (The weighting is applied platform-wide and can be updated centrally if the agreed mapping changes.) If a school cannot supply one of the inputs (for example it records no exclusions data), that component's weight is redistributed proportionally across the components that are available, so the headline still works with any subset of the inputs.

The Trends tab charts the four improvement lines and the culture rating across all comparative periods, so you can see the school's trajectory over time.

### 9.4 Culture reports

Each comparative period row carries a report status. The flow is:

1. Click "Request report" on the period once its data is complete.
2. When the written report has been produced, upload the finished PDF against the period using the PDF upload action.
3. Once uploaded, the status shows completed and a "Download" button appears, for you and for the school.

School users see their culture results within their school's Performance area rather than this admin screen.

## 10. Reports

Open Admin > Reports (/admin/reports). The Reports section has four tabs: Overview, Certification, Onboarding, and Lessons.

### 10.1 School scope filter

At the top of the section a scope selector lets you switch between "All schools" (platform-wide figures) and any single school. The choice applies to every tab and is carried in the page address, so you can bookmark or share a scoped view.

### 10.2 The tabs

- Overview: headline cards for Schools (total school accounts), Active licences (schools with an ACTIVE licence), Lessons (lesson records), Lesson ratings (feedback submissions), and AMAYDA complete (users who finished the AMAYDA Program). A "Go deeper" row links to the other three tabs.
- Certification: AMAYDA completion for the scope. For per-user progress, open the individual school under Admin > Schools.
- Onboarding: school readiness: accounts and licences, plus (in all-schools scope) the "Active schools with no lessons yet" table listing schools with an active licence but no lessons, with days since licence start, class and teacher counts, and their activation status (Active, Certification, or Locked, based on the school's activation status).
- Lessons: lesson and rating totals plus a table of all lessons in scope, newest first, with the topic, classes, teacher, school, status, and date.


### 10.3 Exporting

Every tab can be exported with the Export button at the top right, which offers "Export as CSV" and "Export as PDF". The export reflects the current tab and scope, and the file name and title record the scope, for example "Bullyproof Reports - Overview (All schools)". CSV files open in Excel; PDFs are formatted for sharing.

## 11. Lesson ratings

Open Admin > Ratings (/admin/ratings) to review the star ratings teachers leave after delivering lessons. The page shows an Overall card (total reviews and average rating) and one card per curriculum stage with its year levels, review count, and average out of 5. Click a stage to drill into its ratings.

## 12. Government access

Users with the Government Viewer access level see a dedicated, view-only dashboard when they sign in (their Dashboard entry in the sidebar). It is titled "Government Reporting" and described on screen as a "View-only summary of the Bullyproof programme across participating schools. Figures are platform-wide aggregates."

It shows five aggregate figures: Participating schools, Active schools, Lessons delivered, Lesson ratings, and AP certifications. There is no per-school drill-down and nothing can be edited, but the view can be exported as CSV or PDF with the same Export button as the admin reports. Create government users through the normal add-user wizard by choosing the Government user type (section 6.2).

## 13. AP Certification (the AMAYDA Program)

This section describes what your AP Teachers experience, so you can support them, plus where you monitor their progress.

### 13.1 The course flow

Teachers open AP Certification in the sidebar (the /courses area) and land on the AMAYDA Program page, greeted with "Welcome to the AMAYDA Program". The page shows:

- A card for their current topic with its slide count, a "Quiz" badge if the topic has one, and an action button that adapts to where they are: "Begin", "Continue Topic", "Take Quiz", "Retake Quiz", or "Review slides".
- A My Progress bar with one segment per topic and a certificate marker at the end. Topics unlock in order: a teacher must complete the current topic before the next opens.
- A topic timeline listing every topic with its status (completed, current, or locked), quiz score shown as stars, and buttons to review slides or retake quizzes.


### 13.2 Quizzes

A topic's quiz unlocks once its slides have been viewed. Quizzes show one question at a time with a progress bar, support single choice, multiple choice, and true or false questions, and save each answer as it is given, so a teacher can leave and resume an attempt. On submission they see "Quiz Passed!" or "Quiz Failed" with their score out of the total and the passing score (70 percent unless changed per quiz). Failed quizzes can be retaken.

### 13.3 The certificate

When every topic (and quiz) in the course is complete, the certificate appears in place of the current-topic card. It shows the completion date, the teacher's name, the line "Has successfully completed the Amayda Program", and an "AP Certified" badge. The View button opens the certificate PDF in the browser; the Download button saves it. The certificate is formally issued the first time it is viewed or downloaded. The same certificate card, with the same View and Download buttons, appears on the teacher's dashboard once certification is complete.

Certificates also appear on the teacher's Profile page under Certificates, each with its completion date and its own View and Download buttons, so a teacher can revisit them at any time. The Profile page is reachable from the account menu in the sidebar footer (Profile).

### 13.4 Monitoring completion

- Platform-wide or per-school totals: Admin > Reports > Certification (section 10).
- Per-teacher progress at a school: open the school under Admin > Schools. School Admins with the certification permission can also see their teachers' AMAYDA progress in their own school settings.

## 14. Support and feedback

### 14.1 Getting help

The Support entry in the sidebar (and the /support page) shows a "Need Help?" card with an "Email Support" button. It opens a pre-addressed email to support@bullyproofaustralia.org.au. Encourage school users to use this button rather than personal email addresses, so requests arrive in one place.

### 14.2 Feedback tickets

Users can submit feedback from within the platform. Review it at Admin > Tickets (/admin/tickets): each ticket has a type (Bug, Feature, Question, Feedback), a status you can update (Open, In Progress, Resolved, Closed), the page it was submitted from, an optional screenshot, and internal notes for your team.

### 14.3 Sections still in development

Two admin areas are prepared but not yet populated with tooling: Audit Logs ("Review platform activity and investigate operational changes") and Support Tools. Both open to a placeholder workspace today. The Migrations card runs one-off database maintenance jobs and should be left to the technical team.
