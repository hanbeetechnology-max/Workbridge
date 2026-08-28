# WorkBridge — Technical Roadmap

**Status: real backend migration complete, plus chat, job marketplace, and
rich profiles all since built for real.** `PlatformContext` (in-memory
`useState` mock data) has been fully removed. Every dashboard now runs
against the real Node.js/PostgreSQL backend in `backend/`:

- **Auth**: JWT-based, `AuthContext` (`src/app/context/AuthContext.jsx`) —
  real register/login/`/me`, token persisted in `localStorage`, route
  guarding by role in `App.jsx`.
- **Projects**: the full lifecycle (`OPEN → INVITED → ACCEPTED →
  FUNDS_SECURED → WORK_IN_PROGRESS → FILES_SUBMITTED → COMPLETED`) is real,
  backed by `GET/POST /api/projects`, `PATCH /api/projects/:id`,
  `POST /api/projects/:id/secure-funds`, `POST /api/projects/:id/complete`.
- **Wallet**: real balance + ledger (`GET /api/wallet`,
  `POST /api/wallet/withdraw`).
- **Reviews**: real (`POST /api/reviews`, `GET /api/reviews?revieweeId=`).
- **Profiles**: real browse/self-edit (`GET /api/profiles?role=`,
  `PATCH /api/profiles/me`), including education/certifications/portfolio
  projects (folded into `users.profile` JSONB) and a shareable public
  profile page (`/profiles/:id`) with an editable cover photo and a native
  Share button.
- **Chat/messaging**: real, persisted (`messages` table) — one continuous
  thread per project spanning invite through completion. Attachments reuse
  the Trust Checker moderation queue (submissions); a contact-info filter
  hard-blocks phone numbers/emails in message text. See
  `Frontend/src/app/components/shared/ChatThread.jsx`.
- **Open job marketplace**: real. A project can start life `OPEN`
  (unassigned, `worker_id` null) and go live on the worker's real Job Feed;
  workers apply, a business can also invite a specific worker to an
  already-open post directly (`job_candidates` table, `source`
  APPLICATION|INVITE). Accepting one candidacy assigns the project and
  closes every sibling candidacy automatically. Business-initiated
  match-and-invite (skip the public board, hire someone privately) still
  works exactly as before, unchanged.

## Deliberately deferred (not a gap to "fix" — a scoped-out phase)

- **Real payment gateway** (Cashfree/Stripe/UPI) — `secure-funds` and
  `complete` remain internal-ledger-only; no external money actually moves
  yet. This is the only item left on this list — the next major phase once
  a gateway is chosen. Blocked on the user deciding a provider, not on code.
- **Admin panel**: `AdminTeamTab.jsx`/`AdminSecurityTab.jsx` still on mock
  data — every other admin tab (Verifications, Disputes, Content Review,
  Invitations, Transactions) is real.

OTP delivery via Resend (previously listed here as blocked on domain
verification through Hostinger DNS) is done — domain verified, real emails
send from the verified address, tested end to end.
