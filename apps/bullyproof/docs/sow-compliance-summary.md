# Bullyproof SOW Compliance Summary

This document compares the Bullyproof Statement of Work (SOW) requirements against the current implementation. It identifies what has been delivered and what major gaps remain.

---

## Implemented and Aligned

1. **Authentication – OTP via email**
   - Supabase `signInWithOtp` for email OTP.
   - Auth UI uses InputOTP for verification.

2. **Role-based access**
   - PLATFORM_ADMIN, PLATFORM_STAFF, SCHOOL_ADMIN, SCHOOL_LICENCE, TEACHER, GOVERNMENT_VIEWER.

3. **Learning Management System (LMS)**
   - Certification courses with sequential lessons.
   - Quiz system (AP/certification topics).
   - Topic/certificate generation (`TopicCertificate`) on course completion.

4. **Classroom delivery**
   - Slide-based lessons.
   - Default Bullyproof notes and teacher-specific notes (schema, `v_lesson_slides_effective`).
   - Prepare/preview flow (`/schools/[school_id]/lessons/[lesson_id]/prepare`).
   - Lesson feedback/ratings (1–5 via `LessonFeedbackForm`, `lesson_feedback` table).

5. **Admin panels**
   - Bullyproof Admin (schools, users, content, features, tickets).
   - School Admin (school-level management under `/schools/[school_id]/`).

6. **School licence accounts**
   - SCHOOL_LICENCE role and `school_licences` management in the school detail drawer.

7. **User invites**
   - `school_invites` for teacher/school-user invites via `/api/invites`.
   - `invitesService.createInvite` creates invites and uses Supabase `inviteUserByEmail` for magic links.

---

## Major Gaps

### 1. OTP expiry (ST4S compliance)

- **SOW:** ~60 days.
- **Implementation:** `otp_expiry = 3600` in `supabase/config.toml` (~1 hour).

### 2. School invitation flow

- **SOW:** Invitations issued through the platform to school licence accounts (e.g. info@school.edu.au).
- **Implementation:** `InviteNewSchoolDialog` POSTs to `/api/schools/invite`, which:
  - Only logs the payload.
  - Does not create a school.
  - Does not create a licence or licence account.
  - Does not send any email.
  - Does not return `{ id: string }` (returns `{ ok: true, received: body }`).

### 3. Government stakeholder dashboard

- **SOW:** Government stakeholders receive transparent reporting; dedicated view-only dashboards.
- **Implementation:** GOVERNMENT_VIEWER role exists, but:
  - `dashboard/page.tsx` shows Admin, Teacher, Staff dashboards only.
  - No government-specific dashboard; Government users see "No dashboard available".

### 4. Reporting module – CSV/PDF export

- **SOW:** CSV/PDF export for all reporting roles (teachers, school admins, Bullyproof, government).
- **Implementation:** School reports page redirects to home and shows mock UI; no real CSV/PDF export.

### 5. Culture rating framework

- **SOW:** Initial culture rating system; data entry and tracking.
- **Implementation:** Culture ratings page is a placeholder (`AdminCultureRatingsPage`). Dummy data and cards exist, but no:
  - Data entry UI.
  - Tracking logic.
  - Integration with real culture data.

### 6. Mobile slide control

- **SOW:** Mobile slide control for teachers.
- **Implementation:** `/run-lesson/controls` and `/deliver/controls` exist, but control mode UI is disabled in `run-lesson/page.tsx` and `deliver/page.tsx` (e.g. "control mode disabled" in comments).

### 7. Certificate in profile

- **SOW:** Certificates accessible from user profiles.
- **Implementation:** Profile page is a static template (e.g. "John Doe"); no real user data or certificates displayed.

### 8. Twilio templated emails

- **SOW:** Templated email delivery (onboarding, OTPs) via Twilio.
- **Implementation:** Supabase handles OTP/invites; Twilio is configured for SMS only. No Twilio-based templated email for onboarding/OTP.

### 9. Documentation and handover

- **SOW:** Platform usage guide and technical documentation for Bullyproof admins.
- **Implementation:** `docs/` has lesson-creation flow only; no platform usage guide or technical admin documentation.

---

## Summary of Missing Items

| Priority | Item |
|----------|------|
| High | School invite flow that actually creates schools, licences, and sends invites |
| High | Government stakeholder dashboard |
| High | CSV/PDF report export |
| High | Culture rating data entry and tracking |
| Medium | OTP expiry set to ~60 days (ST4S) |
| Medium | Mobile slide control enabled |
| Medium | Certificate display in profile |
| Medium | Twilio templated email integration |
| Medium | Platform usage and technical documentation |
