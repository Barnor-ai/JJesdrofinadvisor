# FinScope SaaS upgrade plan

## Goal and safeguards
Upgrade the existing FinScope incrementally—not rebuild it. Preserve its navy, gold and white appearance, dashboard, financial formulas, analysis features, original English reports, and PDF/Excel/Word downloads.

This plan authorizes staged implementation only after approval. Payment activation, live charges, destructive changes, backend migration, and assigning the first Super Administrator each require explicit confirmation. No customer data has been changed during this inspection.

## What the inspection established
- FinScope uses TanStack Start with React and Lovable Cloud for accounts, database and private file storage. Analysis, chat and agent integrations already exist.
- Hosted database checks confirm row-level security is enabled on the four application tables, owner-scoped policies exist, and authenticated access permissions are present. Both upload buckets are private. This is a good baseline, not proof of every cross-account access path.
- Subscriptions, payment records, application roles, usage controls, translation and PWA functionality are absent.
- Settings currently offers account security and a browser-driven reset, but does not distinguish administrators from ordinary users. Several reset errors are unchecked.
- The sidebar disappears on smaller screens without a replacement menu. Tables and report controls need mobile checks.
- PDF, Word and Excel have separate export paths; downloadable charts use existing analysis values. Translation must cover report text, tables and chart labels without changing their data.
- Netlify configuration already exists, but the current hosting setup and managed server credentials have not been verified on Netlify. A prior login hydration error appears in captured diagnostics and will be reproduced before any fix.

## Stage 1 — Secure foundation and deployment checkpoint
1. Reproduce the login issue and verify sign-up, sign-in, logout and existing upload/report flows before feature changes.
2. Strengthen ownership checks across statements, company links, analysis links, chat and agent tools. In particular, replace privileged statement downloads for ordinary users with owner-authorized downloads; prevent editable file paths or linked IDs from reaching another customer's documents.
3. Introduce protected Super Administrator, Administrator and Standard User roles. Ordinary users cannot assign roles. Only a confirmed account is bootstrapped as the first Super Administrator; no assumption from a page label, email or user-editable metadata.
4. Separate personal settings from role-protected administration. Hide the AI and Integrations entries without deleting underlying services or configurations.
5. Validate Netlify's server output, routing, sign-in redirects and required server capabilities before choosing the production architecture.

### Backend and Netlify decision gate
Changing frontend hosting does not migrate Lovable Cloud. Browser access to the existing accounts, database and storage can retain owner-based controls, but relocating server execution also needs working authentication, AI, agent and payment services.

**Preferred:** retain the existing Cloud data and accounts if a verified, supported deployment path can connect Netlify to those services securely. TanStack server functions are same-origin by default; they cannot simply be assumed to call a separate Cloud host.

**If portability is blocked:** present the specific missing capability and choose between retaining Cloud-hosted server execution with explicitly secured external endpoints, or migrating to a user-managed backend. Do not request inaccessible Cloud service-role keys or claim managed secrets transfer automatically.

A migration, if approved, requires a verified backup, schema/policy recreation, preserved user IDs and supported authentication transfer, private-file copy, report/chat/subscription reconciliation, controlled cutover, rollback and two-account isolation tests. If password hashes or provider credentials cannot be transferred through supported means, explain the recovery/relinking requirement before approval. No migration is currently proposed or performed merely because Netlify is requested.

## Stage 2 — Membership, configurable plans and usage
- Add Free, Professional and Business / Enterprise plans with administrator-controlled limits and feature access. Do not invent prices or usage numbers. Paid checkout stays unavailable until prices and required limits are configured.
- Show current plan, payment/subscription status, renewal date, access expiry, monthly used/remaining allowances and billing history on a subscription page.
- Free: limited analyses/report generation and essential features/basic downloads. Professional: higher allowances, full analysis, advanced/chart reports, translation, history and PDF. Business: higher/custom allowances, multiple companies, priority support and supported team/admin capabilities.
- Preserve existing saved data and report availability during transition. Define the existing-user rollout explicitly before switching on restrictions.
- Enforce entitlements on the server, not only hidden buttons. Atomically reserve analysis/report usage, prevent concurrent or repeated jobs from exceeding limits, and release/reconcile failed jobs under a documented policy. Reset must never restore spent monthly usage.
- Clarify and configure what counts as report generation versus re-downloading an existing report so users are not unexpectedly charged usage twice.
- For Business teams, add explicit invitations and company access membership without making independent customer data shared by default.

## Stage 3 — Verified subscriptions and payments
**Recommended provider: Paddle.** The built-in eligibility check accepts FinScope's B2B analysis software. Paddle's published supported-supplier-country policy does not exclude Ghana and its service supports SaaS subscriptions and international buyers. Seller acceptance and payout arrangements still require onboarding approval; Ghana interest is not treated as a confirmed business registration country.

- Confirm the registered seller country and required payment methods before activation. Ghana mobile-money support has not been established for Paddle; do not promise it.
- After separate confirmation, enable a test environment with no real-money charges. Built-in payments requires Pro or higher. Paddle live payments require verification.
- Paddle's published fee is 5% + 50¢ per checkout transaction; subscription prices remain yours to configure.
- Implement checkout, billing/customer portal actions, upgrades/downgrades, cancellations, renewals and verified billing history only after actual products/prices exist.
- Signed webhooks and trusted server confirmation update entitlements. Store event IDs for idempotency; handle renewal failure, cancellation, refunds and delayed/out-of-order events. Returning to a success page never grants paid access.
- Preserve existing entitlements until the verified effective date when downgrading/cancelling. Show real renewal/expiry dates and payment states, not placeholders.

References: [Paddle country policy](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle), [subscription support](https://www.paddle.com/help/start/intro-to-paddle/does-paddle-support-subscription-based-sales-models), [pricing](https://www.paddle.com/pricing).

## Stage 4 — Account protection and administration
- **Change Password:** Current Password, New Password, Confirm New Password and Save Changes. Reverify the current password for password accounts; apply secure hosted-provider-compatible requirements and matching confirmation. Explain provider-managed passwords for social sign-in accounts. Add forgotten-password request and a public recovery completion flow with permitted same-origin redirects.
- **Inactivity protection:** administrator-configurable, initially 15 minutes, with a warning shortly before expiry and Continue Session. Coordinate actual activity across tabs and mobile; recheck elapsed time when a background tab resumes. Enforce expiry/suspension on protected server operations and applicable direct data access paths—not just a browser timer. Routine polling/token refresh must not count as human activity. Clear sensitive local data on logout, retain statements/reports and return to sign-in.
- **Reset information uploaded to zero:** explicit confirmation explaining exactly what is removed. Only authorized administrators can invoke it, initially scoped to their own workspace rather than a global wipe. Check all errors, clean nested/paginated uploads, and report partial cleanup honestly. Preserve accounts, subscriptions, configuration, chat and previously downloaded reports. Cloud-saved report snapshots must be separated from resettable analyses before promising their preservation.
- Admin views show registered users, plans, subscription/payment states, expiry dates, usage and permitted suspension/reactivation actions. Audit role changes, plan configuration and account actions. Administrators never see passwords or payment card details; only Super Administrators manage privileged role assignments.

## Stage 5 — Complete report translation
- Add **Translate Report** and language selection for English, French, Spanish, Portuguese and German, designed for additional languages later.
- Translate every narrative section, profitability explanations, recommendations, investor commentary, table headings, chart titles/legends/labels and ratio interpretations.
- Translate a presentation-only text layer keyed to the source report/version. Keep numerical fields immutable and protect numerical/date/currency/company-name tokens embedded in prose. Preserve formula/computation values and original accounting meaning; do not recalculate ratios.
- Validate returned translations against an allowlisted structure and reject missing sections or altered protected values. Always retain the English source and display the selected language plus an AI-assisted review notice.
- Produce translated PDFs with appropriate fonts, long-label wrapping and pagination. Keep existing Excel/Word exports working and the existing report structure intact.
- Enforce the configured translation entitlement and cache authorized translations by source version/language to avoid unnecessary repeated requests.

## Stage 6 — Mobile and secure installable/offline experience
- Add touch-friendly mobile navigation while preserving desktop navigation order/design. Check every dashboard, form, chart, table, report and settings screen on desktop, tablet, Android-size and iPhone-size viewports.
- Add installable manifest, icons and service worker for public application assets, an offline screen, connection status and safe preference storage.
- Do not indiscriminately cache signed document URLs, authenticated APIs, tokens, payment information or financial responses in service-worker caches.
- Start offline support with the public shell and user-approved saved report/history access. Any sensitive local copy requires explicit opt-in, per-user protection/unlock, expiry and complete cleanup on logout/account switch. If that security cannot be validated, keep financial content online-only and explain the limitation instead of claiming secure offline access.
- Permit supported draft preparation offline; do not start analyses or payments offline or show invented completion states. Synchronize confirmed supported operations only after re-authentication, using persistent operation IDs to prevent duplicate submissions. Clear queued sensitive work on logout.
- Previously downloaded reports remain available through the device's files. Online analysis, chat, translation, billing and account changes require an internet connection.

## Technical implementation
Use small modules for roles/session enforcement, subscriptions/usage, payments, translation presentation and PWA support. Keep TanStack routing/server boundaries and existing report-chart architecture. Additive schema changes use explicit grants, row-level security, protected role tables and audited server-side writes; never seed payments or privileged roles from browser code. Record structural decisions in project architecture guidance.

## Verification and release gates
For each stage, run focused rule tests and exercise the real interface. Before release verify:
- Registration, sign-in/out, password change and recovery with hosted auth settings checked.
- Two-account isolation for rows, linked IDs, statements, reports, chat and agent tools.
- Exact configured quotas, concurrent submissions, premium restrictions and reset not clearing usage.
- Real test-provider checkout and signature verification; duplicate/delayed webhook handling, renewals, cancellations and failed payments.
- Complete translation, unchanged numbers/formulas/dates/company names and downloadable translated PDFs.
- Mobile navigation, no page overflow/overlap, PWA installability, offline restrictions, queued-work deduplication and local cleanup.
- Warning/continue/expiry across tabs, background timers, mobile and server-rejected expired sessions.
- Role boundaries, account suspension and scoped reset with preserved unrelated records.
- GitHub connection/synchronization and an actual Netlify deployment with configured redirects and server services. These are not established by local source inspection.

**Pending confirmations:** first Super Administrator identity, seller registration country/payment methods, administrator-entered prices/limits, and the verified Netlify/backend path. These block only the affected stages; no privileges, prices, migration or payment activation will be guessed.