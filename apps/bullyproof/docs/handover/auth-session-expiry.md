# Authentication expiry position (ST4S / SOW "~60 days")

> Feeds the System Administrator Guide. Last reviewed: 6 July 2026.

## The requirement

SOW 5.1.1 / 7.1.3 describe an "~60 day" OTP expiry in the context of ST4S-aligned
authentication for school staff. Read literally as the *code* lifetime this is
neither possible (Supabase caps email OTP validity at 24 hours) nor desirable
(a sign-in code is a credential; long-lived codes weaken security and would
work against ST4S, not toward it).

## The implementation

The requirement's intent, teachers should not be forced to re-authenticate
constantly, is met by session persistence:

| Setting | Value | Effect |
|---------|-------|--------|
| `otp_expiry` | 3600 s (1 h) | Sign-in codes are short-lived (security) |
| `jwt_expiry` | 3600 s (1 h) | Access tokens rotate hourly, transparently |
| `enable_refresh_token_rotation` | true | Each refresh issues a new token |
| `[auth.sessions] timebox` | not set | Sessions never hard-expire |
| `[auth.sessions] inactivity_timeout` | not set | Sessions survive any idle period |

With no timebox or inactivity timeout, a signed-in user's session persists
indefinitely, comfortably exceeding 60 days, refreshed automatically in the
background whenever they use the platform. Signing out, changing password, or
an administrator revoking sessions ends access immediately.

## Where this is configured

- Local development: `apps/bullyproof/supabase/config.toml` (`[auth]` and
  `[auth.sessions]` sections).
- Production: Supabase Dashboard -> Authentication -> Sessions. Confirm both
  "Time-box user sessions" and "Inactivity timeout" remain disabled, and email
  OTP expiry remains 3600 seconds.

## If a hard 60-day session cap is ever preferred

Set `timebox = "1440h"` (60 days) under `[auth.sessions]` locally and mirror it
in the hosted dashboard. This forces re-login every 60 days regardless of
activity.
