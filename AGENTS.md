# Architecture rules
- Downloaded report charts use a presentation-only model built from existing analysis fields, rendered to embedded PNGs for PDF, Word and Excel; this keeps documents portable without changing financial calculations or dashboard components.
- Keep report colors as global CSS tokens and keep chart rendering browser-only with dynamic imports; exports must remain safe to import during SSR.
- Content routes use a shared metadata helper with distinct titles and descriptions so social previews describe the actual page without altering its visible interface.
- SaaS membership, role and reset operations use authenticated server functions with database role/session validation; configuration and entitlement records are never browser-writable.
- Inactivity is enforced by durable per-auth-session activity and restrictive row/storage policies; human activity updates are distinct from background reads.
- Reset preserves completed report snapshots separately from active analyses; saved reports remain owner-readable through the report routes.
- Offline support uses generated service workers and a single preview-safe registration wrapper; only public assets/offline fallback are cached, never authenticated financial responses.